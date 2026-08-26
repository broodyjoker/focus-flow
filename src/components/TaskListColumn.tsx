// ─────────────────────────────────────────────────────────────────────────────
// TaskListColumn — Column 2 of the Miller Column layout
// ─────────────────────────────────────────────────────────────────────────────

import type { Task, LifeBucket } from "../models";
import { getBucketById } from "../models";
import { BrainDumpInput } from "./BrainDumpInput";
import { TaskRow } from "./TaskRow";
import { SortableTaskRow } from "./SortableTaskRow";
import { t } from "../i18n";
import { getTaskDepth, MAX_DEPTH } from "../utils/depth";
import { useSwipe } from "../utils/useSwipe";
import { sortTasksByPriority } from "../utils/priority";
import { isToday, isTomorrow } from "../utils/dates";
import { Menu } from "lucide-react";
import { useResizableWidth } from "../hooks/useResizableWidth";
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

interface TaskListColumnProps {
  buckets: LifeBucket[];
  activeBucketId: string;
  activeSmartView?: "all" | "today" | "tomorrow" | "important" | null;
  tasks: Task[];
  activeParentId: string | null;
  selectedTaskId: string | null;
  animKey: string;
  slideClass: string;
  onAdd: (title: string, parentId: string | null) => void;
  onToggle: (id: string) => void;
  onSelectTask: (id: string) => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onOpenDetail: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTimer?: (taskId: string) => void;
  onReorderTasks?: (draggedId: string, dropTargetId: string) => void;
  onSwapTasks?: (id1: string, id2: string) => void;
  isActiveMobileView?: boolean;
}

