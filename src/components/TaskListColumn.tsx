// ─────────────────────────────────────────────────────────────────────────────
// TaskListColumn — Column 2 of the Miller Column layout
//
// Displays tasks at the current "active level":
//   • activeParentId === null  →  root tasks of the selected bucket or smart view
//   • activeParentId !== null  →  children of that parent task
//
// Navigation:
//   • Back button appears when activeParentId is set
//   • Clicking a row calls onSelectTask → its children appear in Column 3
//   • Siblings of the selected row are dimmed for ADHD-friendly focus
//
// Smart Views:
//   • Displays filtered aggregations. Drill-down is disabled. Clicking opens details.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import type { Task, LifeBucket } from '../models';
import { getBucketById } from '../models';
import { BrainDumpInput } from './BrainDumpInput';
import { TaskRow } from './TaskRow';
import { t } from '../i18n';
import { getTaskDepth, MAX_DEPTH } from '../utils/depth';
import { useSwipe } from '../utils/useSwipe';
import { sortTasksByPriority } from '../utils/priority';
import { isToday, isTomorrow } from '../utils/dates';
import { Menu } from 'lucide-react';

interface TaskListColumnProps {
  buckets: LifeBucket[];
  activeBucketId: string;
  activeSmartView?: 'all' | 'today' | 'tomorrow' | 'important' | null;
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const draggedTaskRef = useRef<string | null>(null);

  const bucket = getBucketById(activeBucketId);
  const isSmartView = !!activeSmartView;

  // ── Depth ────────────────────────────────────────────────────────────────────
  const col2Depth = activeParentId ? getTaskDepth(activeParentId, tasks) + 1 : 1;
  const col2AtMaxDepth = isSmartView || col2Depth >= MAX_DEPTH;
  const canAddToCol2 = !isSmartView && col2Depth <= MAX_DEPTH;

  // ── Visibility & Filtering ───────────────────────────────────────────────────
  let visibleTasks: Task[];
  if (isSmartView) {
    visibleTasks = tasks.filter((t) => !t.isCompleted);
    if (activeSmartView === 'today') {
      visibleTasks = visibleTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
    } else if (activeSmartView === 'tomorrow') {
      visibleTasks = visibleTasks.filter((t) => t.dueDate && isTomorrow(new Date(t.dueDate)));
    } else if (activeSmartView === 'important') {
      visibleTasks = visibleTasks.filter((t) => t.priority === 'high');
    }
    visibleTasks = sortTasksByPriority(visibleTasks);
  } else {
    visibleTasks = sortTasksByPriority(
      activeParentId
        ? tasks.filter((t) => t.parentId === activeParentId)
        : tasks.filter((t) => t.category === activeBucketId && !t.parentId)
    );
  }

