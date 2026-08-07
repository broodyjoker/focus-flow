import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import type { Task, Preferences } from '../models';
import { isToday as checkIsToday, formatDueDate } from '../utils/dates';
import { TaskRow } from './TaskRow';
import { useSwipe } from '../utils/useSwipe';

interface CalendarViewProps {
  tasks: Task[];
  preferences: Preferences;
  onAddTask: (title: string, dueDate: Date) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (taskId: string) => void;
  onToggleTimer: (taskId?: string) => void;
  onClose?: () => void;
}

export function CalendarView({
  tasks,
  preferences,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSelectTask,
  onToggleTimer,
  onClose,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const swipeHandlers = useSwipe(undefined, onClose);

  // Move to previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Move to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get starting day of the week (0 = Sunday, 1 = Monday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  let firstDay = getFirstDayOfMonth(year, month);

  // Adjust for Monday start day
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to check if a date has tasks
  const tasksForDate = (date: Date) => {
    return tasks.filter((t) => {
      if (t.isCompleted || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === date.getFullYear() &&
             d.getMonth() === date.getMonth() &&
             d.getDate() === date.getDate();
    }).sort((a, b) => {
      // Sort by reminder time if exists
      if (a.reminderTime && b.reminderTime) {
        return new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime();
      }
      if (a.reminderTime) return -1;
      if (b.reminderTime) return 1;
      return 0;
    });
  };

  // Mock Google Calendar integration
  const hasMockGCalEvent = (day: number) => {
    if (!preferences.isGoogleCalendarConnected) return false;
    // Visually simulate events on a few random days derived from the month/day
    // Just a simple deterministic hash for visual layout testing
    return (year + month + day) % 7 === 0 || (year + month + day) % 11 === 0;
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    if (window.innerWidth < 768) {
      setIsMobileDrawerOpen(true);
    }
  };

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), selectedDate);
      setNewTaskTitle('');
    }
  };

  const selectedTasks = tasksForDate(selectedDate);

  const renderGrid = () => {
    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 md:h-24" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      const isToday = checkIsToday(date);
      const hasTasks = tasksForDate(date).length > 0;
      const hasGCal = hasMockGCalEvent(i);

      days.push(
        <button
          key={i}
          onClick={() => handleDayClick(i)}
          className={[
            'relative h-16 md:h-24 flex flex-col items-center justify-start pt-2 border border-slate-100/50 dark:border-slate-800/30 rounded-xl transition-all duration-200',
            isSelected ? 'bg-violet-50 dark:bg-violet-900/20 shadow-sm border-violet-200 dark:border-violet-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
            isToday ? 'ring-2 ring-violet-500/50 ring-offset-2 dark:ring-offset-slate-900' : ''
          ].join(' ')}
        >
          <span className={[
            'text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full',
            isSelected ? 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800/50' : 'text-slate-700 dark:text-slate-300',
            hasGCal && !isSelected ? 'ring-1 ring-sky-400 dark:ring-sky-500 ring-offset-1 dark:ring-offset-slate-900' : ''
          ].join(' ')}>
            {i}
          </span>
          <div className="mt-auto pb-2 flex items-center gap-1">
            {hasTasks && <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />}
            {hasGCal && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 dark:bg-sky-500" />}
          </div>
        </button>
      );
    }
    return days;
  };

  const tasksMenu = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0b1120] border-l border-slate-100 dark:border-slate-800/60 w-full">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        {checkIsToday(selectedDate) && (
          <span className="inline-block mt-1 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Today
          </span>
        )}
      </div>
      
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Plus size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder="Add task for this day..."
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {selectedTasks.length > 0 ? (
          selectedTasks.map(task => (
            <div key={task.id} className="relative group">
              <TaskRow
                task={task}
                isChild={false}
                hasChildren={false}
                isSelected={false}
                onOpenDetail={onSelectTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onToggleTimer={onToggleTimer}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-3">
              <CalendarIcon size={20} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No tasks scheduled</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add one above</p>
          </div>
        )}
        
        {/* Mock Google Calendar Events */}
        {hasMockGCalEvent(selectedDate.getDate()) && (
          <div className="mt-4 p-3 rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50 dark:bg-sky-900/10 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Mock Google Calendar Event</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">10:00 AM - 11:00 AM</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div {...swipeHandlers} className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-white dark:bg-[#0b1120] relative z-0">
      
      {/* ── Main Calendar Column ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <CalendarIcon className="text-violet-500" />
              {monthNames[month]} {year}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <ChevronRight size={20} />
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="ml-2 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center md:hidden"
                  aria-label="Close Calendar"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {renderGrid()}
          </div>
        </div>
      </div>

      {/* ── Desktop Right Column (Day's Menu) ───────────────────────────────── */}
      <div className="hidden md:flex flex-col w-80 lg:w-96 flex-shrink-0 z-10 shadow-[-8px_0_32px_rgba(0,0,0,0.02)] dark:shadow-[0]">
        {tasksMenu}
      </div>

      {/* ── Mobile Overlay Drawer ────────────────────────────────────────────── */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative h-[80vh] bg-white dark:bg-[#0b1120] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col transform transition-transform">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              {tasksMenu}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
