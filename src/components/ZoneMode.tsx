import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, LogOut, Plus, Trash2, Menu, X } from 'lucide-react';
import type { Task } from '../models';

interface ZoneModeProps {
  activeFocusTaskId: string | null;
  tasks: Task[];
  pomodoroSeconds: number;
  isTimerRunning: boolean;
  timerMode: 'work' | 'shortBreak' | 'longBreak';
  onToggleTimer: (taskId?: string) => void;
  onResetTimer: () => void;
  onExitZone: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onSelectFocusTask: (taskId: string) => void;
}

function ZoneTaskSideDrawer({
  isOpen,
  onClose,
  zoneTasks,
  activeFocusTaskId,
  onSelectFocusTask,
  onUpdateTask
}: {
  isOpen: boolean;
  onClose: () => void;
  zoneTasks: Task[];
  activeFocusTaskId: string | null;
  onSelectFocusTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1010] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl z-[1020] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Focus Queue</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {zoneTasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-10">Queue is empty</p>
          ) : (
            zoneTasks.map((t) => {
              const isActive = activeFocusTaskId === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => {
                    onSelectFocusTask(t.id);
                    onClose();
                  }}
                  className={[
                    'w-full text-left relative p-3 rounded-xl border transition-all duration-200 group block',
                    isActive 
                      ? 'bg-violet-900/40 border-violet-500 ring-1 ring-violet-500/50 shadow-md' 
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
                  ].join(' ')}
                >
                  <div className="pr-8">
                    <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {t.title}
                    </h3>
                    <p className={`text-[10px] uppercase tracking-wider line-clamp-1 ${isActive ? 'text-violet-300' : 'text-slate-500'}`}>
                      {t.category}
                    </p>
                  </div>
                  
                  <div 
                    className="absolute top-1.5 right-1.5 opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onUpdateTask(t.id, { inZone: false });
                      if (isActive) {
                        const others = zoneTasks.filter(zt => zt.id !== t.id);
                        if (others.length > 0) onSelectFocusTask(others[0].id);
                      }
                    }}
                    title="Remove from Zone"
                  >
                    <Trash2 size={14} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export function ZoneMode({
  activeFocusTaskId,
  tasks,
  pomodoroSeconds,
  isTimerRunning,
  timerMode,
  onToggleTimer,
  onResetTimer,
  onExitZone,
  onUpdateTask,
  onSelectFocusTask,
}: ZoneModeProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTask = activeFocusTaskId ? tasks.find((t) => t.id === activeFocusTaskId) : null;
  const zoneTasks = tasks.filter(t => t.inZone && !t.isCompleted);
  const availableTasks = tasks.filter(t => !t.inZone && !t.isCompleted);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-[1000] flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <ZoneTaskSideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        zoneTasks={zoneTasks} 
        activeFocusTaskId={activeFocusTaskId} 
        onSelectFocusTask={onSelectFocusTask} 
        onUpdateTask={onUpdateTask} 
      />

      {/* Fixed Minimalist Header */}
      <div className="fixed top-0 left-0 w-full flex items-center justify-between p-4 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
            title="Focus Queue"
          >
            <Menu size={24} />
          </button>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
              title="Add Task to Zone"
            >
              <Plus size={24} />
            </button>
            
            {isAddMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-2">
                {availableTasks.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400 text-center">No tasks available</div>
                ) : (
                  availableTasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onUpdateTask(t.id, { inZone: true });
                        setIsAddMenuOpen(false);
                        // Auto-open drawer to show it was added if they want, but let's keep it silent
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-violet-600 hover:text-white transition-colors flex flex-col"
                    >
                      <span className="font-semibold line-clamp-1">{t.title}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 uppercase tracking-wider">{t.category}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onExitZone}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <LogOut size={16} />
          <span className="text-sm font-semibold">Exit Zone</span>
        </button>
      </div>

      {/* Main Content - Clean and Empty Below Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 pt-16">
        
        {/* Active Task Title */}
        <div className="mb-8 text-center max-w-3xl">
          <p className="text-sm font-bold tracking-widest uppercase text-violet-500 mb-4">
            {timerMode === 'work' ? 'Deep Work' : 'Break Time'}
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            {activeTask ? activeTask.title : 'Select a task from the menu'}
          </h1>
        </div>

        {/* Huge Timer Display */}
        <div className="text-[100px] md:text-[140px] font-bold font-mono tracking-tighter text-slate-100 leading-none mb-12 tabular-nums drop-shadow-[0_0_25px_rgba(255,255,255,0.1)]">
          {formatTime(pomodoroSeconds)}
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onResetTimer}
            title="Reset Timer"
            className="w-14 h-14 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <RotateCcw size={24} />
          </button>
          
          <button
            type="button"
            onClick={() => onToggleTimer(activeFocusTaskId || undefined)}
            className={[
              'w-24 h-24 flex items-center justify-center rounded-full transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              isTimerRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_40px_rgba(124,58,237,0.3)]'
            ].join(' ')}
          >
            {isTimerRunning ? (
              <Pause size={40} className="fill-current" />
            ) : (
              <Play size={40} className="fill-current ml-2" />
            )}
          </button>

          <div className="w-14 h-14" />
        </div>

      </div>
    </div>
  );
}
