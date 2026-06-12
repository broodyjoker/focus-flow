// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — root shell
//
// Stage 4: Miller Column navigation
//
// State:
//   activeBucketId  — which category is open in Col 1
//   activeParentId  — whose children Col 2 currently shows (null = bucket root)
//   selectedTaskId  — highlighted row in Col 2; Col 3 shows its children
//   slideDirection  — 'forward' | 'back'; controls CSS animation class
//
// Navigation flows:
//   selectBucket(id)         → reset depth, Col 2 shows bucket root
//   selectTask(id)           → highlight row in Col 2, Col 3 shows its children
//   shiftInto(taskId)        → drill forward: old selected → activeParent, clicked → selected
//   navigateBack()           → go up: old activeParent → selected, its parent → activeParent
//
// Data:
//   addTaskAtLevel(title, parentId) → insert at given level inheriting bucket/priority
//   toggleTask(id)                  → flip isCompleted
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TaskListColumn } from './components/TaskListColumn';
import { ChildColumn } from './components/ChildColumn';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { ZoneMode } from './components/ZoneMode';
import { SettingsModal } from './components/SettingsModal';
import { MOCK_TASKS } from './data/mockTasks';
import type { Task, LifeBucket, Preferences } from './models';
import { getBucketById, LIFE_BUCKETS, DEFAULT_PREFERENCES } from './models';
import { getTaskDepth, MAX_DEPTH, getRootAncestor, getAllDescendants } from './utils/depth';
import { getToday, startOfDay } from './utils/dates';
import { loadData, saveData } from './utils/db';
import { playSound } from './utils/audio';
import { sendNotification } from './utils/notifications';

