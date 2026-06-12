// ─────────────────────────────────────────────────────────────────────────────
// SubTaskItem component
//
// Renders a single sub-task row nested under its parent.
// Deliberately minimal: no badges, no meta, just checkbox + title.
// This keeps the visual hierarchy clear: parents are rich, children are lean.
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';

interface SubTaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

export function SubTaskItem({ task, onToggle }: SubTaskItemProps) {
  return (
    <div
      id={`subtask-item-${task.id}`}
      role="article"
      aria-label={task.title}
      className={[
        'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
        'transition-all duration-500 ease-in-out',
        task.isCompleted ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      {/* Checkbox */}
      <button
        id={`subtask-toggle-${task.id}`}
        onClick={() => onToggle(task.id)}
        aria-label={
          task.isCompleted
            ? `Mark "${task.title}" incomplete`
            : `Complete "${task.title}"`
        }
        aria-pressed={task.isCompleted}
        className={[
          'flex-shrink-0 w-4 h-4 rounded-full border-2',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-violet-400',
          task.isCompleted
            ? 'bg-emerald-500 border-emerald-500 scale-110'
            : 'border-slate-300 bg-white group-hover:border-violet-400 hover:scale-110',
        ].join(' ')}
      >
        <svg
          className={[
            'w-2.5 h-2.5 text-white',
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Title */}
      <span
        className={[
          'flex-1 text-xs font-medium leading-snug',
          'transition-all duration-500 ease-in-out',
          task.isCompleted
            ? 'line-through text-slate-400'
            : 'text-slate-600',
        ].join(' ')}
      >
        {task.title}
      </span>
    </div>
  );
}
