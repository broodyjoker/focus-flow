// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailDrawer — slide-in panel for viewing/editing all task properties
//
// Triggered by clicking a task's title in any column.
// Slides from the right over Column 3. Has a backdrop overlay.
//
// Controls exposed inside:
//   a) Due Date   — [Today] [Tomorrow] [Someday] quick chips
//   b) Routine    — toggle switch (isRoutine)
//   c) Energy     — [⚡ High] [🔋 Low] segmented control
//   d) Notes      — autosizing textarea for free-form brain dump
//   e) Attachments — placeholder UI (functionality wired later)
//
// Design principles:
//   • White-space heavy, no visual clutter
//   • Calming soft colors — no hard blacks
//   • Full dark mode (dark: classes throughout)
//   • Smooth slide-in / fade transition
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, CalendarCheck, CalendarPlus, CalendarX, Paperclip, Zap, Battery, Trash2, FileText, Bell, Copy, FolderInput, Plus } from 'lucide-react';
import type { Task, Attachment, Preferences, LifeBucket } from '../models';
import { formatDueDate, getToday, getTomorrow, isToday, isTomorrow } from '../utils/dates';
import { PRIORITY_META, type PriorityValue } from '../utils/priority';
import { useSwipe } from '../utils/useSwipe';
import { requestNotificationPermission } from '../utils/notifications';
import { SubTaskItem } from './SubTaskItem';