  // Lookup which tasks have children — for chevron indicator.
  const tasksWithChildren = col2AtMaxDepth
    ? new Set<string>() // no chevrons at max depth or smart view
    : new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string));

  // Parent task metadata (when drilling down)
  const parentTask = activeParentId ? tasks.find((t) => t.id === activeParentId) : null;

  // ── Labels ───────────────────────────────────────────────────────────────────
  let heading = '';
  let subheadingEmoji = '';

  if (isSmartView) {
    if (activeSmartView === 'all') { heading = 'All Uncompleted'; subheadingEmoji = '📋'; }
    if (activeSmartView === 'today') { heading = 'Today'; subheadingEmoji = '📅'; }
    if (activeSmartView === 'tomorrow') { heading = 'Tomorrow'; subheadingEmoji = '📆'; }
    if (activeSmartView === 'important') { heading = 'Important'; subheadingEmoji = '⭐'; }
  } else {
    heading = parentTask ? parentTask.title : (bucket?.defaultLabel ?? 'Tasks');
    subheadingEmoji = parentTask ? '📝' : (bucket?.emoji ?? '');
  }

  const hasSelection = selectedTaskId !== null && !isSmartView;
  const incompleteCount = visibleTasks.filter((t) => !t.isCompleted).length;

  const statusText =
    visibleTasks.length === 0
      ? t('bucket.empty')
      : incompleteCount === 0
      ? 'All done!'
      : `${incompleteCount} remaining`;

  // LTR Swipe to go back
  const swipeHandlers = useSwipe(undefined, () => {
    if (activeParentId && !isSmartView) onBack();
    else onOpenSidebar();
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
      <div
        key={animKey}
        className={`flex flex-col flex-1 min-h-0 overflow-hidden ${slideClass}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-800/60 flex items-center gap-4">
          
          {/* Back or Hamburger button */}
          {activeParentId && !isSmartView ? (
            <button
              id="col2-back-btn"
              onClick={onBack}
              aria-label="Go back to previous level"
              className={[
                'flex items-center justify-center w-8 h-8 rounded-lg',
                'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50',
                'hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              ].join(' ')}
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
                'md:hidden flex items-center justify-center w-8 h-8 rounded-lg',
                'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50',
                'hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95',
              ].join(' ')}
            >
              <Menu size={18} />
            </button>
          )}

          {/* Breadcrumb / heading */}
          <div className="min-w-0 flex-1">
            <h2
              className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate"
              title={heading}
            >
              {heading}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400/80 dark:text-slate-600 font-medium">{statusText}</p>
          </div>
        </div>

        {/* BrainDump */}
        {canAddToCol2 && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <BrainDumpInput
              compact
              placeholder={activeParentId ? 'Add a step…' : 'Add a task…'}
              onAdd={(title) => onAdd(title, activeParentId)}
            />
          </div>
        )}
        
        {/* Show max depth warning if applicable, but hide for smart views */}
        {!canAddToCol2 && !isSmartView && (
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
              {!isSmartView && (
                <p className="text-slate-300 dark:text-slate-600 text-[11px] mt-1">Type above and hit Enter.</p>
              )}
            </div>
          ) : (
            <div className="pt-1 space-y-0.5">
              {/* ── Incomplete tasks ─────────────────────────────────────── */}
              {isSmartView ? (
                buckets.map((bucket) => {
                  const tasksInBucket = visibleTasks.filter((t) => !t.isCompleted && t.category === bucket.id);
                  if (tasksInBucket.length === 0) return null;
                  
                  return (
                    <div key={bucket.id} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 py-1.5 px-1 mb-1.5 border-b border-slate-100/60 dark:border-slate-800/40">
                        <span className="text-[10px] font-semibold text-slate-400/60 dark:text-slate-600 tracking-[0.12em] uppercase">
                          {bucket.defaultLabel}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {tasksInBucket.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            isSelected={selectedTaskId === task.id && !isSmartView}
                            isDimmed={hasSelection && selectedTaskId !== task.id && !task.isCompleted}
                            hasChildren={tasksWithChildren.has(task.id)}
                            isAtMaxDepth={col2AtMaxDepth}
                            onToggle={onToggle}
                            onClick={isSmartView ? () => onOpenDetail(task.id) : col2AtMaxDepth ? onToggle : onSelectTask}
                            onOpenDetail={onOpenDetail}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onToggleTimer={onToggleTimer}
                            onSwipeDeeper={isSmartView || col2AtMaxDepth ? undefined : onSelectTask}
                            onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, tasksInBucket[index - 1].id) : undefined}
                            onMoveDown={index < tasksInBucket.length - 1 ? () => onSwapTasks?.(task.id, tasksInBucket[index + 1].id) : undefined}
                            draggedTaskId={draggedTaskId}
                            dragOverTaskId={dragOverTaskId}
                            onDragStart={() => {
                              draggedTaskRef.current = task.id;
                              setDraggedTaskId(task.id);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              setDragOverTaskId(task.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverTaskId(null);
                              draggedTaskRef.current = null;
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedTaskRef.current && draggedTaskRef.current !== task.id) {
                                onReorderTasks?.(draggedTaskRef.current, task.id);
                              }
                              setDraggedTaskId(null);
                              setDragOverTaskId(null);
                              draggedTaskRef.current = null;
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                visibleTasks
                  .filter((task) => !task.isCompleted)
                  .map((task, index, arr) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id && !isSmartView}
                      isDimmed={hasSelection && selectedTaskId !== task.id && !task.isCompleted}
                      hasChildren={tasksWithChildren.has(task.id)}
                      isAtMaxDepth={col2AtMaxDepth}
                      onToggle={onToggle}
                      onClick={isSmartView ? () => onOpenDetail(task.id) : col2AtMaxDepth ? onToggle : onSelectTask}
                      onOpenDetail={onOpenDetail}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                      onToggleTimer={onToggleTimer}
                      onSwipeDeeper={isSmartView || col2AtMaxDepth ? undefined : onSelectTask}
                      onMoveUp={index > 0 ? () => onSwapTasks?.(task.id, arr[index - 1].id) : undefined}
                      onMoveDown={index < arr.length - 1 ? () => onSwapTasks?.(task.id, arr[index + 1].id) : undefined}
                      draggedTaskId={draggedTaskId}
                      dragOverTaskId={dragOverTaskId}
                      onDragStart={() => {
                        draggedTaskRef.current = task.id;
                        setDraggedTaskId(task.id);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverTaskId(task.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverTaskId(null);
                        draggedTaskRef.current = null;
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTaskRef.current && draggedTaskRef.current !== task.id) {
                          onReorderTasks?.(draggedTaskRef.current, task.id);
                        }
                        setDraggedTaskId(null);
                        setDragOverTaskId(null);
                        draggedTaskRef.current = null;
                      }}
                    />
                  ))
              )}

              {/* ── Completed divider ────────────────────────────────────── */}
              {!isSmartView && visibleTasks.some((t) => t.isCompleted) && (
                <>
                  <div className="flex items-center gap-2 py-2.5 px-1 mt-1">
                    <div className="flex-1 h-px bg-slate-100/80 dark:bg-slate-800/50" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300/80 dark:text-slate-700 select-none">
                      Done
                    </span>
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
