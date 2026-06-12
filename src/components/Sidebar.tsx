// ─────────────────────────────────────────────────────────────────────────────
// Sidebar component
//
// Left-hand navigation showing the 10 Life Buckets as a list.
// Stage 1: stateless, no routing. Active bucket prop passed from parent.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import type { LifeBucket } from '../models';
import { CategoryCard } from './CategoryCard';
import { t } from '../i18n';
import { Sun, Moon, Zap, Settings } from 'lucide-react';

interface SidebarProps {
  buckets: LifeBucket[];
  activeBucketId?: string;
  taskCountByBucket?: Record<string, number>;
  onSelectBucket?: (bucketId: string) => void;
  isActiveMobileView?: boolean;
  isDark?: boolean;
  toggleDark?: () => void;
  onToggleZoneMode?: () => void;
  onReorderBuckets: (startIndex: number, endIndex: number) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  buckets,
  activeBucketId,
  taskCountByBucket = {},
  onSelectBucket = () => {},
  isActiveMobileView = true,
  isDark = false,
  toggleDark = () => {},
  onToggleZoneMode = () => {},
  onReorderBuckets,
  onOpenSettings = () => {},
}: SidebarProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemRef = useRef<number | null>(null);
  return (
    <aside
      id="sidebar"
      aria-label="Life buckets navigation"
      className={[
        'flex-col h-full flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto',
        'w-full md:w-72',
        isActiveMobileView ? 'flex' : 'hidden md:flex'
      ].join(' ')}
    >
      {/* App branding & global actions */}
      <div className="px-6 pt-8 pb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8.5l3 3L13 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none tracking-tight">
              {t('app.title')}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('app.tagline')}</p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zone Mode */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            title="Enter Zone Mode"
            onClick={onToggleZoneMode}
          >
            <Zap size={14} />
            <span className="text-xs font-semibold">Focus</span>
          </button>
          
          {/* Dark Mode Toggle */}
          <button
            id="sidebar-dark-mode-toggle"
            type="button"
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-slate-100 dark:bg-slate-800" />

      {/* Bucket list */}
      <nav aria-label="Life buckets" className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          My Buckets
        </p>
        {buckets.map((bucket, index) => (
          <div
            key={bucket.id}
            draggable
            onDragStart={(e) => {
              draggedItemRef.current = index;
              setDraggedIndex(index);
              // Transparent drag image so it's less visually noisy, but standard DnD allows the ghost
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDragEnd={() => {
              setDraggedIndex(null);
              setDragOverIndex(null);
              draggedItemRef.current = null;
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedItemRef.current !== null && draggedItemRef.current !== index) {
                onReorderBuckets(draggedItemRef.current, index);
              }
              setDraggedIndex(null);
              setDragOverIndex(null);
              draggedItemRef.current = null;
            }}
            className={[
              'transition-all duration-200 rounded-xl relative',
              draggedIndex === index ? 'opacity-40' : 'opacity-100',
              dragOverIndex === index && draggedIndex !== index ? 'bg-slate-100 dark:bg-slate-800/80 scale-[1.02]' : ''
            ].join(' ')}
          >
            <CategoryCard
              bucket={bucket}
              taskCount={taskCountByBucket[bucket.id] ?? 0}
              isActive={activeBucketId === bucket.id}
              onClick={onSelectBucket}
            />
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] text-slate-300 dark:text-slate-600 text-center">Stage 5 — Details &amp; Dark Mode</p>
      </div>
    </aside>
  );
}
