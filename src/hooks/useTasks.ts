// =============================================================================
// useTasks.ts
//
// Manages the master flat task array and all task mutation logic.
//
// WHY A FLAT ARRAY?
//   Tasks at every depth level (root, child, grandchild…) are stored in one
//   flat array. Each task has an optional `parentId` that links it to its
//   parent. This makes querying simple (Array.filter / Array.find) and avoids
//   complex recursive tree updates. The tradeoff is that operations like
//   "delete all descendants" require a small loop — see `deleteTask`.
//
// WHY A SEPARATE HOOK?
//   Tasks are the most frequently updated state in the app. Splitting them
//   out means toggling a task or editing its title ONLY re-renders components
//   that consume `useTasks`, leaving preferences and buckets untouched.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Preferences } from '../models';
import { MOCK_TASKS } from '../data/mockTasks';
import { saveData } from '../utils/db';
import { sanitize } from '../utils/sanitize';
import { getTaskDepth, MAX_DEPTH, getRootAncestor, getAllDescendants } from '../utils/depth';
import { getToday, startOfDay } from '../utils/dates';
import { playSound } from '../utils/audio';

// =============================================================================
// ID GENERATOR
// Uses the native crypto.randomUUID when available (all modern browsers),
// falls back to a random string on older environments.
// =============================================================================
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// =============================================================================
// RETURN TYPE
// =============================================================================

export interface UseTasksReturn {
  // The master flat task array. Treat as read-only outside this hook.
  tasks: Task[];

  // Replace the entire tasks array at once.
  // Used by the parent's DB init to hydrate from IndexedDB.
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;

  // --- Task Mutators (all wrapped in useCallback for referential stability) ---

  /**
   * Add a new task at the given level.
   * - parentId === null  →  root task in the active bucket
   * - parentId !== null  →  child task inserted after its last sibling
   */
  addTaskAtLevel: (title: string, parentId: string | null, activeBucketId: string) => void;

  /** Flip the `isCompleted` flag on a task. Plays a sound on completion. */
  toggleTask: (id: string) => void;

  /**
   * Universal field updater used by TaskDetailDrawer and inline row actions.
   * Accepts any `Partial<Task>` so a single function covers all editable fields.
   * Sanitizes `title` and `notes` before saving.
   */
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  /**
   * Delete a task AND all its descendants (children, grandchildren, etc.)
   * Also clears the open drawer and selection if either points to the deleted task.
   */
  deleteTask: (
    taskId: string,
    setOpenTaskId: React.Dispatch<React.SetStateAction<string | null>>,
    setSelectedTaskId: React.Dispatch<React.SetStateAction<string | null>>,
  ) => void;

  /**
   * Duplicate a task and its entire subtree.
   * Each clone gets a new ID. The copies are inserted immediately after the
   * original block (original + all its descendants).
   */
  duplicateTask: (taskId: string) => void;

  /**
   * Move a task from one position to another within the flat array.
   * Used by the desktop drag-and-drop in TaskListColumn.
   */
  reorderTasks: (draggedId: string, dropTargetId: string) => void;

  /**
   * Swap two tasks by ID.
   * Used by the mobile up/down arrow buttons.
   */
  swapTasks: (id1: string, id2: string) => void;

  // --- Progress Toast state (shown after a task is completed) ---
  globalProgress: number;
  showGlobalProgress: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useTasks
 *
 * @param isDbLoaded   True once the parent's DB init has finished.
 * @param preferences  Needed for sound effect and pomodoro settings.
 * @param loadedTasks  The tasks loaded from IndexedDB by the parent init sequence.
 */
export function useTasks(
  isDbLoaded: boolean,
  preferences: Preferences,
  loadedTasks?: Task[],
): UseTasksReturn {

  // ---------------------------------------------------------------------------
  // STATE
  // Start with MOCK_TASKS so the UI renders on first paint even before DB loads.
  // The parent's DB init will call setTasks with the real saved tasks.
  // ---------------------------------------------------------------------------
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  // Progress toast — shown briefly after a task subtree makes progress
  const [globalProgress, setGlobalProgress] = useState(0);
  const [showGlobalProgress, setShowGlobalProgress] = useState(false);
  // Ref for the auto-hide timer so we can cancel it if another task completes
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // HYDRATE from parent's DB init result
  // When the parent finishes loading IndexedDB, it passes the loaded tasks in.
  // We apply them here exactly once (when isDbLoaded flips to true).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDbLoaded && loadedTasks && loadedTasks.length > 0) {
      setTasks(loadedTasks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDbLoaded]); // Intentionally only runs once when DB finishes loading