// ── ID generator ──────────────────────────────────────────────────────────────
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // ── Database state ─────────────────────────────────────────────────────────
  const [isDbLoading, setIsDbLoading] = useState(true);

  // ── Navigation state ───────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [activeBucketId, setActiveBucketId] = useState<string>('career-moves');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');

  // ── Mobile layout state ────────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<'sidebar' | 'col2' | 'col3'>('sidebar');

  // ── Pomodoro & Zone Mode state ─────────────────────────────────────────────
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(DEFAULT_PREFERENCES.pomodoroWorkTime * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [isZoneModeActive, setIsZoneModeActive] = useState<boolean>(false);

  // ── Categories / Buckets state ─────────────────────────────────────────────
  const [buckets, setBuckets] = useState<LifeBucket[]>(LIFE_BUCKETS);

  const reorderBuckets = useCallback((startIndex: number, endIndex: number) => {
    setBuckets((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && pomodoroSeconds === 0) {
      // Timer finished
      setIsTimerRunning(false);
      const newMode = timerMode === 'work' ? 'shortBreak' : 'work';
      setTimerMode(newMode);
      setPomodoroSeconds(newMode === 'work' ? preferences.pomodoroWorkTime * 60 : preferences.pomodoroBreakTime * 60);
      
      const isWorkNext = newMode === 'work';
      const title = isWorkNext ? 'Break Over!' : 'Focus Session Complete!';
      const body = isWorkNext ? 'Time to get back to deep work.' : 'Time to take a short break.';
      
      playSound('chime', preferences.soundEffects);
      sendNotification(title, body, preferences.pushNotifications);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroSeconds, timerMode, preferences]);

  // Handle timer toggling from anywhere
  const toggleTimer = useCallback((taskId?: string) => {
    if (taskId) {
      if (activeFocusTaskId !== taskId) {
        // Switching to a new task resets the timer if it's currently running on another task
        // or just adopts the new task with the current timer.
        setActiveFocusTaskId(taskId);
        setTimerMode('work');
        setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
      }
    }
    setIsTimerRunning((prev) => !prev);
  }, [activeFocusTaskId, preferences.pomodoroWorkTime]);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerMode('work');
    setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
  }, [preferences.pomodoroWorkTime]);

  const selectFocusTask = useCallback((taskId: string) => {
    setActiveFocusTaskId(taskId);
    setIsTimerRunning(false);
    setTimerMode('work');
    setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
  }, [preferences.pomodoroWorkTime]);

  const toggleZoneMode = useCallback(() => {
    setIsZoneModeActive((prev) => {
      const next = !prev;
      if (next && !activeFocusTaskId) {
        // Auto-select the first inZone task if none is currently focused
        const zoneTasks = tasks.filter(t => t.inZone && !t.isCompleted);
        if (zoneTasks.length > 0) {
          setActiveFocusTaskId(zoneTasks[0].id);
        }
      }
      return next;
    });
  }, [activeFocusTaskId, tasks]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Persist dark mode preference across sessions
    return localStorage.getItem('theme') === 'dark';
  });
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Global Progress State ──────────────────────────────────────────────────
  const [globalProgress, setGlobalProgress] = useState(0);
  const [showGlobalProgress, setShowGlobalProgress] = useState(false);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Database Initialization ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const loadedTasks = await loadData<Task[]>('tasks');
        const loadedBuckets = await loadData<LifeBucket[]>('buckets');
        const loadedPreferences = await loadData<Preferences>('preferences');
        
        if (loadedTasks && loadedTasks.length > 0) {
          setTasks(loadedTasks);
        }
        if (loadedBuckets && loadedBuckets.length > 0) {
          setBuckets(loadedBuckets);
        }
        if (loadedPreferences) {
          setPreferences(loadedPreferences);
          setPomodoroSeconds(loadedPreferences.pomodoroWorkTime * 60);
        }
      } catch (err) {
        console.error('Failed to load from DB, falling back to mocks', err);
      } finally {
        setIsDbLoading(false);
      }
    }
    init();
  }, []);

  // ── Database Sync ──────────────────────────────────────────────────────────
  // Skip the first render using isDbLoading so we don't accidentally overwrite
  // the database with mock data before we've had a chance to load it.
  useEffect(() => {
    if (!isDbLoading) {
      saveData('tasks', tasks);
    }
  }, [tasks, isDbLoading]);

  useEffect(() => {
    if (!isDbLoading) {
      saveData('buckets', buckets);
    }
  }, [buckets, isDbLoading]);

  useEffect(() => {
    if (!isDbLoading) {
      saveData('preferences', preferences);
    }
  }, [preferences, isDbLoading]);

  // Sync dark class on <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleDark = useCallback(() => setIsDark((d) => !d), []);

  // ── Navigation handlers ────────────────────────────────────────────────────

  /** Clicking a bucket in the sidebar resets depth to root. */
  const selectBucket = useCallback((bucketId: string) => {
    setSlideDirection('back');
    setActiveBucketId(bucketId);
    setActiveParentId(null);
    setSelectedTaskId(null);
    setMobileView('col2');
  }, []);

  /** Clicking a task in column 2 either selects it (opening column 3) or unselects it. */
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId((prev) => {
      // On mobile view (which we approximate by assuming col2 to col3 transitions),
      // we always want to select it to ensure col3 isn't empty when we navigate.
      // But we can check window.innerWidth for a robust mobile check.
      const isMobile = window.innerWidth < 768;
      if (isMobile) return taskId;
      return prev === taskId ? null : taskId;
    });
    // On mobile, tapping a task navigates to Col 3
    if (window.innerWidth < 768) {
      setMobileView('col3');
    }
  }, []);

  /**
   * Clicking a row in Column 3 ("shift forward").
   * The clicked child becomes the new selected task;
   * the old selected task becomes the new activeParent.
   * Column 2 will now show what Column 3 was showing.
   */
  const shiftInto = useCallback(
    (taskId: string) => {
      // Guard: leaf nodes (Level MAX_DEPTH) cannot be drilled into.
      // ChildColumn enforces this in the UI; this is the data-layer safety net.
      if (getTaskDepth(taskId, tasks) >= MAX_DEPTH) return;

      setSlideDirection('forward');
      setActiveParentId(selectedTaskId);
      setSelectedTaskId(taskId);
    },
    [selectedTaskId, tasks],
  );

  /**
   * Back button in Column 2.
   * Go up one level:
   *   new selectedTaskId ← old activeParentId  (so it stays highlighted in parent list)
   *   new activeParentId ← grandparent
   */
  const navigateBack = useCallback(() => {
    if (!activeParentId) return;
    const activeParentTask = tasks.find((t) => t.id === activeParentId);
    setSlideDirection('back');
    setSelectedTaskId(activeParentId);                         // highlight where we came from
    setActiveParentId(activeParentTask?.parentId ?? null);     // go up one level
    setMobileView('col2'); // Ensure we stay in col2 on mobile
  }, [activeParentId, tasks]);

  /** Mobile: Back from Col 2 root to Categories */
  const mobileBackToCategories = useCallback(() => {
    setMobileView('sidebar');
  }, []);

  /** Mobile: Back from Col 3 to Col 2 */
  const mobileBackToCol2 = useCallback(() => {
    setMobileView('col2');
  }, []);

  // ── Data handlers ──────────────────────────────────────────────────────────

  /**
   * addTaskAtLevel — called by either column's BrainDump.
   * parentId === null  →  root task in active bucket
   * parentId !== null  →  sub-task; inherits category + priority from parent
   */
  const addTaskAtLevel = useCallback(
    (title: string, parentId: string | null) => {
      setTasks((prev) => {
        // Guard: never create a task whose depth would exceed MAX_DEPTH.
        // The BrainDump is hidden in the UI when at max depth, but this
        // ensures correctness even if called programmatically.
        if (parentId && getTaskDepth(parentId, prev) >= MAX_DEPTH) return prev;

        const parentTask = parentId ? prev.find((t) => t.id === parentId) : null;

        const newTask: Task = {
          id: generateId(),
          title: title.trim(),
          parentId: parentId ?? undefined,
          category: parentTask?.category ?? activeBucketId,
          priority: parentTask?.priority ?? 'none',
          isRoutine: false,
          isCompleted: false,
        };

        if (!parentId) {
          return [newTask, ...prev];
        }

        // Insert immediately after the parent's last existing child sibling
        const parentIndex = prev.findIndex((t) => t.id === parentId);
        let insertAt = parentIndex + 1;
        while (insertAt < prev.length && prev[insertAt].parentId === parentId) {
          insertAt++;
        }
        const updated = [...prev];
        updated.splice(insertAt, 0, newTask);
        return updated;
      });
    },
    [activeBucketId],
  );

  /** Flip isCompleted on any task. */
  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task,
      );

      // Check if task was completed, trigger global ephemeral progress and sound
      const toggledTask = updated.find((t) => t.id === id);
      if (toggledTask && toggledTask.isCompleted) {
        // Fire completion sound outside pure reducer
        setTimeout(() => playSound('tick', preferences.soundEffects), 0);

        const rootAncestor = getRootAncestor(id, updated);
        if (rootAncestor) {
          const descendants = getAllDescendants(rootAncestor.id, updated);
          if (descendants.length > 0) {
            const completedCount = descendants.filter((t) => t.isCompleted).length;
            const progress = Math.round((completedCount / descendants.length) * 100);

            // Defer side effects outside the pure reducer
            setTimeout(() => {
              setGlobalProgress(progress);
              setShowGlobalProgress(true);

              if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
              progressTimerRef.current = setTimeout(() => {
                setShowGlobalProgress(false);
              }, 4000);
            }, 0);
          }
        }
      }
      return updated;
    });
  }, [preferences.soundEffects]);

  /** Set or clear the dueDate on any task. */
  const setDueDate = useCallback((taskId: string, date: Date | undefined) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, dueDate: date } : task,
      ),
    );
  }, []);

  /** Toggle the isRoutine flag on a task. */
  const toggleRoutine = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, isRoutine: !task.isRoutine } : task,
      ),
    );
  }, []);

  /**
   * Universal update for the Task Detail Drawer and inline actions.
   * Accepts any Partial<Task> subset so a single handler covers all fields.
   * NOTE: Because our `tasks` state is a flat array, mapping over it naturally
   * updates the specific sub-task at ANY depth level (1 through 5) without needing 
   * recursive tree traversal. React immutability is maintained via `...prev` and `...task`.
   */
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    );
  }, []);

  /** Open the detail drawer for a given task. */
  const openDetail = useCallback((taskId: string) => {
    setOpenTaskId(taskId);
  }, []);

  /** Close the detail drawer. */
  const closeDetail = useCallback(() => {
    setOpenTaskId(null);
  }, []);

  /** Delete a task and all its nested sub-tasks recursively. */
  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const idsToDelete = new Set<string>([taskId]);
      let added = true;
      // Recursively find all children, grandchildren, etc.
      while (added) {
        added = false;
        for (const t of prev) {
          if (t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
            idsToDelete.add(t.id);
            added = true;
          }
        }
      }
      return prev.filter((t) => !idsToDelete.has(t.id));
    });
    // Close detail drawer if the deleted task is currently open
    setOpenTaskId((current) => (current === taskId ? null : current));
    // Reset selection if the deleted task was selected
    setSelectedTaskId((current) => (current === taskId ? null : current));
  }, []);

  // ── Auto-expire routines on mount ─────────────────────────────────────────────────────
  // If a routine task has a past dueDate: roll it forward to Today and
  // uncheck it. This runs once on load so routines never pile up as "overdue".
  useEffect(() => {
    const today = getToday();
    setTasks((prev) =>
      prev.map((task) => {
        if (
          task.isRoutine &&
          task.dueDate &&
          startOfDay(task.dueDate).getTime() < today.getTime()
        ) {
          return { ...task, dueDate: today, isCompleted: false };
        }
        return task;
      }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Derived: sidebar badge counts ──────────────────────────────────────────
  // Only top-level incomplete tasks count toward the bucket badges.
  const taskCountByBucket = tasks.reduce<Record<string, number>>((acc, task) => {
    if (!task.isCompleted && !task.parentId) {
      acc[task.category] = (acc[task.category] ?? 0) + 1;
    }
    return acc;
  }, {});

  // ── Animation ──────────────────────────────────────────────────────────────
  const slideClass = slideDirection === 'forward' ? 'col-slide-forward' : 'col-slide-back';
  const col2AnimKey = `${activeBucketId}-${activeParentId ?? 'root'}`;
  const col3AnimKey = `${selectedTaskId ?? 'none'}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  const activeParentTask = activeParentId ? tasks.find((t) => t.id === activeParentId) : null;
  const activeBucket = getBucketById(activeBucketId);
  const col2Title = activeParentTask?.title || activeBucket?.defaultLabel.replace(/.* /, '') || 'Categories';

  // The task whose details are currently open (null = drawer hidden)
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;

  if (isDbLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 font-sans antialiased text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 animate-pulse flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)]">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-widest uppercase text-slate-500 animate-pulse">
          Loading
        </p>
      </div>
    );
  }

  if (isZoneModeActive) {
    return (
      <ZoneMode
        activeFocusTaskId={activeFocusTaskId}
        tasks={tasks}
        pomodoroSeconds={pomodoroSeconds}
        isTimerRunning={isTimerRunning}
        timerMode={timerMode}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
        onExitZone={toggleZoneMode}
        onUpdateTask={updateTask}
        onSelectFocusTask={selectFocusTask}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans antialiased bg-white dark:bg-slate-900 relative">

      {/* ── Global Ephemeral Progress Bar ───────────────────────────────────── */}
      {showGlobalProgress && (
        <div className="fixed top-0 left-0 right-0 w-full h-1.5 z-[99999] overflow-hidden pointer-events-none">
          <div 
            className={[
              'h-full',
              'transition-[width] duration-1000 ease-in-out shadow-[0_2px_10px_rgba(16,185,129,0.3)]',
              globalProgress === 100 ? 'animate-progress-pulse' : ''
            ].join(' ')}
            style={{ 
              width: `${globalProgress}%`,
              backgroundImage: 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #10b981 65%, #10b981 100%)',
              backgroundSize: '100vw 100%',
              backgroundPosition: 'left center',
              backgroundRepeat: 'no-repeat'
            }} 
          />
        </div>
      )}

      {/* Column 1 — fixed sidebar (bucket navigation) */}
      <Sidebar
        buckets={buckets}
        isActiveMobileView={mobileView === 'sidebar'}
        activeBucketId={activeBucketId}
        taskCountByBucket={taskCountByBucket}
        onSelectBucket={selectBucket}
        isDark={isDark}
        toggleDark={toggleDark}
        onToggleZoneMode={toggleZoneMode}
        onReorderBuckets={reorderBuckets}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Column 2 — task list at active level */}
      <TaskListColumn
        isActiveMobileView={mobileView === 'col2'}
        activeBucketId={activeBucketId}
        tasks={tasks}
        activeParentId={activeParentId}
        selectedTaskId={selectedTaskId}
        animKey={col2AnimKey}
        slideClass={slideClass}
        onAdd={addTaskAtLevel}
        onToggle={toggleTask}
        onSelectTask={selectTask}
        onBack={navigateBack}
        onMobileBackToCategories={mobileBackToCategories}
        onOpenDetail={openDetail}
        onUpdateTask={updateTask}
        onToggleTimer={toggleTimer}
      />

      {/* Column 3 — children of the selected task */}
      <ChildColumn
        isActiveMobileView={mobileView === 'col3'}
        parentListName={col2Title}
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        animKey={col3AnimKey}
        slideClass={slideClass}
        onAdd={addTaskAtLevel}
        onToggle={toggleTask}
        onShiftInto={shiftInto}
        onOpenDetail={openDetail}
        onMobileBack={mobileBackToCol2}
        onUpdateTask={updateTask}
        onToggleTimer={toggleTimer}
      />

      {/* Task Detail Drawer — portaled over Col 3 */}
      <TaskDetailDrawer
        task={openTask}
        onClose={closeDetail}
        onUpdate={updateTask}
        onDelete={deleteTask}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        tasks={tasks}
        setTasks={setTasks}
        buckets={buckets}
        setBuckets={setBuckets}
        preferences={preferences}
        setPreferences={setPreferences}
      />
    </div>
  );
}

export default App;
