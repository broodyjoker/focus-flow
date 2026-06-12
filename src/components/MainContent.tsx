// ─────────────────────────────────────────────────────────────────────────────
// MainContent component
//
// Stage 3 upgrades:
//  • Filters to TOP-LEVEL tasks only (no parentId) for the main list
//  • Looks up sub-tasks for each parent from the full task list
//  • Passes onAddSubTask down to TaskItem
//  • "Remaining" count only counts top-level incomplete tasks — sub-tasks
//    are progress indicators, not independent items in the header count
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';
import { getBucketById } from '../models';
import { TaskItem } from './TaskItem';
import { BrainDumpInput } from './BrainDumpInput';
import { t } from '../i18n';

interface MainContentProps {
  activeBucketId?: string;
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onAddSubTask: (parentId: string, title: string) => void;
}

export function MainContent({
  activeBucketId,
  tasks,
  onAdd,
  onToggle,
  onAddSubTask,
}: MainContentProps) {
  const bucket = activeBucketId ? getBucketById(activeBucketId) : null;
  const heading = bucket ? bucket.defaultLabel : 'All Tasks';

  // ── Task grouping ──────────────────────────────────────────────────────────
  // Filter to tasks in the active bucket (or all tasks if none selected)
  const bucketTasks = activeBucketId
    ? tasks.filter((task) => task.category === activeBucketId)
    : tasks;

  // Split into top-level (no parentId) and sub-tasks (has parentId)
  const topLevel = bucketTasks.filter((task) => !task.parentId);
  const subTaskMap = bucketTasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.parentId) {
      acc[task.parentId] = [...(acc[task.parentId] ?? []), task];
    }
    return acc;
  }, {});

  const incompleteCount = topLevel.filter((t) => !t.isCompleted).length;
  const allDone = topLevel.length > 0 && incompleteCount === 0;

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderTaskItem = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      subTasks={subTaskMap[task.id] ?? []}
      onToggle={onToggle}
      onAddSubTask={onAddSubTask}
    />
  );

  return (
    <main
      id="main-content"
      aria-label="Task list"
      className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50"
    >
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 px-8 py-5">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {heading}
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {topLevel.length === 0
              ? t('bucket.empty')
              : allDone
                ? 'All done! 🎉'
                : `${incompleteCount} remaining`}
          </p>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-6">
        <div className="max-w-2xl space-y-5">

          {/* Brain Dump input */}
          <BrainDumpInput onAdd={onAdd} />

          {/* Section divider */}
          {topLevel.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-300 select-none">
                Tasks
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          )}

          {/* Task list */}
          {topLevel.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-3xl mb-4">
                {bucket ? bucket.emoji : '📋'}
              </div>
              <p className="text-slate-400 text-sm font-medium">{t('bucket.empty')}</p>
              <p className="text-slate-300 text-xs mt-1">
                Type above and hit Enter to add your first task here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Incomplete top-level tasks */}
              {topLevel
                .filter((t) => !t.isCompleted)
                .map(renderTaskItem)}

              {/* Completed section */}
              {topLevel.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-300 select-none">
                      Completed
                    </span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  {topLevel
                    .filter((t) => t.isCompleted)
                    .map(renderTaskItem)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
