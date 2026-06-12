// ─────────────────────────────────────────────────────────────────────────────
// TaskItem component
//
// Stage 3 upgrades:
//  • Receives subTasks[] and onAddSubTask() from MainContent
//  • "Add Step" button toggles an inline input below the task card
//  • Sub-tasks render with indent + vertical connector line
//  • Nesting is intentionally limited to 1 level (parentId tasks never get
//    their own "Add Step" button — enforced in MainContent by only passing
//    top-level tasks here)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, type KeyboardEvent } from 'react';
import type { Task } from '../models';
import { getBucketById } from '../models';
import { SubTaskItem } from './SubTaskItem';

interface TaskItemProps {
  task: Task;
  subTasks: Task[];
  onToggle: (id: string) => void;
  onAddSubTask: (parentId: string, title: string) => void;
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgent', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  2: { label: 'High',   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  3: { label: 'Normal', color: 'text-slate-500 bg-slate-50 border-slate-200' },
  4: { label: 'Later',  color: 'text-slate-400 bg-slate-50 border-slate-100' },
};

const ENERGY_ICONS: Record<string, string> = {
  high: '⚡',
  low: '🌿',
};

export function TaskItem({ task, subTasks = [], onToggle, onAddSubTask }: TaskItemProps) {
  // ── Local UI state ─────────────────────────────────────────────────────────
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [stepValue, setStepValue] = useState('');
  const stepInputRef = useRef<HTMLInputElement>(null);

  const bucket = getBucketById(task.category);
  const priorityMeta = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS[3];

  const dueDateStr = task.dueDate
    ? task.dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // ── Inline step handlers ───────────────────────────────────────────────────
  const openStepInput = () => {
    setIsAddingStep(true);
    // Focus after the DOM updates
    setTimeout(() => stepInputRef.current?.focus(), 30);
  };

  const commitStep = () => {
    const trimmed = stepValue.trim();
    if (trimmed) {
      onAddSubTask(task.id, trimmed);
    }
    setStepValue('');
    setIsAddingStep(false);
  };

  const cancelStep = () => {
    setStepValue('');
    setIsAddingStep(false);
  };

  const handleStepKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitStep();
    }
    if (e.key === 'Escape') {
      cancelStep();
    }
  };

  // Sub-task progress pill
  const doneCount = subTasks.filter((s) => s.isCompleted).length;
  const totalCount = subTasks.length;
  const hasSubTasks = totalCount > 0;
  const allSubsDone = hasSubTasks && doneCount === totalCount;

  return (
    <div id={`task-group-${task.id}`}>
      {/* ── Parent card ──────────────────────────────────────────────────────── */}
      <div
        id={`task-item-${task.id}`}
        role="article"
        aria-label={task.title}
        className={[
          'group flex items-start gap-3.5 p-4 rounded-2xl',
          'border bg-white',
          'transition-all duration-500 ease-in-out',
          task.isCompleted
            ? 'opacity-50 border-slate-100 shadow-none'
            : 'opacity-100 border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200',
        ].join(' ')}
      >
        {/* ── Checkbox ─────────────────────────────────────────────────────── */}
        <button
          id={`task-toggle-${task.id}`}
          onClick={() => onToggle(task.id)}
          aria-label={
            task.isCompleted
              ? `Mark "${task.title}" incomplete`
              : `Complete "${task.title}"`
          }
          aria-pressed={task.isCompleted}
          className={[
            'flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2',
            'flex items-center justify-center',
            'transition-all duration-300 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-400',
            task.isCompleted
              ? 'bg-emerald-500 border-emerald-500 scale-110'
              : 'border-slate-300 bg-white group-hover:border-violet-400 hover:scale-110',
          ].join(' ')}
        >
          <svg
            className={[
              'w-3 h-3 text-white',
              'transition-all duration-300 ease-out',
              task.isCompleted ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
            ].join(' ')}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p
              className={[
                'text-sm font-semibold leading-snug flex-1',
                'transition-all duration-500 ease-in-out',
                task.isCompleted
                  ? 'line-through text-slate-400'
                  : 'text-slate-800',
              ].join(' ')}
            >
              {task.title}
            </p>

            {/* "Add Step" button — only on incomplete, top-level tasks */}
            {!task.isCompleted && (
              <button
                id={`task-add-step-${task.id}`}
                onClick={openStepInput}
                aria-label={`Add a step to "${task.title}"`}
                title="Break this task into steps"
                className={[
                  'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg',
                  'text-[11px] font-medium text-slate-400',
                  'border border-transparent',
                  'transition-all duration-150',
                  'opacity-0 group-hover:opacity-100',
                  'hover:text-violet-600 hover:bg-violet-50 hover:border-violet-100',
                  'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                ].join(' ')}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Add Step
              </button>
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <p
              className={[
                'mt-1 text-xs leading-relaxed line-clamp-2',
                'transition-colors duration-500',
                task.isCompleted ? 'text-slate-300' : 'text-slate-500',
              ].join(' ')}
            >
              {task.notes}
            </p>
          )}

          {/* Sub-task progress pill */}
          {hasSubTasks && (
            <div className="mt-2 flex items-center gap-2">
              {/* Mini progress bar */}
              <div className="flex-1 max-w-[80px] h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(doneCount / totalCount) * 100}%`,
                    backgroundColor: allSubsDone ? '#10b981' : '#a78bfa',
                  }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                {doneCount}/{totalCount}
              </span>
            </div>
          )}

          {/* Meta badges */}
          <div
            className={[
              'mt-2.5 flex flex-wrap items-center gap-1.5',
              'transition-opacity duration-500',
              task.isCompleted ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
          >
            {/* Bucket badge */}
            {bucket && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                style={{
                  color: `hsl(${bucket.accentHsl})`,
                  backgroundColor: `hsl(${bucket.accentHsl} / 0.08)`,
                  borderColor: `hsl(${bucket.accentHsl} / 0.2)`,
                }}
              >
                <span aria-hidden="true">{bucket.emoji}</span>
                {bucket.defaultLabel.replace(`${bucket.emoji} `, '')}
              </span>
            )}

            {/* Priority badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${priorityMeta.color}`}
            >
              {priorityMeta.label}
            </span>

            {/* Energy level */}
            {task.energyLevel && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-100 text-slate-500 bg-slate-50">
                <span aria-hidden="true">{ENERGY_ICONS[task.energyLevel]}</span>
                {task.energyLevel === 'high' ? 'High energy' : 'Low energy'}
              </span>
            )}

            {/* Routine tag */}
            {task.isRoutine && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-violet-100 text-violet-600 bg-violet-50">
                🔄 Routine
              </span>
            )}

            {/* Due date */}
            {dueDateStr && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-100 text-slate-500 bg-slate-50">
                📅 {dueDateStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-task list + connector ─────────────────────────────────────────── */}
      {(hasSubTasks || isAddingStep) && (
        <div className="flex mt-0.5">
          {/* Left gutter: vertical connector line */}
          <div className="flex flex-col items-center w-9 flex-shrink-0 pt-1 pb-1">
            {/* Thin vertical line running the full height of the sub-task area */}
            <div className="w-px flex-1 bg-slate-200 rounded-full" />
          </div>

          {/* Sub-task rows */}
          <div className="flex-1 py-1 space-y-0.5 min-w-0">
            {subTasks.map((sub) => (
              <SubTaskItem key={sub.id} task={sub} onToggle={onToggle} />
            ))}

            {/* ── Inline "Add Step" input ─────────────────────────────────── */}
            {isAddingStep && (
              <div className="flex items-center gap-2.5 px-3 py-2">
                {/* Small dot to align with sub-task checkboxes */}
                <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>

                <input
                  ref={stepInputRef}
                  id={`step-input-${task.id}`}
                  type="text"
                  value={stepValue}
                  onChange={(e) => setStepValue(e.target.value)}
                  onKeyDown={handleStepKeyDown}
                  onBlur={commitStep}
                  placeholder="Add a step… (Enter to save, Esc to cancel)"
                  aria-label={`New step for "${task.title}"`}
                  className={[
                    'flex-1 text-xs font-medium text-slate-700',
                    'placeholder:text-slate-300',
                    'bg-transparent outline-none',
                    'border-b border-slate-200 pb-0.5',
                    'focus:border-violet-400',
                    'transition-colors duration-150',
                  ].join(' ')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
