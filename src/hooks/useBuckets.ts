// =============================================================================
// useBuckets.ts
//
// Manages the list of "Life Buckets" (user-defined categories like Career,
// Health, etc.) and their reordering/swapping logic.
//
// WHY A SEPARATE HOOK?
//   Buckets change rarely (only in Settings). Separating them means the
//   Sidebar — which reads bucket data — doesn't re-render when tasks change,
//   and the task list doesn't re-render when a bucket is renamed.
//
//   The `taskCountByBucket` derived value IS kept here (not in useTasks) because
//   it's only consumed by the Sidebar for badge rendering. Keeping derived
//   data close to the source of truth it reads from makes tracing easier.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, LifeBucket } from '../models';
import { LIFE_BUCKETS } from '../models';
import { saveData } from '../utils/db';

// =============================================================================
// RETURN TYPE
// =============================================================================

export interface UseBucketsReturn {
  // The full ordered list of buckets. Treat as read-only outside this hook.
  buckets: LifeBucket[];

  // Replace the entire buckets array at once.
  // Used by SettingsModal when the user bulk-edits categories.
  setBuckets: React.Dispatch<React.SetStateAction<LifeBucket[]>>;

  /**
   * Move a bucket from one index position to another.
   * Used by the desktop drag-and-drop in the Sidebar.
   */
  reorderBuckets: (startIndex: number, endIndex: number) => void;

  /**
   * Swap two buckets by ID.
   * Used by the mobile up/down arrow controls in Settings.
   */
  swapBuckets: (id1: string, id2: string) => void;

  /**
   * A derived map of { [bucketId]: incompleteRootTaskCount }.
   * Memoized — only recomputes when the tasks array changes.
   * Passed to the Sidebar to render the badge counts.
   */
  taskCountByBucket: Record<string, number>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useBuckets
 *
 * @param isDbLoaded  True once the parent's DB init has finished. Prevents
 *                    persisting the default bucket list before real data loads.
 * @param tasks       The master task array from useTasks, used to compute badge counts.
 * @param loadedBuckets  The buckets array loaded from IndexedDB by the parent
 *                       init sequence. Passed in so we don't double-load from DB.
 */
export function useBuckets(
  isDbLoaded: boolean,
  tasks: Task[],
  loadedBuckets?: LifeBucket[],
): UseBucketsReturn {

  // ---------------------------------------------------------------------------
  // STATE
  // Start with the built-in LIFE_BUCKETS as defaults. The parent's DB init
  // will call setBuckets with the real saved data after loading.
  // ---------------------------------------------------------------------------

  const [buckets, setBuckets] = useState<LifeBucket[]>(LIFE_BUCKETS);

  // ---------------------------------------------------------------------------
  // HYDRATE from parent's DB init result
  // When the parent finishes loading IndexedDB, it passes the loadedBuckets in.
  // We apply them here exactly once (when isDbLoaded flips to true).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDbLoaded && loadedBuckets && loadedBuckets.length > 0) {
      setBuckets(loadedBuckets);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDbLoaded]); // Intentionally only runs once when DB finishes loading

  // ---------------------------------------------------------------------------
  // SYNC: Write bucket changes back to IndexedDB whenever they change.
  // The isDbLoaded guard prevents overwriting real data before it's loaded.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDbLoaded) {
      saveData('buckets', buckets);
    }
  }, [buckets, isDbLoaded]);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Reorder buckets by moving one from `startIndex` to `endIndex`.
   * This is a pure array splice — it does not change the bucket data itself.
   */
  const reorderBuckets = useCallback((startIndex: number, endIndex: number) => {
    setBuckets(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  /**
   * Swap two buckets by their string IDs.
   * Used on mobile where the user taps up/down arrows instead of dragging.
   */
  const swapBuckets = useCallback((id1: string, id2: string) => {
    setBuckets(prev => {
      const idx1 = prev.findIndex(b => b.id === id1);
      const idx2 = prev.findIndex(b => b.id === id2);
      // Guard: if either ID is not found, return the list unchanged.
      if (idx1 === -1 || idx2 === -1) return prev;
      const result = [...prev];
      [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
      return result;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED: sidebar badge counts
  // Only root-level (no parentId) incomplete tasks count toward the badge.
  // Memoized so the Sidebar doesn't re-render on every keystroke in the app.
  // ---------------------------------------------------------------------------
  const taskCountByBucket = useMemo(() =>
    tasks.reduce<Record<string, number>>((acc, task) => {
      if (!task.isCompleted && !task.parentId) {
        acc[task.category] = (acc[task.category] ?? 0) + 1;
      }
      return acc;
    }, {}),
  [tasks]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    buckets,
    setBuckets,
    reorderBuckets,
    swapBuckets,
    taskCountByBucket,
  };
}