  // ---------------------------------------------------------------------------
  // SYNC: Write task changes back to IndexedDB whenever they change.
  // The isDbLoaded guard is critical — the very first render fires the sync
  // effects with the MOCK_TASKS initial state. Without the guard, we'd
  // overwrite IndexedDB with mock data before real data has loaded.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDbLoaded) {
      saveData('tasks', tasks);
    }
  }, [tasks, isDbLoaded]);

  // ---------------------------------------------------------------------------
  // AUTO-EXPIRE ROUTINES ON MOUNT
  // If a routine task has a dueDate in the past, roll it forward to Today
  // and uncheck it so it never piles up as "overdue". Runs once after mount
  // inside a setTimeout(0) to keep the initial render fast.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const today = getToday();
    setTimeout(() => {
      setTasks(prev =>
        prev.map(task => {
          if (
            task.isRoutine &&
            task.dueDate &&
            startOfDay(task.dueDate).getTime() < today.getTime()
          ) {
            // Reset routine: keep everything, just update date and completion.
            return { ...task, dueDate: today, isCompleted: false };
          }
          return task;
        })
      );
    }, 0);
  }, []); // Run exactly once on mount

  // ---------------------------------------------------------------------------
  // ACTIONS
  // All mutators are wrapped in useCallback so their references are stable
  // across re-renders. This prevents child components that receive them as
  // props from re-rendering unnecessarily.
  // ---------------------------------------------------------------------------

  /**
   * addTaskAtLevel
   * Creates a new task and inserts it into the flat array at the correct position.
   * - Root tasks (parentId = null) are prepended to the top of the list.
   * - Child tasks are inserted immediately after the parent's last existing child.
   */
  const addTaskAtLevel = useCallback(
    (title: string, parentId: string | null, activeBucketId: string) => {
      setTasks(prev => {
        // Safety guard: never exceed the max nesting depth.
        if (parentId && getTaskDepth(parentId, prev) >= MAX_DEPTH) return prev;

        const parentTask = parentId ? prev.find(t => t.id === parentId) : null;

        const newTask: Task = {
          id: generateId(),
          title: sanitize(title.trim()),
          parentId: parentId ?? undefined,
          // Child tasks inherit their parent's category; root tasks use the active bucket.
          category: parentTask?.category ?? activeBucketId,
          // Child tasks inherit their parent's priority.
          priority: parentTask?.priority ?? 'none',
          isRoutine: false,
          isCompleted: false,
        };

        if (!parentId) {
          // Prepend root tasks — they appear at the top of the list.
          return [newTask, ...prev];
        }

        // For child tasks: find the position right after the parent's last child.
        const parentIndex = prev.findIndex(t => t.id === parentId);
        let insertAt = parentIndex + 1;
        while (insertAt < prev.length && prev[insertAt].parentId === parentId) {
          insertAt++;
        }
        const updated = [...prev];
        updated.splice(insertAt, 0, newTask);
        return updated;
      });
    },
    [], // No external dependencies — activeBucketId is passed as a parameter
  );

  /**
   * toggleTask
   * Flips isCompleted on the target task and shows the ephemeral progress toast
   * if the task belongs to a subtree that has measurable progress.
   */
  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task,
      );

      const toggled = updated.find(t => t.id === id);
      if (toggled?.isCompleted) {
        // Fire side effects outside the pure state reducer via setTimeout(0).
        // This ensures the state update is committed before we read derived values.
        setTimeout(() => {
          playSound('tick', preferences.soundEffects);

          // Calculate progress for the root ancestor's subtree
          const rootAncestor = getRootAncestor(id, updated);
          if (rootAncestor) {
            const descendants = getAllDescendants(rootAncestor.id, updated);
            if (descendants.length > 0) {
              const completedCount = descendants.filter(t => t.isCompleted).length;
              const progress = Math.round((completedCount / descendants.length) * 100);

              setGlobalProgress(progress);
              setShowGlobalProgress(true);

              // Auto-hide the toast after 4 seconds. Cancel any previous timer first.
              if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
              progressTimerRef.current = setTimeout(() => {
                setShowGlobalProgress(false);
              }, 4000);
            }
          }
        }, 0);
      }

      return updated;
    });
  }, [preferences.soundEffects]);

  /**
   * updateTask
   * Merges a partial update into a task. Sanitizes title and notes to prevent XSS.
   * This single function covers all editable fields (due date, priority, notes,
   * attachments, etc.) so components don't need separate handlers per field.
   */
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const safe: Partial<Task> = { ...updates };
    // Sanitize user-supplied text at this single trust boundary.
    if (typeof safe.title === 'string') safe.title = sanitize(safe.title);
    if (typeof safe.notes === 'string') safe.notes = sanitize(safe.notes);
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, ...safe } : task)),
    );
  }, []);

  /**
   * deleteTask
   * Deletes the target task AND recursively deletes all descendants.
   * Also clears the detail drawer and column selection if they point to the
   * deleted task, to prevent showing a stale / "ghost" detail panel.
   */
  const deleteTask = useCallback((
    taskId: string,
    setOpenTaskId: React.Dispatch<React.SetStateAction<string | null>>,
    setSelectedTaskId: React.Dispatch<React.SetStateAction<string | null>>,
  ) => {
    setTasks(prev => {
      // Build the complete set of IDs to remove using an iterative BFS.
      // We can't use recursion here because we're inside a state updater.
      const idsToDelete = new Set<string>([taskId]);
      let added = true;
      while (added) {
        added = false;
        for (const t of prev) {
          if (t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
            idsToDelete.add(t.id);
            added = true;
          }
        }
      }
      return prev.filter(t => !idsToDelete.has(t.id));
    });

    // Clear UI state if it references the now-deleted task.
    setOpenTaskId(current => (current === taskId ? null : current));
    setSelectedTaskId(current => (current === taskId ? null : current));
  }, []);

  /**
   * duplicateTask
   * Clones the task and its entire subtree, assigning fresh IDs to every
   * node. The cloned block is inserted immediately after the original block.
   * The top-level clone gets " (Copy)" appended to its title.
   */
  const duplicateTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const original = prev.find(t => t.id === taskId);
      if (!original) return prev;

      // Step 1: Collect all descendants in BFS order.
      const idsToCone: string[] = [taskId];
      let i = 0;
      while (i < idsToCone.length) {
        const currentId = idsToCone[i];
        for (const t of prev) {
          if (t.parentId === currentId) idsToCone.push(t.id);
        }
        i++;
      }

      // Step 2: Generate a new ID for every task in the clone set.
      const idMap = new Map<string, string>();
      for (const id of idsToCone) {
        idMap.set(id, generateId());
      }

      // Step 3: Build clones, remapping parentId references using idMap.
      const clones = idsToCone.map(id => {
        const src = prev.find(t => t.id === id)!;
        return {
          ...src,
          id: idMap.get(id)!,
          parentId: src.parentId ? (idMap.get(src.parentId) ?? src.parentId) : undefined,
          // Only the root of the clone gets the "(Copy)" suffix.
          title: id === taskId ? `${src.title} (Copy)` : src.title,
          isCompleted: false,
        };
      });

      // Step 4: Find where the original block ends and insert after it.
      const lastOriginalIdx = prev.reduce(
        (max, t, idx) => (idsToCone.includes(t.id) ? idx : max),
        prev.findIndex(t => t.id === taskId),
      );

      const updated = [...prev];
      updated.splice(lastOriginalIdx + 1, 0, ...clones);
      return updated;
    });
  }, []);

  /**
   * reorderTasks
   * Moves a dragged task to a new position relative to a drop target.
   * Preserves the relative order of all other tasks.
   */
  const reorderTasks = useCallback((draggedId: string, dropTargetId: string) => {
    setTasks(prev => {
      const result = [...prev];
      const draggedIndex = result.findIndex(t => t.id === draggedId);
      if (draggedIndex === -1) return prev;

      const [removed] = result.splice(draggedIndex, 1);
      const targetIndex = result.findIndex(t => t.id === dropTargetId);
      if (targetIndex === -1) return prev;

      const originalTargetIndex = prev.findIndex(t => t.id === dropTargetId);
      if (draggedIndex < originalTargetIndex) {
        // Dragged downward: insert after the target
        result.splice(targetIndex + 1, 0, removed);
      } else {
        // Dragged upward: insert before the target
        result.splice(targetIndex, 0, removed);
      }
      return result;
    });
  }, []);

  /**
   * swapTasks
   * Swaps two tasks by ID. Used on mobile with up/down arrow buttons.
   */
  const swapTasks = useCallback((id1: string, id2: string) => {
    setTasks(prev => {
      const idx1 = prev.findIndex(t => t.id === id1);
      const idx2 = prev.findIndex(t => t.id === id2);
      if (idx1 === -1 || idx2 === -1) return prev;
      const result = [...prev];
      [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
      return result;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    tasks,
    setTasks,
    addTaskAtLevel,
    toggleTask,
    updateTask,
    deleteTask,
    duplicateTask,
    reorderTasks,
    swapTasks,
    globalProgress,
    showGlobalProgress,
  };
}
