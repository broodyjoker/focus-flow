// =============================================================================
// App.tsx — Root Shell / Layout Orchestrator
//
// ROLE OF THIS FILE:
//   App.tsx is now a pure layout and routing coordinator. It does NOT own
//   business logic or raw CRUD operations directly.
//
//   All state has been delegated to three focused custom hooks:
//     • usePreferences  →  dark mode, sound, pomodoro settings, startup view
//     • useBuckets      →  category list, ordering, badge counts
//     • useTasks        →  task array, all mutations, DB sync
//
//   App.tsx is responsible for:
//     1. Running the DB init sequence (loading from IndexedDB on mount).
//     2. Showing the loading spinner until the DB is ready.
//     3. Maintaining navigation/routing state (which column/view is active).
//     4. Wiring hook outputs to child component props.
//     5. Managing the Pomodoro / Zone Mode local state (timer logic).
//
// DEBUGGING TIP:
//   If a feature is broken, start here to find which hook or component owns it.
//   Then follow the prop or hook return value to the specific file.
// =============================================================================

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// === COMPONENT IMPORTS =======================================================

import { Sidebar }            from './components/Sidebar';
import { TaskListColumn }     from './components/TaskListColumn';
import { ChildColumn }        from './components/ChildColumn';
import { CalendarView }       from './components/CalendarView';
import { TaskDetailDrawer }   from './components/TaskDetailDrawer';
import { ZoneMode }           from './components/ZoneMode';
import { SettingsModal }      from './components/SettingsModal';
import { QuickCaptureModal }  from './components/QuickCaptureModal';
import { GlobalProgressBar }  from './components/GlobalProgressBar';

// === HOOK IMPORTS =============================================================

import { usePreferences } from './hooks/usePreferences';
import { useBuckets }     from './hooks/useBuckets';
import { useTasks }       from './hooks/useTasks';

// === DATA / MODEL IMPORTS =====================================================

import type { Task, LifeBucket, Preferences } from './models';
import { getBucketById, LIFE_BUCKETS, DEFAULT_PREFERENCES } from './models';
import { getTaskDepth, MAX_DEPTH } from './utils/depth';
import { loadData, loadTasks, loadBuckets } from './utils/db';
import { playSound } from './utils/audio';
import { sendNotification } from './utils/notifications';
import { useReminders } from './utils/useReminders';

// =============================================================================
// ID GENERATOR
// Prefer the native crypto.randomUUID (all modern browsers).
// Falls back to a random string for legacy environments.
// =============================================================================
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// =============================================================================
// APP COMPONENT
// =============================================================================

