// ─────────────────────────────────────────────────────────────────────────────
// QuickCaptureModal — Ctrl+K / Cmd+K command-palette-style task entry
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown } from 'lucide-react';
import type { LifeBucket } from '../models';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, bucketId: string) => void;
  buckets: LifeBucket[];
  defaultBucketId: string;
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onAdd,
  buckets,
  defaultBucketId,
}: QuickCaptureModalProps) {
  const [title, setTitle] = useState('');
  const [selectedBucketId, setSelectedBucketId] = useState(defaultBucketId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync bucket when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBucketId(defaultBucketId);
    }
  }, [isOpen, defaultBucketId]);

  // Auto-focus input on open; clear title on close
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    } else {
      setTitle('');
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, selectedBucketId);
    setTitle('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="qc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            key="qc-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Quick capture task"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-[201] w-[92vw] max-w-[480px] bg-white dark:bg-[#0d1526] border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            {/* Title input row */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Zap size={14} className="text-white" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Capture a task..."
                className="flex-1 min-w-0 bg-transparent border-none p-0 text-[15px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-0"
              />
            </div>

            {/* Category selector + Submit */}
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="relative flex-1 min-w-0">
                <select
                  id="quick-capture-bucket"
                  value={selectedBucketId}
                  onChange={(e) => setSelectedBucketId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 rounded-xl text-[12px] font-semibold bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400/50 transition-all duration-150 cursor-pointer"
                >
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.defaultLabel}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!title.trim()}
                className={[
                  'flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide',
                  'transition-all duration-150 active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                  title.trim()
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 hover:brightness-110'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed',
                ].join(' ')}
              >
                Add Task
              </button>
            </div>

            {/* Keyboard hint bar */}
            <div className="px-4 pb-3 flex items-center gap-4">
              <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none">
                <kbd className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px] border border-slate-200 dark:border-slate-700">
                  Enter
                </kbd>
                {' '}to save
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none">
                <kbd className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px] border border-slate-200 dark:border-slate-700">
                  Esc
                </kbd>
                {' '}to dismiss
              </span>
              <span className="ml-auto text-[10px] text-slate-300 dark:text-slate-700 select-none font-mono">
                Ctrl+K
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
