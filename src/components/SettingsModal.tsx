import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, HardDrive, Timer, Bell, Download, Upload, Trash2, Plus, Edit2 } from 'lucide-react';
import type { Task, LifeBucket, Preferences } from '../models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  buckets: LifeBucket[];
  setBuckets: React.Dispatch<React.SetStateAction<LifeBucket[]>>;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}

type TabType = 'categories' | 'storage' | 'focus' | 'audio' | 'backup';

export function SettingsModal({
  isOpen,
  onClose,
  tasks,
  setTasks,
  buckets,
  setBuckets,
  preferences,
  setPreferences,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl h-[85vh] md:h-[75vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            
            {/* Sidebar Tabs */}
            <div className="w-full flex-shrink-0 flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 md:w-64 md:h-full md:flex-col md:border-b-0 md:border-r bg-slate-50 dark:bg-slate-800/60 p-4">
          <nav className="flex-1 flex flex-row md:flex-col gap-2">
            <TabButton 
              active={activeTab === 'categories'} 
              onClick={() => setActiveTab('categories')} 
              icon={<Folder size={18} />} 
              label="Categories" 
            />
            <TabButton 
              active={activeTab === 'storage'} 
              onClick={() => setActiveTab('storage')} 
              icon={<HardDrive size={18} />} 
              label="Storage & Files" 
            />
            <TabButton 
              active={activeTab === 'focus'} 
              onClick={() => setActiveTab('focus')} 
              icon={<Timer size={18} />} 
              label="Pomodoro & Focus" 
            />
            <TabButton 
              active={activeTab === 'audio'} 
              onClick={() => setActiveTab('audio')} 
              icon={<Bell size={18} />} 
              label="Notifications" 
            />
            <TabButton 
              active={activeTab === 'backup'} 
              onClick={() => setActiveTab('backup')} 
              icon={<Download size={18} />} 
              label="Backup & Restore" 
            />
          </nav>
            
          {/* PWA Install Button */}
          <AnimatePresence>
            {installPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-auto pt-4 md:mt-4 md:pt-4 border-t border-slate-200 dark:border-slate-700/50"
              >
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Install App ⬇️</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 active:scale-90"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8">
            {activeTab === 'categories' && <CategoriesTab buckets={buckets} setBuckets={setBuckets} tasks={tasks} />}
            {activeTab === 'storage' && <StorageTab tasks={tasks} setTasks={setTasks} />}
            {activeTab === 'focus' && <FocusTab preferences={preferences} setPreferences={setPreferences} />}
            {activeTab === 'audio' && <AudioTab preferences={preferences} setPreferences={setPreferences} />}
            {activeTab === 'backup' && <BackupTab tasks={tasks} buckets={buckets} preferences={preferences} setTasks={setTasks} setBuckets={setBuckets} setPreferences={setPreferences} onClose={onClose} />}
          </div>
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Tab Button Helper ────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 w-auto md:w-full flex-shrink-0',
        active 
          ? 'bg-indigo-500 text-white shadow-md' 
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Tabs Implementation (Placeholders for now) ───────────────────────────────

function CategoriesTab({ buckets, setBuckets, tasks }: any) {
  const [newEmoji, setNewEmoji] = useState('🌟');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmoji, setEditEmoji] = useState('');
  const [editName, setEditName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newBucket: LifeBucket = {
      id: `custom-${Date.now()}`,
      defaultLabel: `${newEmoji} ${newName.trim()}`,
      colorClass: 'bg-slate-100 text-slate-700',
    };
    setBuckets([...buckets, newBucket]);
    setNewName('');
    setNewEmoji('🌟');
  };

  const handleStartEdit = (b: LifeBucket) => {
    setEditingId(b.id);
    const parts = b.defaultLabel.split(' ');
    setEditEmoji(parts[0]);
    setEditName(parts.slice(1).join(' '));
  };

  const handleSaveEdit = (id: string) => {
    setBuckets(buckets.map((b: LifeBucket) => 
      b.id === id ? { ...b, defaultLabel: `${editEmoji} ${editName.trim()}` } : b
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const hasTasks = tasks.some((t: Task) => t.category === id);
    if (hasTasks) {
      if (!window.confirm('This category has tasks! Deleting it will leave them orphaned. Are you sure?')) return;
    }
    setBuckets(buckets.filter((b: LifeBucket) => b.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Categories</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your life buckets and spaces.</p>
        
        <form onSubmit={handleAdd} className="w-full flex flex-col gap-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="w-full flex flex-row gap-2 items-center">
            <input 
              type="text" 
              value={newEmoji} 
              onChange={e => setNewEmoji(e.target.value)} 
              className="w-12 flex-shrink-0 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2"
              maxLength={2}
            />
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="New Category Name..."
              className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Add
          </button>
        </form>

        <div className="space-y-2">
          {buckets.map((b: LifeBucket) => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group hover:border-violet-300 dark:hover:border-violet-700/50 transition-colors">
              {editingId === b.id ? (
                <div className="flex flex-1 gap-2 mr-2">
                  <input 
                    type="text" 
                    value={editEmoji} 
                    onChange={e => setEditEmoji(e.target.value)} 
                    className="w-12 text-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    maxLength={2}
                  />
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 text-sm text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">{b.defaultLabel}</span>
              )}
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId === b.id ? (
                  <button onClick={() => handleSaveEdit(b.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-sm font-medium">Save</button>
                ) : (
                  <>
                    <button onClick={() => handleStartEdit(b)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StorageTab({ tasks, setTasks }: any) {
  const handleSmartCleanup = () => {
    if (!window.confirm('This will permanently delete attachments from ALL completed tasks. Proceed?')) return;
    
    setTasks(tasks.map((t: Task) => 
      t.isCompleted && t.attachments && t.attachments.length > 0 
        ? { ...t, attachments: undefined } 
        : t
    ));
    alert('Smart Cleanup complete! Unnecessary storage has been freed.');
  };

  const allFiles = tasks.flatMap((t: Task) => 
    (t.attachments || []).map(a => ({ file: a, taskId: t.id, taskTitle: t.title }))
  );

  const handleDeleteFile = (taskId: string, fileId: string) => {
    if (!window.confirm('Delete this file permanently?')) return;
    setTasks(tasks.map((t: Task) => {
      if (t.id === taskId && t.attachments) {
        return { ...t, attachments: t.attachments.filter(a => a.id !== fileId) };
      }
      return t;
    }));
  };

  const totalStorageBytes = allFiles.reduce((acc, f) => acc + f.file.size, 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Storage & Files</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage heavy attachments and optimize IndexedDB space.</p>

        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl mb-8">
          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Smart Cleanup</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">Deletes attachments exclusively from completed tasks.</p>
          </div>
          <button 
            onClick={handleSmartCleanup}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Run Cleanup
          </button>
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex justify-between items-end">
            <span>Global File Manager</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Total: {totalStorageMB} MB</span>
          </h4>
          
          {allFiles.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
              No attachments found across any tasks.
            </div>
          ) : (
            <div className="space-y-2">
              {allFiles.map((item) => (
                <div key={item.file.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {item.file.type.startsWith('image/') ? (
                      <img src={item.file.dataUrl} alt="Thumbnail" className="w-10 h-10 object-cover rounded-md" />
                    ) : (
                      <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md flex items-center justify-center font-bold text-[10px]">PDF</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-200 truncate">{item.file.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB • In task: <span className="text-violet-600 dark:text-violet-400 font-medium">{item.taskTitle}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteFile(item.taskId, item.file.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Delete File"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableSegment({ value, onChange, min, max, isBreak = false }: { value: number, onChange: (v: any) => void, min: number, max: number, isBreak?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      
      onChange((prev: number) => {
        let newValue = prev + delta;
        if (max === 59) {
           newValue = ((newValue % 60) + 60) % 60; 
        } else {
           newValue = Math.max(min, Math.min(max, newValue));
        }
        return newValue;
      });
    };

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (el) {
        el.removeEventListener('wheel', handleWheel);
      }
    };
  }, [onChange, max, min]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.clientY;
    const deltaValue = Math.round(deltaY / 10);
    let newValue = startValueRef.current + deltaValue;
    
    if (max === 59) {
       newValue = ((newValue % 60) + 60) % 60; 
    } else {
       newValue = Math.max(min, Math.min(max, newValue));
    }
    
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const formattedTime = value.toString().padStart(2, '0');
  const colorClass = isBreak 
    ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
    : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]';

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`w-20 h-24 md:w-24 md:h-32 flex items-center justify-center bg-slate-800/40 backdrop-blur-lg border-t border-l border-white/10 border-b border-r border-black/50 rounded-2xl shadow-[inset_0_2px_15px_rgba(0,0,0,0.6),0_10px_20px_rgba(0,0,0,0.4)] touch-none cursor-ns-resize select-none transition-transform duration-75 ${isDragging ? 'scale-105' : ''}`}
    >
      <span className={`font-mono text-4xl md:text-5xl font-bold ${colorClass}`}>
        {formattedTime}
      </span>
    </div>
  );
}

function DualDraggableClock({ minutes, seconds, setMinutes, setSeconds, isBreak }: any) {
  const colonColor = isBreak 
    ? 'text-emerald-500/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
    : 'text-red-500/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';

  return (
    <div className="flex items-center justify-center gap-3">
      <DraggableSegment value={minutes} onChange={setMinutes} min={0} max={120} isBreak={isBreak} />
      <span className={`font-mono text-5xl font-bold pb-2 select-none ${colonColor}`}>:</span>
      <DraggableSegment value={seconds} onChange={setSeconds} min={0} max={59} isBreak={isBreak} />
    </div>
  );
}

function FocusTab({ preferences, setPreferences }: any) {
  const initialWorkMins = Math.floor(preferences.pomodoroWorkTime);
  const initialWorkSecs = Math.round((preferences.pomodoroWorkTime % 1) * 60);
  const initialBreakMins = Math.floor(preferences.pomodoroBreakTime);
  const initialBreakSecs = Math.round((preferences.pomodoroBreakTime % 1) * 60);

  const [workMinutes, setWorkMinutes] = useState(initialWorkMins);
  const [workSeconds, setWorkSeconds] = useState(initialWorkSecs);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMins);
  const [breakSeconds, setBreakSeconds] = useState(initialBreakSecs);
  const [toast, setToast] = useState('');

  const handleSave = () => {
    setPreferences({ 
      ...preferences, 
      pomodoroWorkTime: workMinutes + (workSeconds / 60), 
      pomodoroBreakTime: breakMinutes + (breakSeconds / 60) 
    });
    setToast('Settings saved successfully!');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Pomodoro & Focus</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Customize your deep work intervals.</p>
        
        <div className="w-full flex flex-col items-center justify-center text-center">
          <div className="space-y-10 max-w-sm w-full">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide text-center">Work Time</label>
            <DualDraggableClock 
              minutes={workMinutes} setMinutes={setWorkMinutes}
              seconds={workSeconds} setSeconds={setWorkSeconds}
            />
            <p className="text-[10px] text-slate-500 mt-4 text-center uppercase tracking-widest font-medium opacity-70">Drag blocks up/down</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide text-center">Short Break</label>
            <DualDraggableClock 
              minutes={breakMinutes} setMinutes={setBreakMinutes}
              seconds={breakSeconds} setSeconds={setBreakSeconds}
              isBreak={true}
            />
            <p className="text-[10px] text-slate-500 mt-4 text-center uppercase tracking-widest font-medium opacity-70">Drag blocks up/down</p>
          </div>
          
          <button 
            onClick={handleSave}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            Save Settings
          </button>
          
          {toast && (
            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium text-center animate-fade-in">
              {toast}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioTab({ preferences, setPreferences }: any) {
  const isDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  const togglePush = async () => {
    if (isDenied) return;
    if (!preferences.pushNotifications) {
      if ('Notification' in window) {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          setPreferences({ ...preferences, pushNotifications: true });
        } else if (p === 'denied') {
          setPreferences({ ...preferences, pushNotifications: false });
        }
      } else {
        alert('Your browser does not support notifications.');
      }
    } else {
      setPreferences({ ...preferences, pushNotifications: false });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Notifications & Audio</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage how TaskZone alerts you.</p>

        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center">
          <div className="space-y-4 w-full text-left">
          <div className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl ${isDenied ? 'opacity-80' : ''}`}>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Push Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receive alerts when Pomodoro timers finish.</p>
              {isDenied && (
                <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1.5">Notifications are blocked by your browser. Please allow them in your site settings.</p>
              )}
            </div>
            <button 
              onClick={togglePush}
              disabled={isDenied}
              className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${isDenied ? 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed' : preferences.pushNotifications ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] left-[2px] transition-transform shadow-sm ${preferences.pushNotifications && !isDenied ? 'translate-x-full' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Sound Effects</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Play satisfying sounds when completing tasks.</p>
            </div>
            <button 
              onClick={() => setPreferences({ ...preferences, soundEffects: !preferences.soundEffects })}
              className={`w-11 h-6 rounded-full transition-colors relative ${preferences.soundEffects ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] left-[2px] transition-transform shadow-sm ${preferences.soundEffects ? 'translate-x-full' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function BackupTab({ tasks, buckets, preferences, setTasks, setBuckets, setPreferences, onClose }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const backup = { tasks, buckets, preferences, version: 1 };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskzone-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Importing will overwrite ALL your current tasks, categories, and settings. This cannot be undone. Proceed?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.tasks && parsed.buckets) {
          setTasks(parsed.tasks);
          setBuckets(parsed.buckets);
          if (parsed.preferences) setPreferences(parsed.preferences);
          alert('Backup restored successfully!');
          onClose(); // Close modal on success
        } else {
          alert('Invalid backup file. Missing tasks or buckets array.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse backup JSON. File may be corrupted.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Backup & Restore</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Export your offline database or restore from a JSON file.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download size={24} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Export Data</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">Download your entire IndexedDB state (tasks, attachments, buckets, settings) into a single portable JSON file.</p>
            <button 
              onClick={handleExport}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Download Backup
            </button>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-center relative overflow-hidden group hover:border-violet-300 dark:hover:border-violet-700/50 transition-colors">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={24} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Import Data</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">Restore your state from a previous JSON backup. <strong className="text-rose-500 dark:text-rose-400">Warning:</strong> Overwrites current data!</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Select JSON File
            </button>
            <input 
              type="file" 
              accept=".json"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