function App() {

  // ===========================================================================
  // === DB LOADING GATE =======================================================
  // ===========================================================================
  // `isDbLoaded` starts as false. The entire app renders a loading spinner
  // until this flips to true. This prevents the race condition where React
  // tries to render with a custom `activeBucketId` before the buckets array
  // has been hydrated from IndexedDB — which caused the "White Screen of Death"
  // on Android PWAs where the Service Worker serves pages instantly.

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Temporary storage for the raw data loaded from IndexedDB.
  // These are passed into the hooks after loading so the hooks can hydrate.
  const [loadedTasksFromDb,   setLoadedTasksFromDb]   = useState<Task[]>([]);
  const [loadedBucketsFromDb, setLoadedBucketsFromDb] = useState<LifeBucket[]>([]);
  const [loadedPrefsFromDb,   setLoadedPrefsFromDb]   = useState<Preferences | null>(null);

  // ===========================================================================
  // === CUSTOM HOOKS ===========================================================
  // ===========================================================================
  // Each hook receives `isDbLoaded` as a guard to prevent writing defaults
  // to the DB before the real data has been loaded. They also receive the
  // data loaded by the DB init sequence below.

  const {
    preferences,
    setPreferences,
    isDark,
    toggleDark,
  } = usePreferences(isDbLoaded);

  const {
    buckets,
    setBuckets,
    reorderBuckets,
    swapBuckets,
    taskCountByBucket,
  } = useBuckets(isDbLoaded, /* tasks injected below after useTasks */ [], loadedBucketsFromDb);

  // NOTE: useTasks needs `preferences` for sound effects.
  // useBuckets needs `tasks` for badge counts — we pass tasks after both are ready.
  const {
    tasks,
    setTasks,
    addTaskAtLevel: addTaskAtLevelBase,
    toggleTask,
    updateTask,
    deleteTask: deleteTaskBase,
    duplicateTask,
    reorderTasks,
    swapTasks,
    globalProgress,
    showGlobalProgress,
  } = useTasks(isDbLoaded, preferences, loadedTasksFromDb);

  // useBuckets needs the live tasks array for badge counts.
  // Since hooks can't be called conditionally, we use a separate memo here.
  // This keeps useBuckets's internal memoization correct.
  const taskCountByBucketLive = useMemo(() =>
    tasks.reduce<Record<string, number>>((acc, task) => {
      if (!task.isCompleted && !task.parentId) {
        acc[task.category] = (acc[task.category] ?? 0) + 1;
      }
      return acc;
    }, {}),
  [tasks]);

  // ===========================================================================
  // === DB INIT SEQUENCE =======================================================
  // ===========================================================================
  // Runs exactly once on mount. Loads all data from IndexedDB, applies
  // preferences (including the startup routing), then sets isDbLoaded = true
  // to release the loading gate.

  useEffect(() => {
    async function init() {
      try {
        // Load all three stores in parallel for speed.
        const [rawTasks, rawBuckets, rawPrefs] = await Promise.all([
          loadTasks(),
          loadBuckets(),
          loadData<Preferences>('preferences'),
        ]);

        // Hydrate the hooks via the temporary state vars.
        if (rawTasks.length > 0)   setLoadedTasksFromDb(rawTasks);
        if (rawBuckets.length > 0) setLoadedBucketsFromDb(rawBuckets);

        // Apply preferences — use saved prefs or fall back to defaults.
        const initialPrefs = rawPrefs || DEFAULT_PREFERENCES;
        setLoadedPrefsFromDb(initialPrefs);
        setPreferences(initialPrefs);
        setPomodoroSeconds(initialPrefs.pomodoroWorkTime * 60);

        // --- Apply startup routing ---
        // This runs AFTER the buckets and tasks are stored in state,
        // so the routing logic always has valid data to work with.
        try {
          const view = initialPrefs.defaultStartupView;

          if (view === 'zone') {
            setIsZoneModeActive(true);

          } else if (['all', 'today', 'tomorrow', 'important'].includes(view)) {
            setActiveSmartView(view as 'all' | 'today' | 'tomorrow' | 'important');
            if (window.innerWidth < 768) setMobileView('col2');

          } else if (view !== 'main') {
            // It's a custom bucket ID — verify it exists before navigating to it.
            const bucketExists =
              rawBuckets.find(b => b.id === view) ||
              LIFE_BUCKETS.find(b => b.id === view);

            if (bucketExists) {
              setActiveBucketId(view);
              setActiveSmartView(null);
              if (window.innerWidth < 768) setMobileView('col2');
            } else {
              // The saved bucket ID no longer exists — fall back safely.
              throw new Error(`Invalid startup view ID: ${view}`);
            }

          } else {
            // 'main' = show the category list (sidebar on mobile).
            setActiveSmartView(null);
            if (window.innerWidth < 768) setMobileView('sidebar');
          }

        } catch (routingErr) {
          // If routing fails for any reason, fall back to the main menu.
          // This prevents users from getting permanently stuck on a white screen.
          console.warn('[App] Startup routing failed, falling back to main:', routingErr);
          setActiveSmartView(null);
          setIsZoneModeActive(false);
          if (window.innerWidth < 768) setMobileView('sidebar');
        }

      } catch (dbErr) {
        // If the entire DB load fails, the app still renders with mock data.
        console.error('[App] DB init failed, using defaults:', dbErr);
      } finally {
        // Always release the loading gate — even on failure — so the user
        // isn't permanently stuck on the loading screen.
        setIsDbLoaded(true);
      }
    }

    init();
  // This effect has no dependencies and must only run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================================================
  // === NAVIGATION STATE =======================================================
  // ===========================================================================
  // These control which column/view/depth the user is currently looking at.
  // They live in App because they coordinate between multiple child components.

  const [activeBucketId,  setActiveBucketId]  = useState<string>('career-moves');
  const [activeSmartView, setActiveSmartView] = useState<'all' | 'today' | 'tomorrow' | 'important' | null>(null);
  const [activeMainView,  setActiveMainView]  = useState<'tasks' | 'calendar'>('tasks');
  const [activeParentId,  setActiveParentId]  = useState<string | null>(null);
  const [selectedTaskId,  setSelectedTaskId]  = useState<string | null>(null);
  const [slideDirection,  setSlideDirection]  = useState<'forward' | 'back'>('forward');

  // Mobile uses a single-column layout; this controls which "column" is visible.
  const [mobileView, setMobileView] = useState<'sidebar' | 'col2' | 'col3'>('sidebar');

  // ===========================================================================
  // === ZONE MODE & POMODORO STATE =============================================
  // ===========================================================================
  // These are tightly coupled to each other and don't need their own hook yet.
  // If the timer logic grows significantly, extract to a `usePomodoro` hook.

  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [pomodoroSeconds,   setPomodoroSeconds]   = useState<number>(DEFAULT_PREFERENCES.pomodoroWorkTime * 60);
  const [isTimerRunning,    setIsTimerRunning]    = useState<boolean>(false);
  const [timerMode,         setTimerMode]         = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [isZoneModeActive,  setIsZoneModeActive]  = useState<boolean>(false);

  // --- Pomodoro countdown tick ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds(prev => prev - 1);
      }, 1000);

    } else if (isTimerRunning && pomodoroSeconds === 0) {
      // Session complete: switch mode, play sound, send notification.
      const newMode     = timerMode === 'work' ? 'shortBreak' : 'work';
      const isWorkNext  = newMode === 'work';
      const title       = isWorkNext ? 'Break Over!'              : 'Focus Session Complete!';
      const body        = isWorkNext ? 'Time to get back to work.' : 'Time to take a short break.';

      playSound('chime', preferences.soundEffects);
      sendNotification(title, body, preferences.pushNotifications);

      // Defer state updates outside the render cycle.
      setTimeout(() => {
        setIsTimerRunning(false);
        setTimerMode(newMode);
        setPomodoroSeconds(
          newMode === 'work'
            ? preferences.pomodoroWorkTime * 60
            : preferences.pomodoroBreakTime * 60
        );
      }, 0);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroSeconds, timerMode, preferences]);

  /** Start/stop the timer, optionally switching focus to a new task. */
  const toggleTimer = useCallback((taskId?: string) => {
    if (taskId && activeFocusTaskId !== taskId) {
      // Switching task: reset timer for the new task.
      setActiveFocusTaskId(taskId);
      setTimerMode('work');
      setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
    }
    setIsTimerRunning(prev => !prev);
  }, [activeFocusTaskId, preferences.pomodoroWorkTime]);

  /** Reset the timer back to the work duration without changing focus task. */
  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerMode('work');
    setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
  }, [preferences.pomodoroWorkTime]);

  /** Change the focus task and reset the timer to work mode. */
  const selectFocusTask = useCallback((taskId: string) => {
    setActiveFocusTaskId(taskId);
    setIsTimerRunning(false);
    setTimerMode('work');
    setPomodoroSeconds(preferences.pomodoroWorkTime * 60);
  }, [preferences.pomodoroWorkTime]);

  /** Toggle Zone Mode on/off. Auto-selects the first inZone task if none is focused. */
  const toggleZoneMode = useCallback(() => {
    setIsZoneModeActive(prev => {
      const next = !prev;
      if (next && !activeFocusTaskId) {
        const zoneTasks = tasks.filter(t => t.inZone && !t.isCompleted);
        if (zoneTasks.length > 0) setActiveFocusTaskId(zoneTasks[0].id);
      }
      return next;
    });
  }, [activeFocusTaskId, tasks]);

  // ===========================================================================
  // === UI STATE ===============================================================
  // ===========================================================================

  const [openTaskId,          setOpenTaskId]          = useState<string | null>(null);
  const [isSettingsOpen,      setIsSettingsOpen]      = useState(false);
  const [isQuickCaptureOpen,  setIsQuickCaptureOpen]  = useState(false);

  // ===========================================================================
  // === EFFECTS ================================================================
  // ===========================================================================

  // --- Global keyboard shortcut: Ctrl/Cmd+K opens Quick Capture ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Smart Reminders: schedules browser notifications for due tasks ---
  useReminders(tasks, preferences, updateTask);

  // ===========================================================================
  // === NAVIGATION ACTIONS ====================================================
  // ===========================================================================

  /** Switch to a specific bucket (category). Resets depth to root. */
  const selectBucket = useCallback((bucketId: string) => {
    setActiveMainView('tasks');
    setActiveBucketId(bucketId);
    setActiveSmartView(null);
    setActiveParentId(null);
    setSelectedTaskId(null);
    setMobileView('col2');
    setSlideDirection('back');
  }, []);

  /** Switch to a Smart View (All, Today, Tomorrow, Important). */
  const selectSmartView = useCallback((view: 'all' | 'today' | 'tomorrow' | 'important') => {
    setActiveMainView('tasks');
    setActiveSmartView(view);
    setActiveParentId(null);
    setSelectedTaskId(null);
    setMobileView('col2');
    setSlideDirection('back');
  }, []);

  /**
   * Select a task in Column 2.
   * On desktop: toggles selection (click again to deselect).
   * On mobile: always selects and navigates to Col 3.
   */
  const selectTask = useCallback((taskId: string) => {
    const isMobile = window.innerWidth < 768;
    setSelectedTaskId(taskId);          // always select, never toggle
    if (isMobile) setMobileView('col3');
  }, []);

  /**
   * Drill forward from Column 3 into a child.
   * The old selected task becomes the new activeParent (Column 2 now shows
   * what Column 3 was showing). Guards against exceeding MAX_DEPTH.
   */
  const shiftInto = useCallback((taskId: string) => {
    if (getTaskDepth(taskId, tasks) >= MAX_DEPTH) return;
    setSlideDirection('forward');
    setActiveParentId(selectedTaskId);
    setSelectedTaskId(taskId);
  }, [selectedTaskId, tasks]);

  /**
   * Navigate one level up in the Miller Column hierarchy.
   * Restores the parent's parent as the new active context.
   */
  const navigateBack = useCallback(() => {
    if (!activeParentId) return;
    const activeParentTask = tasks.find(t => t.id === activeParentId);
    setSlideDirection('back');
    setSelectedTaskId(null);                                  // clean state — no dirty selection
    setActiveParentId(activeParentTask?.parentId ?? null);    // go up one level
    setMobileView('col2');
  }, [activeParentId, tasks]);

  /** Go back from Col 3 to Col 2 on mobile — clears selection so col2 shows. */
  const mobileBackToCol2 = useCallback(() => {
    setSelectedTaskId(null);
    setMobileView('col2');
  }, []);

  // ===========================================================================
  // === TASK ACTION ADAPTERS ==================================================
  // ===========================================================================
  // These thin wrappers adapt the hook's API to the shape the child
  // components expect, without touching the hook's internal logic.

  /**
   * addTaskAtLevel — adapts the hook's function (which takes activeBucketId as
   * an explicit param) to the child component API (which doesn't pass it).
   */
  const addTaskAtLevel = useCallback(
    (title: string, parentId: string | null) => {
      addTaskAtLevelBase(title, parentId, activeBucketId);
    },
    [addTaskAtLevelBase, activeBucketId],
  );

  /**
   * deleteTask — adapts the hook's function (which takes UI setters as params)
   * to the child component API (which only passes the taskId).
   */
  const deleteTask = useCallback((taskId: string) => {
    deleteTaskBase(taskId, setOpenTaskId, setSelectedTaskId);
  }, [deleteTaskBase]);

  /** Open the detail drawer for a given task. */
  const openDetail = useCallback((taskId: string) => setOpenTaskId(taskId), []);

  /** Close the detail drawer. */
  const closeDetail = useCallback(() => setOpenTaskId(null), []);

  // ===========================================================================
  // === DERIVED / COMPUTED VALUES =============================================
  // ===========================================================================

  // Animation class for the slide transition between columns.
  const slideClass = slideDirection === 'forward' ? 'col-slide-forward' : 'col-slide-back';

  // Animation keys force React to re-mount the column with a fresh animation
  // whenever the user navigates to a different bucket or depth level.
  const col2AnimKey = `${activeBucketId}-${activeParentId ?? 'root'}`;
  const col3AnimKey = `${selectedTaskId ?? 'none'}`;

  // The heading shown in Column 2's header.
  const activeParentTask = activeParentId ? tasks.find(t => t.id === activeParentId) : null;
  const activeBucket     = buckets.find(b => b.id === activeBucketId) || getBucketById(activeBucketId);
  const col2Title        = activeParentTask?.title || activeBucket?.defaultLabel?.replace(/.* /, '') || 'Categories';

  // The task currently open in the detail drawer (null = drawer is hidden).
  const openTask = openTaskId ? tasks.find(t => t.id === openTaskId) ?? null : null;

  // ===========================================================================
  // === RENDER — LOADING GATE =================================================
  // ===========================================================================
  // Block ALL rendering until IndexedDB has fully loaded. This is the single
  // most important guard against the "White Screen of Death" on PWA startup.

  if (!isDbLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 font-sans antialiased text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 animate-pulse flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)]">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-widest uppercase text-slate-500 animate-pulse">
          Loading workspace...
        </p>
      </div>
    );
  }

  // ===========================================================================
  // === RENDER — ZONE MODE ====================================================
  // ===========================================================================
  // Zone Mode takes over the full screen when active.

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

  // ===========================================================================
  // === RENDER — MAIN LAYOUT ==================================================
  // ===========================================================================

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans antialiased bg-white dark:bg-slate-900 relative">

      {/* ── Ephemeral task-completion progress bar (top of screen) ─────────── */}
      <GlobalProgressBar
        showGlobalProgress={showGlobalProgress}
        globalProgress={globalProgress}
      />

      {/* ── Sidebar: category list & navigation (mobile home / desktop left) ── */}
      <Sidebar
        isActiveMobileView={mobileView === 'sidebar'}
        onClose={() => setMobileView('col2')}
        buckets={buckets}
        activeBucketId={activeBucketId}
        activeSmartView={activeSmartView}
        taskCountByBucket={taskCountByBucketLive}
        onSelectBucket={selectBucket}
        onSelectSmartView={selectSmartView}
        isDark={isDark}
        toggleDark={toggleDark}
        onToggleZoneMode={toggleZoneMode}
        onReorderBuckets={reorderBuckets}
        onSwapBuckets={swapBuckets}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleCalendar={() => { setActiveMainView('calendar'); setActiveSmartView(null); }}
      />

      {/* ── Main Content: Calendar or Miller Columns ──────────────────────── */}
      {activeMainView === 'calendar' ? (

        <CalendarView
          tasks={tasks}
          preferences={preferences}
          onAddTask={(title, dueDate) => {
            // Calendar adds tasks directly to the flat array with a generated ID.
            const newTask: Task = {
              id: generateId(),
              title,
              category: activeBucketId || 'career-moves',
              priority: 'none',
              isRoutine: false,
              isCompleted: false,
              dueDate,
            };
            setTasks(prev => [...prev, newTask]);
          }}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onSelectTask={openDetail}
          onToggleTimer={toggleTimer}
          onClose={() => setActiveMainView('tasks')}
        />

      ) : (
        <>
          {/* Column 2 — task list at the current active level */}
          <TaskListColumn
            isActiveMobileView={!selectedTaskId}
            buckets={buckets}
            activeBucketId={activeBucketId}
            activeSmartView={activeSmartView}
            tasks={tasks}
            activeParentId={activeParentId}
            selectedTaskId={selectedTaskId}
            animKey={col2AnimKey}
            slideClass={slideClass}
            onAdd={addTaskAtLevel}
            onToggle={toggleTask}
            onSelectTask={selectTask}
            onBack={navigateBack}
            onOpenSidebar={() => setMobileView('sidebar')}
            onOpenDetail={openDetail}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onToggleTimer={toggleTimer}
            onReorderTasks={reorderTasks}
            onSwapTasks={swapTasks}
          />

          {/* Column 3 — children of the currently selected task */}
          <ChildColumn
            key={selectedTaskId ?? 'none'}
            isActiveMobileView={!!selectedTaskId}
            parentListName={col2Title}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            animKey={col3AnimKey}
            slideClass={slideClass}
            onAdd={addTaskAtLevel}
            onToggle={toggleTask}
            onShiftInto={shiftInto}
            onMobileBack={mobileBackToCol2}
            onOpenDetail={openDetail}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onToggleTimer={toggleTimer}
            onReorderTasks={reorderTasks}
            onSwapTasks={swapTasks}
          />
        </>
      )}

      {/* ── Task Detail Drawer (slides over Column 3) ────────────────────── */}
      {openTask && (
        <TaskDetailDrawer
          task={openTask}
          tasks={tasks}
          onClose={closeDetail}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onDuplicate={duplicateTask}
          onAdd={addTaskAtLevel}
          buckets={buckets}
          preferences={preferences}
        />
      )}

      {/* ── Settings Modal ───────────────────────────────────────────────── */}
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

      {/* ── Quick Capture Modal (Ctrl/Cmd+K) ────────────────────────────── */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onAdd={addTaskAtLevel}
        buckets={buckets}
        defaultBucketId={activeBucketId}
      />

      {/* ── Mobile Floating Action Button (FAB) ─────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsQuickCaptureOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_8px_32px_rgba(124,58,237,0.3)] hover:brightness-110 active:scale-95 transition-all duration-200 border border-violet-500/20"
        aria-label="Quick capture task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>

    </div>
  );
}

export default App;
