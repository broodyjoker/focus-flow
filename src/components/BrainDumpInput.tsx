// ─────────────────────────────────────────────────────────────────────────────
// BrainDumpInput component
//
// A friction-free text field for instant task capture.
// Stage 4: accepts optional `placeholder` and `compact` props so it can be
// embedded at multiple levels of the Miller Column layout without redundancy.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, type KeyboardEvent } from 'react';

interface BrainDumpInputProps {
  onAdd: (title: string) => void;
  /** Custom placeholder text. Defaults to "What's on your mind?..." */
  placeholder?: string;
  /** Compact variant: smaller vertical padding for column sidebars. */
  compact?: boolean;
}

export function BrainDumpInput({
  onAdd,
  placeholder = "What's on your mind?...",
  compact = false,
}: BrainDumpInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);
    onAdd(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const isEmpty = value.trim().length === 0;

  return (
    <div
      className={[
        'relative flex items-center gap-2 w-full',
        'bg-white dark:bg-slate-800 rounded-xl border',
        'transition-all duration-300 ease-out',
        isFocused
          ? 'border-violet-300 shadow-[0_0_0_3px_rgba(139,92,246,0.10)] dark:border-violet-600 dark:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]'
          : 'border-slate-200 dark:border-slate-700 shadow-sm',
        isAnimating ? 'scale-[0.99]' : 'scale-100',
      ].join(' ')}
    >
      {/* Leading icon */}
      <div
        className={[
          'flex-shrink-0 ml-3 transition-colors duration-200',
          isFocused ? 'text-violet-400' : 'text-slate-300',
        ].join(' ')}
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Input */}
      <input
        id="brain-dump-input"
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label="Add a new task"
        className={[
          'flex-1 bg-transparent outline-none',
          'text-[13px] font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600',
          compact ? 'py-2.5 pr-1' : 'py-3.5 pr-1',
        ].join(' ')}
        autoComplete="off"
        spellCheck="false"
      />

      {/* Add button */}
      <button
        id="brain-dump-add-btn"
        onClick={submit}
        disabled={isEmpty}
        aria-label="Add task"
        className={[
          'flex-shrink-0 mr-2 px-3 py-1.5 rounded-lg',
          'text-[11px] font-semibold tracking-wide',
          'transition-all duration-200 ease-out',
          isEmpty
            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
            : 'text-white bg-gradient-to-br from-violet-500 to-indigo-600 hover:shadow-md hover:scale-105 active:scale-95',
        ].join(' ')}
      >
        Add
      </button>
    </div>
  );
}
