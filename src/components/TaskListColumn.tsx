// ─────────────────────────────────────────────────────────────────────────────
// TaskListColumn — Column 2 of the Miller Column layout
//
// Displays tasks at the current "active level":
//   • activeParentId === null  →  root tasks of the selected bucket
//   • activeParentId !== null  →  children of that parent task
//
// Navigation:
//   • Back button appears when activeParentId is set
//   • Clicking a row calls onSelectTask → its children appear in Column 3
//   • Siblings of the selected row are dimmed for ADHD-friendly focus
//
// BrainDump:
//   • Adds a task at the current level (parentId = activeParentId)
//   • Stays mounted and stable; only the task list animates on navigation
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';
import { getBucketById } from '../models';
import { BrainDumpInput } from './BrainDumpInput';
import { TaskRow } from './TaskRow';
import { t } from '../i18n';
import { getTaskDepth, MAX_DEPTH } from '../utils/depth';
import { useSwipe } from '../utils/useSwipe';
import { sortTasksByPriority } from '../utils/priority';

interface TaskListColumnProps {
  activeBucketId: string;
  tasks: Task[];
  activeParentId: string | null;
  selectedTaskId: string | null;
  /** Changes on every navigation step — triggers CSS animation via React key. */
  animKey: string;
  /** CSS class that drives slide direction. */
  slideClass: string;
  onAdd: (title: string, parentId: string | null) => void;
  onToggle: (id: string) => void;
  onSelectTask: (id: string) => void;
  onBack: () => void;
  onOpenDetail: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onToggleTimer?: (taskId: string) => void;
  isActiveMobileView?: boolean;
  onMobileBackToCategories?: () => void;
}

