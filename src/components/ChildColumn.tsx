// ─────────────────────────────────────────────────────────────────────────────
// ChildColumn — Column 3 of the Miller Column layout
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from "../models";
import { BrainDumpInput } from "./BrainDumpInput";
import { TaskRow } from "./TaskRow";
import { SortableTaskRow } from "./SortableTaskRow";
import { getTaskDepth, MAX_DEPTH } from "../utils/depth";
import { useSwipe } from "../utils/useSwipe";
import { sortTasksByPriority } from "../utils/priority";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface ChildColumnProps {
  tasks: Task[];
  selectedTaskId: string | null;
  animKey: string;
  slideClass: string;
  onAdd: (title: string, parentId: string | null) => void;
  onToggle: (id: string) => void;
  onShiftInto: (taskId: string) => void;
  onOpenDetail: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTimer?: (taskId: string) => void;
  onReorderTasks?: (draggedId: string, dropTargetId: string) => void;
  onSwapTasks?: (id1: string, id2: string) => void;
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
  onDeleteTask,
  onToggleTimer,
  onReorderTasks,
  onSwapTasks,
  isActiveMobileView = false,
  parentListName = "Categories",
  onMobileBack,
}: ChildColumnProps) {
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  const children = sortTasksByPriority(
    selectedTaskId ? tasks.filter((t) => t.parentId === selectedTaskId) : []
  );

  const childrenDepth = selectedTaskId ? getTaskDepth(selectedTaskId, tasks) + 1 : 1;
  const childrenAtMaxDepth = childrenDepth >= MAX_DEPTH;

  const grandchildParentIds = childrenAtMaxDepth
    ? new Set<string>()
    : new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string));

  const canAddChildren = childrenDepth <= MAX_DEPTH;
  const incompleteCount = children.filter((t) => !t.isCompleted).length;

  const swipeHandlers = useSwipe(undefined, () => {
    if (onMobileBack) onMobileBack();
  });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } })
  );

  const incompleteChildren = children.filter((t) => !t.isCompleted);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderTasks?.(active.id as string, over.id as string);
  }

  if (!selectedTask) return null;

  const statusText =
    children.length === 0 ? "No steps yet — add one below"
      : incompleteCount === 0 ? "All steps done!"
      : `${incompleteCount} of ${children.length} remaining`;

  return (
    <div
      id="col-3"
      {...swipeHandlers}
      className={[
        'flex-col min-w-0 min-h-0 overflow-hidden',
        'bg-slate-50/60 dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 relative',
        'md:flex-1',
        isActiveMobileView ? 'flex w-full' : 'hidden md:flex',
      ].join(' ')}
    >
      <div key={animKey} className={`flex flex-col flex-1 min-h-0 overflow-hidden ${slideClass}`}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <button
            onClick={onMobileBack}
            className="md:hidden flex items-center gap-1.5 mb-3 -ml-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 rounded"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to {parentListName}
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Steps for</p>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate" title={selectedTask.title}>{selectedTask.title}</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{statusText}</p>
        </div>

        {canAddChildren ? (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <BrainDumpInput compact placeholder="Add a step…" onAdd={(title) => onAdd(title, selectedTaskId)} />
          </div>
        ) : (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-300 dark:text-slate-600 text-xs" aria-hidden="true">🔒</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Max depth reached (Level {MAX_DEPTH})</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-300 dark:text-slate-600 text-xs font-medium leading-relaxed">Break this task into smaller, manageable steps.</p>
            </div>
          ) : (
            <div className="pt-1 space-y-0.5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={incompleteChildren.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {incompleteChildren.map((task, index, arr) => {
                    const childTasks = tasks.filter((t) => t.parentId === task.id);
                    const childProgress = childTasks.length > 0 ? Math.round((childTasks.filter((t) => t.isCompleted).length / childTasks.length) * 100) : undefined;
                    return isMobile ? (
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
                        onDeleteTask={onDeleteTask}
                        onToggleTimer={onToggleTimer}
                        onSwipeDeeper={childrenAtMaxDepth ? undefined : onShiftInto}
                        onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, arr[index - 1].id) : undefined}
                        onMoveDown={index < arr.length - 1 ? () => onSwapTasks?.(task.id, arr[index + 1].id) : undefined}
                      />
                    ) : (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        isSelected={false}
                        isDimmed={false}
                        hasChildren={grandchildParentIds.has(task.id)}
                        isAtMaxDepth={childrenAtMaxDepth}
                        onToggle={onToggle}
                        onClick={childrenAtMaxDepth ? onToggle : onShiftInto}
                        onOpenDetail={onOpenDetail}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onToggleTimer={onToggleTimer}
                        onSwipeDeeper={childrenAtMaxDepth ? undefined : onShiftInto}
                        onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, arr[index - 1].id) : undefined}
                        onMoveDown={index < arr.length - 1 ? () => onSwapTasks?.(task.id, arr[index + 1].id) : undefined}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {children.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-2 py-2.5 px-1">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 select-none">Done</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>
                  {children.filter((t) => t.isCompleted).map((task) => {
                    const childTasks = tasks.filter((t) => t.parentId === task.id);
                    const childProgress = childTasks.length > 0 ? Math.round((childTasks.filter((t) => t.isCompleted).length / childTasks.length) * 100) : undefined;
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
                        onDeleteTask={onDeleteTask}
                        onToggleTimer={onToggleTimer}
                        onSwipeDeeper={childrenAtMaxDepth ? undefined : onShiftInto}
                      />
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
