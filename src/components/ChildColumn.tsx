// ─────────────────────────────────────────────────────────────────────────────
// ChildColumn — Column 3 of the Miller Column layout
//
// Always renders the children of the currently selected task in Column 2.
// When no task is selected, shows a calm placeholder.
//
// The "shift" interaction:
//   Clicking any row in this column calls onShiftInto(task.id).
//   App.tsx handles the state update:
//     • activeParentId ← old selectedTaskId
//     • selectedTaskId ← clicked task.id
//   This makes Column 2 "slide forward" to show what was just in Column 3.
//
// BrainDump here adds a sub-step to the selected task (parentId = selectedTaskId).
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';
import { BrainDumpInput } from './BrainDumpInput';
import { TaskRow } from './TaskRow';
import { getTaskDepth, MAX_DEPTH } from '../utils/depth';
import { useSwipe } from '../utils/useSwipe';
import { sortTasksByPriority } from '../utils/priority';

interface ChildColumnProps {
  tasks: Task[];
  selectedTaskId: string | null;
  /** Changes on every navigation step — triggers CSS animation via React key. */
  animKey: string;
  /** CSS class that drives slide direction. */
  slideClass: string;
  onAdd: (title: string, parentId: string | null) => void;
  onToggle: (id: string) => void;
  /** Shift forward: the clicked child becomes the new "selected" context. */
  onShiftInto: (taskId: string) => void;
  onOpenDetail: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onToggleTimer?: (taskId: string) => void;
  isActiveMobileView?: boolean;
  parentListName?: string;
  onMobileBack?: () => void;
}

export function ChildColumn({
  tasks,
  selectedTaskId,
  animKey,
  slideClass,
  onAdd,
  onToggle,
  onShiftInto,
  onOpenDetail,
  onUpdateTask,
  onToggleTimer,
  isActiveMobileView = false,
  parentListName = 'Categories',
  onMobileBack,
}: ChildColumnProps) {
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  const children = sortTasksByPriority(
    selectedTaskId
      ? tasks.filter((t) => t.parentId === selectedTaskId)
      : []
  );

  // ── Depth ───────────────────────────────────────────────────────────────────
  // childrenDepth = the depth of the tasks SHOWN in Column 3.
  // selectedTaskId is the parent whose children are displayed, so children
  // live one level below it.
  const childrenDepth = selectedTaskId
    ? getTaskDepth(selectedTaskId, tasks) + 1
    : 1;
  const childrenAtMaxDepth = childrenDepth >= MAX_DEPTH;

  // At max depth: no chevrons (children can't be drilled into further)
  // and clicking a row toggles completion instead of shifting columns.
  const grandchildParentIds = childrenAtMaxDepth
    ? new Set<string>() // suppress all chevrons
    : new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string));

  // BrainDump is hidden only when the PARENT is at MAX_DEPTH, meaning any child
  // would be Level 6 — which is forbidden. When tasks shown are at Level 5 we
  // still want to allow adding peers at that same level (parentId is Level 4).
  const canAddChildren = childrenDepth <= MAX_DEPTH;

  const incompleteCount = children.filter((t) => !t.isCompleted).length;

  // ── Empty / placeholder state ──────────────────────────────────────────────
  if (!selectedTask) {
    return null;
  }

  const statusText =
    children.length === 0
      ? 'No steps yet — add one below'
      : incompleteCount === 0
      ? 'All steps done!'
      : `${incompleteCount} of ${children.length} remaining`;

  // LTR Swipe to go back
  const swipeHandlers = useSwipe(undefined, () => {
    if (onMobileBack) onMobileBack();
  });

  return (
    <div
      id="col-3"
      {...swipeHandlers}
      className={[
        'flex-col min-w-0 bg-slate-50/60 dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800',
        'w-full md:flex-1 relative',
        isActiveMobileView ? 'flex' : 'hidden md:flex'
      ].join(' ')}
    >
      {/* ── Animated body ───────────────────────────────────────────────────── */}
      <div
        key={animKey}
        className={`flex flex-col flex-1 min-h-0 overflow-hidden ${slideClass}`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          {/* Mobile Back Button */}
          <button
            onClick={onMobileBack}
            className="md:hidden flex items-center gap-1.5 mb-3 -ml-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 rounded"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to {parentListName}
          </button>
          
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
            Steps for
          </p>
          <div className="flex items-center gap-2">
            <h3
              className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate"
              title={selectedTask.title}
            >
              {selectedTask.title}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{statusText}</p>
        </div>

        {/* BrainDump — hidden only when parent is at MAX_DEPTH (children would be Level 6) */}
        {canAddChildren ? (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <BrainDumpInput
              compact
              placeholder="Add a step…"
              onAdd={(title) => onAdd(title, selectedTaskId)}
            />
          </div>
        ) : (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-300 dark:text-slate-600 text-xs" aria-hidden="true">🔒</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Max depth reached (Level {MAX_DEPTH})
              </span>
            </div>
          </div>
        )}

        {/* Children list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-300 dark:text-slate-600 text-xs font-medium leading-relaxed">
                Break this task into smaller, manageable steps.
              </p>
            </div>
          ) : (
            <div className="pt-1 space-y-0.5">
              {/* Incomplete steps */}
              {children
                .filter((task) => !task.isCompleted)
                .map((task) => {
                  const childTasks = tasks.filter((t) => t.parentId === task.id);
                  const childProgress = childTasks.length > 0 ? Math.round((childTasks.filter(t => t.isCompleted).length / childTasks.length) * 100) : undefined;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isSelected={false}
                      isDimmed={false}
                      hasChildren={grandchildParentIds.has(task.id)}
                      childProgress={childProgress}
                      isAtMaxDepth={childrenAtMaxDepth}
                      onToggle={onToggle}
                      onClick={childrenAtMaxDepth ? onToggle : onShiftInto}
                      onOpenDetail={onOpenDetail}
                      onUpdateTask={onUpdateTask}
                      onToggleTimer={onToggleTimer}
                      onSwipeDeeper={childrenAtMaxDepth ? undefined : onShiftInto}
                    />
                  );
                })}

              {/* Completed steps */}
              {children.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-2 py-2.5 px-1">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 select-none">
                      Done
                    </span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>
                  {children
                    .filter((task) => task.isCompleted)
                    .map((task) => {
                      const childTasks = tasks.filter((t) => t.parentId === task.id);
                      const childProgress = childTasks.length > 0 ? Math.round((childTasks.filter(t => t.isCompleted).length / childTasks.length) * 100) : undefined;
                      return (
                        <TaskRow
                          key={task.id}
                          task={task}
                          isSelected={false}
                          isDimmed={false}
                          hasChildren={grandchildParentIds.has(task.id)}
                          childProgress={childProgress}
                          isAtMaxDepth={childrenAtMaxDepth}
                          onToggle={onToggle}
                          onClick={childrenAtMaxDepth ? onToggle : onShiftInto}
                          onOpenDetail={onOpenDetail}
                          onUpdateTask={onUpdateTask}
                          onToggleTimer={onToggleTimer}
                          onSwipeDeeper={childrenAtMaxDepth ? undefined : onShiftInto}
                        />
                      );
                    })}                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
