// ─────────────────────────────────────────────────────────────────────────────
// Sidebar component
//
// Left-hand navigation showing Smart Views and Life Buckets.
// Desktop: Statically visible pinned column (md:flex)
// Mobile: Overlay drawer with Framer Motion (hidden by default)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import type { LifeBucket } from '../models';
import { useSwipe } from '../utils/useSwipe';
import { CategoryCard } from './CategoryCard';
import { t } from '../i18n';
import { Sun, Moon, Zap, Settings, X, Calendar, Star, LayoutList, CalendarDays } from 'lucide-react';
import { useResizableWidth } from '../hooks/useResizableWidth';

interface SidebarProps {
  isActiveMobileView: boolean;
  onClose: () => void;
  buckets: LifeBucket[];
  activeBucketId?: string;
  activeSmartView?: 'all' | 'today' | 'tomorrow' | 'important' | null;
  taskCountByBucket?: Record<string, number>;
  onSelectBucket?: (bucketId: string) => void;
  onSelectSmartView?: (view: 'all' | 'today' | 'tomorrow' | 'important') => void;
  isDark?: boolean;
  toggleDark?: () => void;
  onToggleZoneMode?: () => void;
  onReorderBuckets: (startIndex: number, endIndex: number) => void;
  onSwapBuckets?: (id1: string, id2: string) => void;
  onOpenSettings?: () => void;
  onToggleCalendar?: () => void;
}


function SortableBucket({ bucket, taskCount, isActive, onClick, onMoveUp, onMoveDown, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bucket.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 99 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...(!isMobile ? attributes : {})} {...(!isMobile ? listeners : {})}>
      <CategoryCard bucket={bucket} taskCount={taskCount} isActive={isActive} onClick={onClick} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
    </div>
  );
}
export function Sidebar({
  isActiveMobileView,
  onClose,
  buckets,
  activeBucketId,
  activeSmartView,
  taskCountByBucket = {},
  onSelectBucket = () => {},
  onSelectSmartView = () => {},
  isDark = false,
  toggleDark = () => {},
  onToggleZoneMode = () => {},
  onReorderBuckets,
  onSwapBuckets,
  onOpenSettings = () => {},
  onToggleCalendar = () => {},
}: SidebarProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));
  
  const { width, startResizing } = useResizableWidth(288, 200, 600); // Default 288px (w-72)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const swipeHandlers = useSwipe(onClose, undefined);

  const smartViews = [
    { id: 'all', label: 'All Uncompleted', icon: LayoutList },
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'tomorrow', label: 'Tomorrow', icon: CalendarDays },
    { id: 'important', label: 'Important', icon: Star },
  ] as const;

  // The inner content of the sidebar, extracted to be rendered in both Mobile Drawer and Desktop Column
  const sidebarContent = (
    <>
      {/* Header & Global Actions */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5l3 3L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none tracking-tight">
                {t('app.title')}
              </h1>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95"
            title="Enter Zone Mode"
            onClick={() => {
              onToggleZoneMode();
              onClose();
            }}
          >
            <Zap size={14} />
            <span className="text-xs font-semibold">Focus</span>
          </button>
          
          <button
            type="button"
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleCalendar();
              onClose();
            }}
            className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-700/50 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95"
            title="Calendar"
          >
            <Calendar size={14} />
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {/* Smart Views */}
        <div className="mb-3 space-y-0.5">
          <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400/70 dark:text-slate-600">
            Smart Views
          </p>
          {smartViews.map((view) => (
            <button
              key={view.id}
              onClick={() => {
                onSelectSmartView(view.id);
                onClose();
              }}
              className={[
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                activeSmartView === view.id
                  ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              ].join(' ')}
            >
              <view.icon size={18} className={activeSmartView === view.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'} />
              <span className="text-sm">{view.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 h-px bg-slate-100 dark:bg-slate-800/80" />

        {/* Bucket list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={(e) => {
          setActiveDragId(null);
          const { active, over } = e;
          if (over && active.id !== over.id) {
            const oldIndex = buckets.findIndex(b => b.id === active.id);
            const newIndex = buckets.findIndex(b => b.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) onReorderBuckets(oldIndex, newIndex);
          }
        }}>
          <nav aria-label="Life buckets" className="space-y-0.5 relative">
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400/70 dark:text-slate-600">My Buckets</p>
            <SortableContext items={buckets.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {buckets.map((bucket, index) => (
                <SortableBucket
                  key={bucket.id}
                  bucket={bucket}
                  isMobile={isMobile}
                  taskCount={taskCountByBucket[bucket.id] ?? 0}
                  isActive={!activeSmartView && activeBucketId === bucket.id}
                  onClick={() => { onSelectBucket(bucket.id); onClose(); }}
                  onMoveUp={index > 0 ? () => onSwapBuckets?.(bucket.id, buckets[index - 1].id) : undefined}
                  onMoveDown={index < buckets.length - 1 ? () => onSwapBuckets?.(bucket.id, buckets[index + 1].id) : undefined}
                />
              ))}
            </SortableContext>
          </nav>
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
              {activeDragId ? (() => {
                const b = buckets.find(b => b.id === activeDragId);
                return b ? <div style={{ transform: 'scale(1.02)' }}><CategoryCard bucket={b} taskCount={taskCountByBucket[b.id] ?? 0} isActive={!activeSmartView && activeBucketId === b.id} onClick={() => {}} /></div> : null;
              })() : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Static Sidebar ────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col bg-white dark:bg-[#0b1120] border-r border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/40 z-10 flex-shrink-0 transition-colors h-full relative"
        style={{ width: `${width}px` }}
      >
        {sidebarContent}
        {/* Resize handle */}
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-violet-400/20 active:bg-violet-400/40 transition-colors z-50 translate-x-1/2"
        />
      </aside>

      {/* Mobile Overlay Sidebar */}
      <AnimatePresence>
        {isActiveMobileView && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-[320px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-[70] md:hidden flex flex-col shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