export function TaskListColumn({
  buckets,
  activeBucketId,
  activeSmartView,
  tasks,
  activeParentId,
  selectedTaskId,
  animKey,
  slideClass,
  onAdd,
  onToggle,
  onSelectTask,
  onBack,
  onOpenSidebar,
  onOpenDetail,
  onUpdateTask,
  onDeleteTask,
  onToggleTimer,
  onReorderTasks,
  onSwapTasks,
  isActiveMobileView = false,
}: TaskListColumnProps) {
  const { width, startResizing } = useResizableWidth(450, 300, 800);

  const bucket = buckets.find((b) => b.id === activeBucketId) || getBucketById(activeBucketId);
  const isSmartView = !!activeSmartView;

  const col2Depth = activeParentId ? getTaskDepth(activeParentId, tasks) + 1 : 1;
  const col2AtMaxDepth = col2Depth >= MAX_DEPTH;
  const canAddToCol2 = !isSmartView && col2Depth <= MAX_DEPTH;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  let visibleTasks: Task[];
  if (isSmartView) {
    visibleTasks = tasks.filter((t) => !t.isCompleted && !t.parentId);
    if (activeSmartView === "today") visibleTasks = visibleTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
    else if (activeSmartView === "tomorrow") visibleTasks = visibleTasks.filter((t) => t.dueDate && isTomorrow(new Date(t.dueDate)));
    else if (activeSmartView === "important") visibleTasks = visibleTasks.filter((t) => t.priority === "high");
    visibleTasks = sortTasksByPriority(visibleTasks);
  } else {
    visibleTasks = sortTasksByPriority(
      activeParentId
        ? tasks.filter((t) => t.parentId === activeParentId)
        : tasks.filter((t) => t.category === activeBucketId && !t.parentId)
    );
  }

  const tasksWithChildren = col2AtMaxDepth
    ? new Set<string>()
    : new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string));

  const parentTask = activeParentId ? tasks.find((t) => t.id === activeParentId) : null;

  let heading = "";
  let subheadingEmoji = "";
  if (isSmartView) {
    if (activeSmartView === "all") { heading = "All Uncompleted"; subheadingEmoji = "📋"; }
    if (activeSmartView === "today") { heading = "Today"; subheadingEmoji = "📅"; }
    if (activeSmartView === "tomorrow") { heading = "Tomorrow"; subheadingEmoji = "📆"; }
    if (activeSmartView === "important") { heading = "Important"; subheadingEmoji = "⭐"; }
  } else {
    heading = parentTask ? parentTask.title : (bucket?.defaultLabel ?? "Tasks");
    subheadingEmoji = parentTask ? "📝" : (bucket?.emoji ?? "");
  }

  const hasSelection = selectedTaskId !== null && !isSmartView;
  const incompleteCount = visibleTasks.filter((t) => !t.isCompleted).length;
  const statusText =
    visibleTasks.length === 0 ? t("bucket.empty")
      : incompleteCount === 0 ? "All done!"
      : `${incompleteCount} remaining`;

  const swipeHandlers = useSwipe(undefined, () => {
    if (activeParentId && !isSmartView) onBack();
    else onOpenSidebar();
  });

  // Mouse+Touch sensors with distance:5 so a 5px move activates drag, plain
  // clicks pass through untouched. Title div also blocks pointerDown to be safe.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } })
  );

  const incompleteTasks = visibleTasks.filter((t) => !t.isCompleted);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderTasks?.(active.id as string, over.id as string);
  }

  return (
    <div
      id="col-2"
      {...swipeHandlers}
      style={!isActiveMobileView && hasSelection ? { width: `${width}px`, flex: 'none' } : undefined}
      className={[
        'flex-col min-w-0 min-h-0 overflow-hidden',
        'bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 relative',
        'transition-colors duration-300 ease-in-out',
        !hasSelection ? 'md:flex-1' : '',
        isActiveMobileView ? 'flex w-full' : 'hidden md:flex',
      ].join(' ')}
    >
      {hasSelection && (
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-violet-400/20 active:bg-violet-400/40 transition-colors z-50 translate-x-1/2 hidden md:block"
        />
      )}
      <div key={animKey} className={`flex flex-col flex-1 min-h-0 overflow-hidden ${slideClass}`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-800/60 flex items-center gap-4">
          {activeParentId ? (
            <button
              id="col2-back-btn"
              onClick={onBack}
              aria-label="Go back to previous level"
              className={[
                "flex items-center justify-center w-8 h-8 rounded-lg",
                "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50",
                "hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              ].join(" ")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onOpenSidebar}
              aria-label="Open sidebar menu"
              className={[
                "md:hidden flex items-center justify-center w-8 h-8 rounded-lg",
                "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50",
                "hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95",
              ].join(" ")}
            >
              <Menu size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate" title={heading}>{heading}</h2>
            <p className="mt-0.5 text-[11px] text-slate-400/80 dark:text-slate-600 font-medium">{statusText}</p>
          </div>
        </div>

        {canAddToCol2 && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <BrainDumpInput compact placeholder={activeParentId ? "Add a step…" : "Add a task…"} onAdd={(title) => onAdd(title, activeParentId)} />
          </div>
        )}

        {!canAddToCol2 && !isSmartView && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-300 dark:text-slate-600 text-xs" aria-hidden="true">🔒</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Max depth reached (Level {MAX_DEPTH})</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl mb-3">{subheadingEmoji || "📋"}</div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t("bucket.empty")}</p>
              {!isSmartView && <p className="text-slate-300 dark:text-slate-600 text-[11px] mt-1">Type above and hit Enter.</p>}
            </div>
          ) : (
            <div className="pt-1 space-y-0.5">
              {isSmartView ? (
                buckets.map((bucket) => {
                  const tasksInBucket = visibleTasks.filter((t) => !t.isCompleted && t.category === bucket.id);
                  if (tasksInBucket.length === 0) return null;
                  return (
                    <div key={bucket.id} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 py-1.5 px-1 mb-1.5 border-b border-slate-100/60 dark:border-slate-800/40">
                        <span className="text-[10px] font-semibold text-slate-400/60 dark:text-slate-600 tracking-[0.12em] uppercase">{bucket?.defaultLabel || "Category"}</span>
                      </div>
                      <div className="space-y-0.5">
                        {tasksInBucket.map((task, index) => (
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
                            onDeleteTask={onDeleteTask}
                            onToggleTimer={onToggleTimer}
                            onSwipeDeeper={col2AtMaxDepth ? undefined : onSelectTask}
                            onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, tasksInBucket[index - 1].id) : undefined}
                            onMoveDown={index < tasksInBucket.length - 1 ? () => onSwapTasks?.(task.id, tasksInBucket[index + 1].id) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={incompleteTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {incompleteTasks.map((task, index, arr) => (
                      isMobile ? (
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
                          onDeleteTask={onDeleteTask}
                          onToggleTimer={onToggleTimer}
                          onSwipeDeeper={col2AtMaxDepth ? undefined : onSelectTask}
                          onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, arr[index - 1].id) : undefined}
                          onMoveDown={index < arr.length - 1 ? () => onSwapTasks?.(task.id, arr[index + 1].id) : undefined}
                        />
                      ) : (
                        <SortableTaskRow
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
                          onDeleteTask={onDeleteTask}
                          onToggleTimer={onToggleTimer}
                          onSwipeDeeper={col2AtMaxDepth ? undefined : onSelectTask}
                          onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, arr[index - 1].id) : undefined}
                          onMoveDown={index < arr.length - 1 ? () => onSwapTasks?.(task.id, arr[index + 1].id) : undefined}
                        />
                      )
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {!isSmartView && visibleTasks.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-2 py-2.5 px-1 mt-1">
                    <div className="flex-1 h-px bg-slate-100/80 dark:bg-slate-800/50" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300/80 dark:text-slate-700 select-none">Done</span>
                    <div className="flex-1 h-px bg-slate-100/80 dark:bg-slate-800/50" />
                  </div>
                  {visibleTasks
                    .filter((task) => task.isCompleted)
                    .map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskId === task.id && !isSmartView}
                        isDimmed={hasSelection && selectedTaskId !== task.id}
                        hasChildren={tasksWithChildren.has(task.id)}
                        isAtMaxDepth={col2AtMaxDepth}
                        onToggle={onToggle}
                        onClick={isSmartView ? () => onOpenDetail(task.id) : col2AtMaxDepth ? onToggle : onSelectTask}
                        onOpenDetail={onOpenDetail}
                        onUpdateTask={onUpdateTask}
                        onToggleTimer={onToggleTimer}
                        onSwipeDeeper={isSmartView || col2AtMaxDepth ? undefined : onSelectTask}
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