function RecursiveSubtaskNode({
  taskId,
  tasks,
  depth,
  onUpdate,
  onDelete,
  onAdd,
}: {
  taskId: string;
  tasks: Task[];
  depth: number;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAdd?: (title: string, parentId: string | null) => void;
}) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const children = tasks.filter((t) => t.parentId === taskId);

  return (
    <div style={{ marginLeft: depth > 0 ? '1.25rem' : '0' }}>
      <SubTaskItem
        task={task}
        onToggle={(id) => onUpdate(id, { isCompleted: !task.isCompleted })}
      />
      {children.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 border-l-2 border-slate-100 dark:border-slate-800/60 pl-2">
          {children.map((child) => (
            <RecursiveSubtaskNode
              key={child.id}
              taskId={child.id}
              tasks={tasks}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskDetailDrawerProps {
  task: Task | null;
  tasks?: Task[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  onAdd?: (title: string, parentId: string | null) => void;
  buckets: LifeBucket[];
  preferences: Preferences;
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-10 items-center rounded-full',
        'transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
        checked
          ? 'bg-emerald-400 dark:bg-emerald-500'
          : 'bg-slate-200 dark:bg-slate-700',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-300 ease-out',
          checked ? 'translate-x-5' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
      {children}
    </p>
  );
}

// ── Date chip button ───────────────────────────────────────────────────────────
function DateChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
        active
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function TaskDetailDrawer({
  task,
  tasks,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onAdd,
  buckets,
  preferences,
}: TaskDetailDrawerProps) {
  const [titleValue, setTitleValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const processedPromises = files.map((file) => {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise<Attachment | null>(async (resolve) => {
          try {
            // RULE 1: 30MB Limit with Override
            if (file.size > 30 * 1024 * 1024) {
              const confirm = window.confirm(
                'This file is larger than 30MB. Storing very large files locally might impact app performance. Do you still want to attach it?'
              );
              if (!confirm) {
                return resolve(null);
              }
            }

            // FileReader to get initial Data URL
            const initialDataUrl = await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = (ev) => res(ev.target?.result as string);
              reader.onerror = (err) => rej(err);
              reader.readAsDataURL(file);
            });

            let finalDataUrl = initialDataUrl;

            // RULE 2: Auto Image Compression
            if (file.type.startsWith('image/')) {
              finalDataUrl = await new Promise<string>((res, rej) => {
                const img = new Image();
                img.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height && width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Could not get canvas context');

                    ctx.drawImage(img, 0, 0, width, height);
                    res(canvas.toDataURL('image/jpeg', 0.7));
                  } catch (err) {
                    console.error('Canvas manipulation failed:', err);
                    rej(err);
                  }
                };
                img.onerror = (err) => {
                  console.error('Image load failed:', err);
                  rej(err);
                };
                img.src = initialDataUrl;
              });
            }

            resolve({
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: finalDataUrl,
            });
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            resolve(null);
          }
        });
      });

      const results = await Promise.all(processedPromises);
      const newAttachments = results.filter((a): a is Attachment => a !== null);

      if (newAttachments.length > 0) {
        onUpdate(task.id, {
          attachments: [...(task.attachments || []), ...newAttachments]
        });
      }
    } catch (error) {
      console.error('Error during file upload batch:', error);
    } finally {
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    if (!task) return;
    const updated = (task.attachments || []).filter((a) => a.id !== id);
    onUpdate(task.id, { attachments: updated });
  };

  // Sync local state when a different task opens
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitleValue(task.title);
      setNotesValue(task.notes ?? '');
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [notesValue]);

  // Flush local state on close
  const handleClose = useCallback(() => {
    if (task) {
      const updates: Partial<Task> = {};
      const trimmedTitle = titleValue.trim();
      if (trimmedTitle && trimmedTitle !== task.title) {
        updates.title = trimmedTitle;
      }
      if (notesValue !== (task.notes ?? '')) {
        updates.notes = notesValue.trim() || undefined;
      }
      if (Object.keys(updates).length > 0) {
        onUpdate(task.id, updates);
      }
    }
    setIsVisible(false);
    // Give exit animation time to complete
    setTimeout(onClose, 250);
  }, [task, titleValue, notesValue, onUpdate, onClose]);

  const swipeHandlers = useSwipe(undefined, handleClose);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  // Derived date state
  const dueToday = task?.dueDate ? isToday(task.dueDate) : false;
  const dueTomorrow = task?.dueDate ? isTomorrow(task.dueDate) : false;
  const hasDate = !!task?.dueDate;

  const currentReminderTime = task?.reminderTime
    ? (() => {
      const d = new Date(task.reminderTime);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    })()
    : '';

  const handleReminderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    const timeVal = e.target.value;
    if (!timeVal) {
      onUpdate(task.id, { reminderTime: undefined, reminderTriggered: false });
      return;
    }

    // Request permission if not granted
    const granted = await requestNotificationPermission();
    if (!granted) {
      alert('Notification permissions are required to set reminders.');
      return;
    }

    const [hours, minutes] = timeVal.split(':').map(Number);
    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    baseDate.setHours(hours, minutes, 0, 0);

    onUpdate(task.id, { reminderTime: baseDate.toISOString(), reminderTriggered: false });
  };

  if (!task) return null;

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        onClick={handleClose}
        className={[
          'fixed inset-0 z-40',
          'bg-black/5 dark:bg-black/40 backdrop-blur-[2px]',
          'transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* ── Drawer panel ───────────────────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        {...swipeHandlers}
        role="dialog"
        aria-label={`Details for "${task.title}"`}
        aria-modal="true"
        className={[
          'fixed top-0 right-0 bottom-0 z-50',
          'w-[380px] max-w-[92vw]',
          'flex flex-col',
          'bg-white dark:bg-[#0d1526]',
          'border-l border-slate-100/60 dark:border-slate-800/40',
          'shadow-[-8px_0_48px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_64px_rgba(0,0,0,0.6)]',
          // Slide and fade animation
          'transition-all duration-300 ease-out',
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        ].join(' ')}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-5 border-b border-slate-100/70 dark:border-slate-800/50 flex-shrink-0">
          {/* Completion toggle */}
          <button
            onClick={() => onUpdate(task.id, { isCompleted: !task.isCompleted })}
            aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={[
              'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
              'transition-all duration-300 active:scale-90',
              task.isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300 dark:border-slate-600 hover:border-violet-400',
            ].join(' ')}
          >
            {task.isCompleted && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Title */}
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              const trimmed = titleValue.trim();
              if (task && trimmed !== '' && trimmed !== task.title) {
                onUpdate(task.id, { title: trimmed });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="Task title"
            className={[
              'flex-1 min-w-0 bg-transparent border-none p-0 focus:ring-0',
              'text-base font-semibold leading-snug',
              task.isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100',
            ].join(' ')}
          />

          {/* Close button */}
          <button
            id="task-detail-close"
            onClick={handleClose}
            aria-label="Close details"
            className={[
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
              'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
              'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
            ].join(' ')}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">


          {/* ── Due Date ─────────────────────────────────────────────────────── */}
          <section aria-labelledby="section-due-date">
            <SectionLabel>
              <span id="section-due-date">📅 Due Date</span>
            </SectionLabel>
            <div className="flex flex-wrap gap-2">
              <DateChip
                active={dueToday}
                icon={CalendarCheck}
                label="Today"
                onClick={() => onUpdate(task.id, { dueDate: getToday() })}
              />
              <DateChip
                active={dueTomorrow}
                icon={CalendarPlus}
                label="Tomorrow"
                onClick={() => onUpdate(task.id, { dueDate: getTomorrow() })}
              />
              <div className="relative inline-block">
                <input
                  type="date"
                  className={[
                    'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10',
                    '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer'
                  ].join(' ')}
                  onChange={(e) => {
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      // Adjust for timezone offset to prevent date shifting
                      const userTimezoneOffset = d.getTimezoneOffset() * 60000;
                      onUpdate(task.id, { dueDate: new Date(d.getTime() + userTimezoneOffset) });
                    }
                  }}
                  value={task.dueDate ? new Date(task.dueDate.getTime() - task.dueDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                />
                <div className="relative z-0">
                  <DateChip
                    active={hasDate && !dueToday && !dueTomorrow}
                    icon={CalendarX}
                    label={hasDate && !dueToday && !dueTomorrow ? formatDueDate(task.dueDate!) : 'Someday'}
                    onClick={() => { }}
                  />
                </div>
              </div>
            </div>
            {hasDate && (
              <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Selected: <strong className="text-slate-700 dark:text-slate-200">{formatDueDate(task.dueDate!)}</strong>
                </span>
                <button
                  onClick={() => onUpdate(task.id, { dueDate: undefined })}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </section>

          {/* ── Reminders & Repeat ───────────────────────────────────────────── */}
          <section aria-labelledby="section-reminders-repeat" className="flex flex-col md:grid md:grid-cols-2 md:gap-4 gap-4">
            <div className="flex flex-col justify-end">
              <SectionLabel>
                <span id="section-reminders" className="flex items-center gap-1.5"><Bell size={12} /> Reminder</span>
              </SectionLabel>
              <div className="flex items-center gap-2 h-[38px]">
                <input
                  type="time"
                  value={currentReminderTime}
                  onChange={handleReminderChange}
                  className={[
                    'flex-1 px-3 py-2 rounded-xl text-[13px] font-medium h-full',
                    'bg-slate-50 dark:bg-slate-800/50',
                    'border border-slate-200 dark:border-slate-700/60',
                    'text-slate-700 dark:text-slate-300',
                    'focus:outline-none focus:ring-2 focus:ring-violet-400/50 transition-all duration-150 cursor-pointer',
                    '[&::-webkit-calendar-picker-indicator]:opacity-50 dark:[&::-webkit-calendar-picker-indicator]:invert'
                  ].join(' ')}
                />
                {task.reminderTime && (
                  <button
                    onClick={() => onUpdate(task.id, { reminderTime: undefined, reminderTriggered: false })}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {preferences?.showRepeat && (
              <div className="flex flex-col justify-end">
                <SectionLabel>
                  <span id="section-routine">🔄 Repeat</span>
                </SectionLabel>
                <div className="relative h-[38px]">
                  <select
                    value={task.recurrence || (task.isRoutine ? 'daily' : 'none')}
                    onChange={(e) => {
                      const opt = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
                      onUpdate(task.id, { recurrence: opt, isRoutine: opt !== 'none' });
                    }}
                    className={[
                      'w-full appearance-none px-3 py-2 rounded-xl text-[13px] font-medium h-full',
                      'bg-slate-50 dark:bg-slate-800/50',
                      'border border-slate-200 dark:border-slate-700/60',
                      'text-slate-700 dark:text-slate-300',
                      'focus:outline-none focus:ring-2 focus:ring-violet-400/50 transition-all duration-150 cursor-pointer',
                      'capitalize'
                    ].join(' ')}
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">From Calendar</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ── Priority ───────────────────────────────────────────────────────── */}
          <section aria-labelledby="section-priority">
            <SectionLabel>
              <span id="section-priority">Priority</span>
            </SectionLabel>
            <div className="flex flex-wrap gap-2">
              {(['high', 'medium', 'low', 'none'] as PriorityValue[]).map((pVal) => {
                const meta = PRIORITY_META[pVal];
                const isActive = task.priority === pVal;

                return (
                  <button
                    key={pVal}
                    onClick={() => onUpdate(task.id, { priority: pVal })}
                    aria-pressed={isActive}
                    className={[
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold',
                      'border transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                      isActive
                        ? `${meta.bgColor} ${meta.borderColor} ${meta.color}`
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50',
                    ].join(' ')}
                  >
                    {meta.icon && <span>{meta.icon}</span>}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Focus Mode ───────────────────────────────────────────────────── */}
          <section aria-labelledby="section-zone">
            <SectionLabel>
              <span id="section-zone">Focus Mode</span>
            </SectionLabel>
            <button
              onClick={() => onUpdate(task.id, { inZone: !task.inZone })}
              className={[
                'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border text-sm font-semibold',
                task.inZone
                  ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30'
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                {task.inZone ? 'In Focus Zone' : 'Send to Zone'}
              </span>
              {task.inZone && <span className="text-[10px] uppercase tracking-widest font-bold opacity-80 bg-black/20 px-2 py-0.5 rounded-full">Added</span>}
            </button>
          </section>

          {/* ── Energy Level ─────────────────────────────────────────────────── */}
          {preferences?.showEnergyLevel && (
            <section aria-labelledby="section-energy">
              <SectionLabel>
                <span id="section-energy">Energy Level</span>
              </SectionLabel>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    onUpdate(task.id, {
                      energyLevel: task.energyLevel === 'high' ? undefined : 'high',
                    })
                  }
                  aria-pressed={task.energyLevel === 'high'}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold',
                    'border transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    task.energyLevel === 'high'
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-amber-700 dark:hover:text-amber-400',
                  ].join(' ')}
                >
                  <Zap size={13} />
                  High Energy
                </button>

                <button
                  onClick={() =>
                    onUpdate(task.id, {
                      energyLevel: task.energyLevel === 'low' ? undefined : 'low',
                    })
                  }
                  aria-pressed={task.energyLevel === 'low'}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold',
                    'border transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                    task.energyLevel === 'low'
                      ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-sky-200 hover:text-sky-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-700 dark:hover:text-sky-400',
                  ].join(' ')}
                >
                  <Battery size={13} />
                  Low Energy
                </button>
              </div>
            </section>
          )}



          {/* ── Attachments ─────────────────────────────────────── */}
          <section aria-labelledby="section-attachments">
            <SectionLabel>
              <span id="section-attachments">Attachments</span>
            </SectionLabel>

            {/* Gallery UI */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {task.attachments.map((file) => (
                  <div key={file.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 aspect-square flex items-center justify-center">
                    {file.type.startsWith('image/') ? (
                      <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center p-2 text-center text-slate-400">
                        <FileText size={24} className="mb-1" />
                        <span className="text-[9px] line-clamp-2 truncate w-full">{file.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(file.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
            />
            <button
              id="task-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              className={[
                'flex items-center gap-2 w-full px-4 py-3 rounded-xl',
                'border-2 border-dashed',
                'text-[12px] font-semibold text-slate-400 dark:text-slate-500',
                'border-slate-200 dark:border-slate-700',
                'hover:border-violet-300 hover:text-violet-500',
                'dark:hover:border-violet-700 dark:hover:text-violet-400',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              ].join(' ')}
            >
              <Paperclip size={14} />
              Attach File or Photo
            </button>
          </section>

          {/* ── Notes ────────────────────────────────────────────────────────── */}
          {preferences?.showNotes && (
            <section aria-labelledby="section-notes" className="pt-2">
              <SectionLabel>
                <span id="section-notes">📝 Notes</span>
              </SectionLabel>
              <textarea
                ref={textareaRef}
                id="task-notes"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={() => {
                  if (notesValue !== (task.notes ?? '')) {
                    onUpdate(task.id, { notes: notesValue.trim() || undefined });
                  }
                }}
                placeholder="Add notes, links, or brain dumps..."
                className={[
                  'w-full min-h-[120px] resize-y px-0 py-2',
                  'text-[13px] leading-relaxed font-medium',
                  'text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500',
                  'bg-transparent border-none',
                  'outline-none focus:ring-0',
                ].join(' ')}
                spellCheck={false}
              />
            </section>
          )}

          {/* ── Subtasks ──────────────────────────────────────────────────────── */}
          {tasks && (
            <section aria-labelledby="section-subtasks" className="pt-2">
              <SectionLabel>
                <span id="section-subtasks">📋 Subtasks</span>
              </SectionLabel>
              <div className="mb-2">
                {tasks.filter(t => t.parentId === task.id).map(child => (
                  <RecursiveSubtaskNode
                    key={child.id}
                    taskId={child.id}
                    tasks={tasks}
                    depth={0}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onAdd={onAdd}
                  />
                ))}
              </div>
              {onAdd && (
                <button
                  onClick={() => {
                    const title = window.prompt('New subtask:');
                    if (title?.trim()) onAdd(title.trim(), task.id);
                  }}
                  className="flex items-center gap-2 text-[12px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                >
                  <Plus size={14} /> Add Subtask
                </button>
              )}
            </section>
          )}

          {/* ── Move & Duplicate Actions ─────────────────────────────────────── */}
          <section aria-labelledby="section-actions" className="pt-2">
            <SectionLabel>
              <span id="section-actions">⚙️ Task Actions</span>
            </SectionLabel>

            {/* Move to Category */}
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <FolderInput size={12} />
                Move to Category
              </label>
              <div className="relative">
                <select
                  id="task-move-category"
                  value={task.category}
                  onChange={(e) => onUpdate(task.id, { category: e.target.value })}
                  className={[
                    'w-full appearance-none px-3 py-2.5 pr-8 rounded-xl text-[13px] font-medium',
                    'bg-slate-50 dark:bg-slate-800/80',
                    'border border-slate-200 dark:border-slate-700/60',
                    'text-slate-700 dark:text-slate-200',
                    'focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60',
                    'transition-all duration-150 cursor-pointer',
                    'hover:border-violet-300 dark:hover:border-violet-700/50',
                  ].join(' ')}
                >
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.defaultLabel}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
            </div>

            {/* Duplicate Task */}
            <button
              id="task-duplicate-btn"
              type="button"
              onClick={() => {
                if (task) onDuplicate(task.id);
              }}
              className={[
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                'border border-slate-200 dark:border-slate-700/60',
                'text-[13px] font-medium text-slate-600 dark:text-slate-300',
                'bg-slate-50 dark:bg-slate-800/60',
                'hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700',
                'dark:hover:bg-violet-950/30 dark:hover:border-violet-700/50 dark:hover:text-violet-300',
                'transition-all duration-200 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              ].join(' ')}
            >
              <Copy size={14} />
              Duplicate Task
            </button>
          </section>

          {/* ── Danger Zone ────────────────────────────────────────────────────── */}
          <section aria-labelledby="section-danger-zone" className="pt-4">
            <button
              type="button"
              onClick={() => {
                if (task) {
                  onDelete(task.id);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200"
            >
              <Trash2 size={16} />
              Delete Task
            </button>
          </section>

          {/* ── Metadata footer ───────────────────────────────────────────────── */}
          <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-300 dark:text-slate-600">
              Category: {task.category} · Priority: {task.priority}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
