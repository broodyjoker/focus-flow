// ─────────────────────────────────────────────────────────────────────────────
// CategoryCard component
//
// Renders a single Life Bucket as a clickable card. Stateless in Stage 1 —
// click / hover state will be managed via a Router or global state later.
// ─────────────────────────────────────────────────────────────────────────────

import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { LifeBucket } from '../models';

interface CategoryCardProps {
  bucket: LifeBucket;
  taskCount?: number;
  isActive?: boolean;
  onClick?: (bucketId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function CategoryCard({
  bucket,
  taskCount = 0,
  isActive = false,
  onClick,
  onMoveUp,
  onMoveDown,
}: CategoryCardProps) {
  const handleClick = () => onClick?.(bucket.id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      id={`category-card-${bucket.id}`}
      role="button"
      tabIndex={0}
      aria-label={bucket.defaultLabel}
      aria-pressed={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        // Base layout
        'group relative flex items-center gap-2 w-full pr-4 py-3.5 rounded-2xl',
        'text-left transition-all duration-200 cursor-pointer',
        // Border & background
        'border border-transparent',
        isActive
          ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700/50',
        // Focus ring
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400',
      ].join(' ')}
    >
      {/* Drag handle (Desktop only) */}
      <div className="hidden md:flex flex-shrink-0 pl-2 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </div>

      {/* Spacer for mobile where drag handle is hidden */}
      <div className="md:hidden w-3 flex-shrink-0" />

      {/* Accent dot */}
      <span
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
        style={{ backgroundColor: `hsl(${bucket.accentHsl} / 0.12)` }}
        aria-hidden="true"
      >
        {bucket.emoji}
      </span>

      {/* Label */}
      <span className="flex-1 font-medium text-slate-700 dark:text-slate-300 text-sm tracking-tight leading-snug truncate">
        {bucket.defaultLabel.replace(`${bucket.emoji} `, '')}
      </span>

      {/* Task count badge */}
      {taskCount > 0 && (
        <span
          className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center
                     text-xs font-semibold text-white"
          style={{ backgroundColor: `hsl(${bucket.accentHsl})` }}
          aria-label={`${taskCount} task${taskCount !== 1 ? 's' : ''}`}
        >
          {taskCount}
        </span>
      )}

      {/* Mobile Move Controls */}
      <div className="md:hidden flex flex-col -space-y-1 items-center ml-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onMoveUp}
          disabled={!onMoveUp}
          className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors"
          aria-label="Move Up"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!onMoveDown}
          className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors"
          aria-label="Move Down"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Right chevron (Desktop only) */}
      <svg
        className="hidden md:block w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors flex-shrink-0 ml-1"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 3l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
