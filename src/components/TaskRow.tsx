// ─────────────────────────────────────────────────────────────────────────────
// TaskRow — shared row for Column 2 (task list) and Column 3 (children)
//
// DnD: integrates with @dnd-kit/sortable via injected props (listeners,
// attributes, setNodeRef, isDragging). The parent wraps the list in
// DndContext + SortableContext and uses useSortable per row.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Calendar, Sunrise, Timer, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Task } from '../models';
import { formatDueDate, getDueDateColor, isToday, getToday, getTomorrow } from '../utils/dates';
import { PRIORITY_META, type PriorityValue } from '../utils/priority';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface TaskRowProps {
  task: Task;
  isSelected?: boolean;
  isDimmed?: boolean;
  hasChildren?: boolean;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  onOpenDetail: (id: string) => void;
  isAtMaxDepth?: boolean;
  onSwipeDeeper?: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onToggleTimer?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  childProgress?: number;
  // dnd-kit integration -- only provided in sortable lists on desktop
  dndSetNodeRef?: (node: HTMLElement | null) => void;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  isDragging?: boolean;
}

// ── Due-date badge ─────────────────────────────────────────────────────────────
function DueDateBadge({ date }: { date: Date }) {
  const color = getDueDateColor(date);
  const label = formatDueDate(date);

  const colorClass =
    color === 'today'
      ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300'
      : color === 'soon'
      ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
      : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0 ${colorClass}`}>
      {isToday(date) ? '📅 ' : ''}{label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function TaskRow({
  task,
  isSelected = false,
  isDimmed = false,
  hasChildren = false,
  isAtMaxDepth = false,
  onToggle,
  onClick,
  onOpenDetail,
  onUpdateTask,
  onDeleteTask,
  onToggleTimer,
  onMoveUp,
  onMoveDown,
  dndSetNodeRef,
  dndListeners,
  dndAttributes,
  isDragging = false,
}: TaskRowProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -100 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      ref={dndSetNodeRef}
      className={`relative w-full group select-none min-w-0 ${isDragging ? 'opacity-50 z-50' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try { setIsSwiped(false); onOpenDetail(task.id); } catch {}
      }}
    >
      {isMobile && isSwiped && (
        <div className="absolute inset-y-0 right-0 w-20 bg-red-500 rounded-xl flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); if (onDeleteTask) onDeleteTask(task.id); }}
            aria-label="Delete task"
            className="flex items-center justify-center w-full h-full text-white focus:outline-none"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}

      <motion.div
        drag={isMobile ? "x" : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        animate={{ x: isSwiped ? -80 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -40) setIsSwiped(true);
          else setIsSwiped(false);
        }}
        id={`task-row-${task.id}`}
        role="row"
        aria-selected={isSelected}
        onClick={(e) => {
          if (isSwiped) { e.stopPropagation(); setIsSwiped(false); }
        }}
        onTouchStart={() => {
          longPressTimerRef.current = setTimeout(() => { setIsSwiped(false); onOpenDetail(task.id); }, 600);
        }}
        onTouchMove={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
        onTouchEnd={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
        className={[
          'group flex items-center gap-3 px-3 rounded-xl cursor-pointer bg-white dark:bg-[#0b1120]',
          'border transition-all duration-200 ease-out',
          isCalendarOpen ? 'relative z-[60]' : 'relative z-10',
          isSelected
            ? 'bg-violet-50 border-violet-200/70 shadow-[0_1px_6px_rgba(139,92,246,0.15)] dark:bg-violet-950/40 dark:border-violet-800/50'
            : 'border-transparent hover:bg-slate-50/80 hover:border-slate-100 dark:hover:bg-slate-800/50 dark:hover:border-slate-700/40 active:scale-[0.995]',
          isSwiped ? 'opacity-50 md:opacity-100' : isDimmed ? 'opacity-100 md:opacity-25' : 'opacity-100',
        ].join(' ')}
      >

        {/* ── Drag handle (Desktop only) — dnd-kit listeners scoped here ─────── */}
        {!isMobile && (
          <div
            {...dndListeners}
            {...dndAttributes}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-shrink-0 -ml-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </div>
        )}

        {/* ── Checkbox ──────────────────────────────────────────────────────── */}
        <button
          id={`task-row-toggle-${task.id}`}
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          aria-label={task.isCompleted ? `Uncheck "${task.title}"` : `Complete "${task.title}"`}
          aria-pressed={task.isCompleted}
          className="p-3 -ml-3 -my-3 flex-shrink-0 focus-visible:outline-none group/checkbox cursor-pointer transition-transform active:scale-90"
        >
          <div className={[
            'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center',
            'transition-all duration-200 ease-out',
            'group-focus-visible/checkbox:ring-2 group-focus-visible/checkbox:ring-offset-1 group-focus-visible/checkbox:ring-violet-400',
            task.isCompleted
              ? 'bg-gradient-to-tr from-emerald-400 to-emerald-500 border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.2)] animate-checkbox-pop'
              : isSelected
              ? 'border-violet-400 bg-white dark:bg-slate-900 group-hover/checkbox:scale-110 shadow-[0_0_0_2px_rgba(139,92,246,0.12)]'
              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 group-hover:border-slate-400 dark:group-hover:border-slate-500 group-hover/checkbox:scale-110',
          ].join(' ')}>
            <svg className={['w-2.5 h-2.5 text-white transition-all duration-300 ease-out', task.isCompleted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'].join(' ')} viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 flex items-center self-stretch py-2.5 cursor-pointer pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); console.log('Task Clicked:', task.id); onClick(task.id); }}
        >
          <span className={[
            'inline-block max-w-full text-[13px] font-medium leading-snug truncate transition-all duration-150 ease-out hover:opacity-80',
            task.isCompleted ? 'line-through text-slate-300 dark:text-slate-600'
              : isSelected ? 'text-violet-800 dark:text-violet-200'
              : 'text-slate-800 dark:text-slate-100',
          ].join(' ')}>
            {task.title}
          </span>
        </div>

        {task.isRoutine && <span aria-label="Daily routine" className="flex-shrink-0 text-emerald-400 dark:text-emerald-500 text-[11px]">🔄</span>}

        {task.dueDate && <DueDateBadge date={task.dueDate} />}

        {task.priority && task.priority !== 'none' && !task.isCompleted && (
          <span
            className={['flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] border border-transparent text-[12px]', PRIORITY_META[task.priority as PriorityValue].color, PRIORITY_META[task.priority as PriorityValue].bgColor, PRIORITY_META[task.priority as PriorityValue].borderColor].join(' ')}
            title={`Priority: ${PRIORITY_META[task.priority as PriorityValue].label}`}
          >
            {PRIORITY_META[task.priority as PriorityValue].icon}
          </span>
        )}

        <div className={`task-actions relative ${isCalendarOpen ? 'z-[60]' : 'z-10'} flex items-center gap-1 flex-shrink-0`} style={{ pointerEvents: 'auto' }}>
          {!isMobile && onDeleteTask && (
            <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors" title="Delete task" aria-label="Delete task">
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onToggleTimer) onToggleTimer(task.id); }} title="Start Pomodoro" className="p-1.5 text-slate-400 hover:text-rose-500 active:scale-95 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all duration-200">
            <Timer size={14} />
          </button>
          <div className="relative" ref={calendarRef}>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCalendarOpen(!isCalendarOpen); }} title="Schedule Task" className={['p-1.5 rounded-lg transition-all duration-200 active:scale-95', isCalendarOpen ? 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30' : 'text-slate-400 hover:text-violet-600 dark:text-slate-500 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30'].join(' ')}>
              <Calendar size={14} />
            </button>
            {isCalendarOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[999] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { dueDate: getToday() }); setIsCalendarOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left transition-colors"><Sun size={14} className="text-amber-500" />Today</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { dueDate: getTomorrow() }); setIsCalendarOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left transition-colors"><Sunrise size={14} className="text-sky-500" />Tomorrow</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { dueDate: undefined }); setIsCalendarOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left transition-colors"><Calendar size={14} className="text-slate-400" />Someday</button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Move Controls */}
        <div className="md:hidden flex flex-col -space-y-1 items-center ml-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} disabled={!onMoveUp} className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors" aria-label="Move Up"><ChevronUp size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} disabled={!onMoveDown} className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors" aria-label="Move Down"><ChevronDown size={16} /></button>
        </div>

        {/* Right chevron */}
        <button onClick={(e) => { e.stopPropagation(); onOpenDetail(task.id); }} aria-label="Task settings" className="p-2 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95 flex-shrink-0">
          <svg className={['w-4 h-4 transition-all duration-200', isAtMaxDepth ? 'opacity-0' : isSelected ? 'text-violet-400 opacity-100' : hasChildren ? 'text-slate-400 dark:text-slate-500 opacity-100' : 'text-slate-300 dark:text-slate-600 opacity-100'].join(' ')} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}