export function TaskListColumn({
  activeBucketId,
  tasks,
  activeParentId,
  selectedTaskId,
  animKey,
  slideClass,
  onAdd,
  onToggle,
  onSelectTask,
  onBack,
  onOpenDetail,
  onUpdateTask,
  onToggleTimer,
  isActiveMobileView = false,
  onMobileBackToCategories,
}: TaskListColumnProps) {
  const bucket = getBucketById(activeBucketId);

  // ── Depth ────────────────────────────────────────────────────────────────────
  // col2Depth = the depth level of the tasks currently visible in Column 2.
  //   activeParentId === null  → tasks are Level 1 (bucket root)
  //   activeParentId set       → tasks are one level below the parent
  const col2Depth = activeParentId
    ? getTaskDepth(activeParentId, tasks) + 1
    : 1;
  const col2AtMaxDepth = col2Depth >= MAX_DEPTH;

  // BrainDump is hidden only when it would create a Level 6 task (col2Depth > MAX_DEPTH).
  // When col2Depth === MAX_DEPTH, tasks shown ARE at Level 5 but the user can still
  // add peers at Level 5 — the parentId is Level 4, so the new task is Level 5. Allowed.
  const canAddToCol2 = col2Depth <= MAX_DEPTH;

  // Tasks visible in this column
  const visibleTasks = sortTasksByPriority(
    activeParentId
      ? tasks.filter((t) => t.parentId === activeParentId)
      : tasks.filter((t) => t.category === activeBucketId && !t.parentId)
  );

  // Lookup which tasks have children — for chevron indicator.
  // Chevrons are suppressed entirely when col2 tasks are already at MAX_DEPTH
  // (they are leaf nodes and cannot be selected to show Col 3 children).
  const tasksWithChildren = col2AtMaxDepth
    ? new Set<string>() // no chevrons at max depth
    : new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string));

  // Parent task metadata (when drilling down)
  const parentTask = activeParentId ? tasks.find((t) => t.id === activeParentId) : null;

  const heading = parentTask ? parentTask.title : (bucket?.defaultLabel ?? 'Tasks');
  const subheadingEmoji = parentTask ? '📝' : (bucket?.emoji ?? '');
  const hasSelection = selectedTaskId !== null;
  const incompleteCount = visibleTasks.filter((t) => !t.isCompleted).length;
  const progress = visibleTasks.length === 0 ? 0 : Math.round(((visibleTasks.length - incompleteCount) / visibleTasks.length) * 100);

  const statusText =
    visibleTasks.length === 0
      ? t('bucket.empty')
      : incompleteCount === 0
      ? 'All done!'
      : `${incompleteCount} remaining`;

  // LTR Swipe to go back
  const swipeHandlers = useSwipe(undefined, () => {
    if (activeParentId) onBack();
    else if (onMobileBackToCategories) onMobileBackToCategories();
  });

  return (
    <div
      id="col-2"
      {...swipeHandlers}
      className={[
        'flex-col min-w-0 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800',
        'w-full flex-shrink-0 transition-all duration-300 ease-in-out',
        hasSelection ? 'md:w-[450px] md:flex-none border-r' : 'md:flex-1 md:w-auto border-r md:border-r-0',
        isActiveMobileView ? 'flex' : 'hidden md:flex'
      ].join(' ')}
    >
      {/* ── Animated column body ───────────────────────────────────────────────
           Key changes on every navigation → React remounts → animation replays.
           Header + BrainDump + list all slide together for visual coherence.
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        key={animKey}
        className={`flex flex-col flex-1 min-h-0 overflow-hidden ${slideClass}`}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
          {/* Back button */}
          {activeParentId ? (
            <button
              id="col2-back-btn"
              onClick={onBack}
              aria-label="Go back to previous level"
              className={[
                'flex items-center gap-1.5 mb-3 -ml-0.5',
                'text-xs font-semibold text-slate-400 dark:text-slate-500',
                'hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded',
              ].join(' ')}
            >
              {/* Left arrow */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 3L5 7l4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
          ) : (
            <button
              id="col2-mobile-back-btn"
              onClick={onMobileBackToCategories}
              aria-label="Go back to Categories"
              className="md:hidden flex items-center gap-1.5 mb-3 -ml-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 rounded"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Categories
            </button>
          )}

          {/* Breadcrumb / heading */}
          <h2
            className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate"
            title={heading}
          >
            {heading}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{statusText}</p>
        </div>

        {/* BrainDump — hidden only when col2 would create tasks beyond MAX_DEPTH */}
        {canAddToCol2 ? (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <BrainDumpInput
              compact
              placeholder={activeParentId ? 'Add a step…' : 'Add a task…'}
              onAdd={(title) => onAdd(title, activeParentId)}
            />
          </div>
        ) : (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-300 dark:text-slate-600 text-xs" aria-hidden="true">🔒</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Max depth reached (Level {MAX_DEPTH})
              </span>
            </div>
          </div>
        )}

        {/* Task list — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl mb-3">
                {subheadingEmoji || '📋'}
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('bucket.empty')}</p>
              <p className="text-slate-300 dark:text-slate-600 text-[11px] mt-1">Type above and hit Enter.</p>
            </div>
          ) : (
            <div className="pt-1 space-y-0.5">
              {/* ── Incomplete tasks ─────────────────────────────────────── */}
              {visibleTasks
                .filter((task) => !task.isCompleted)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    isDimmed={hasSelection && selectedTaskId !== task.id && !task.isCompleted}
                    hasChildren={tasksWithChildren.has(task.id)}
                    isAtMaxDepth={col2AtMaxDepth}
                    onToggle={onToggle}
                    onClick={col2AtMaxDepth ? onToggle : onSelectTask}
                    onOpenDetail={onOpenDetail}
                    onUpdateTask={onUpdateTask}
                    onToggleTimer={onToggleTimer}
                    onSwipeDeeper={col2AtMaxDepth ? undefined : onSelectTask}
                  />
                ))}

              {/* ── Completed divider ────────────────────────────────────── */}
              {visibleTasks.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-2 py-2.5 px-1">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:bg-slate-600 select-none">
                      Done
                    </span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>
                  {visibleTasks
                    .filter((task) => task.isCompleted)
                    .map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskId === task.id}
                        isDimmed={hasSelection && selectedTaskId !== task.id}
                        hasChildren={tasksWithChildren.has(task.id)}
                        isAtMaxDepth={col2AtMaxDepth}
                        onToggle={onToggle}
                        onClick={col2AtMaxDepth ? onToggle : onSelectTask}
                        onOpenDetail={onOpenDetail}
                        onUpdateTask={onUpdateTask}
                        onToggleTimer={onToggleTimer}
                        onSwipeDeeper={col2AtMaxDepth ? undefined : onSelectTask}
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
