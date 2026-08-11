import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, HardDrive, Timer, Bell, Download, Upload, Trash2, Plus, Edit2, Settings2, Link, Cloud, Database, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Task, LifeBucket, Preferences } from '../models';
import { DEFAULT_PREFERENCES } from '../models';
import { useSwipe } from '../utils/useSwipe';

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

type TabType = 'general' | 'categories' | 'storage' | 'focus' | 'audio' | 'backup' | 'connected';

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
  const [activeTab, setActiveTab] = useState<TabType>('general');
  // BeforeInstallPromptEvent is a non-standard browser API without official TS types;
  // we use `unknown` and cast on use to avoid an unsafe `any`.
  const [installPrompt, setInstallPrompt] = useState<unknown>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    // Cast to the non-standard BeforeInstallPromptEvent interface
    const prompt = installPrompt as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const swipeHandlers = useSwipe(undefined, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div 
            {...swipeHandlers}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl h-[85vh] md:h-[75vh] flex flex-row bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            
            {/* ── Mobile: Address-Book vertical icon strip ─────────────────────── */}
            <div className="md:hidden flex-shrink-0 flex flex-col w-14 h-full bg-slate-100 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700/50">
              <nav className="flex-1 flex flex-col gap-0.5 py-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {([
                  { id: 'general',   icon: <Settings2 size={18} />, label: 'General' },
                  { id: 'categories',icon: <Folder    size={18} />, label: 'Categories' },
                  { id: 'storage',   icon: <HardDrive size={18} />, label: 'Storage & Files' },
                  { id: 'focus',     icon: <Timer     size={18} />, label: 'Pomodoro & Focus' },
                  { id: 'audio',     icon: <Bell      size={18} />, label: 'Notifications' },
                  { id: 'backup',    icon: <Download  size={18} />, label: 'Backup & Restore' },
                  { id: 'connected', icon: <Link      size={18} />, label: 'Connected Services' },
                ] as { id: TabType; icon: React.ReactNode; label: string }[]).map(({ id, icon, label }) => {
                  const active = activeTab === id;
                  return (
                    <div
                      key={id}
                      className={[
                        'relative mx-1',
                        active
                          // Active: same bg as content panel, no right border, bleeds in
                          ? 'z-10 -mr-px bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 border-r-0 rounded-l-2xl rounded-r-none'
                          // Inactive: slightly darker, left-rounded tabs
                          : 'z-0 rounded-l-xl rounded-r-none hover:bg-white/60 dark:hover:bg-slate-700/40 transition-colors',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={active}
                        onClick={() => setActiveTab(id)}
                        className={[
                          'flex items-center justify-center w-full py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 active:scale-95',
                          active
                            ? 'text-violet-600 dark:text-violet-400'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                        ].join(' ')}
                      >
                        {icon}
                      </button>
                    </div>
                  );
                })}
              </nav>

              {/* PWA install (icon only on mobile strip) */}
              {installPrompt && (
                <button
                  onClick={handleInstallClick}
                  title="Install App"
                  aria-label="Install App"
                  className="flex items-center justify-center w-full py-3 mb-3 text-violet-500 hover:text-violet-700 active:scale-95 transition-colors"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            {/* ── Desktop: wide sidebar with icons + labels ─────────────────────── */}
            <div className="hidden md:flex flex-col w-64 flex-shrink-0 h-full border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
              <nav className="flex-1 flex flex-col gap-2">
                <TabButton active={activeTab === 'general'}   onClick={() => setActiveTab('general')}   icon={<Settings2 size={18} />} label="General" />
                <TabButton active={activeTab === 'categories'}onClick={() => setActiveTab('categories')} icon={<Folder    size={18} />} label="Categories" />
                <TabButton active={activeTab === 'storage'}   onClick={() => setActiveTab('storage')}   icon={<HardDrive size={18} />} label="Storage & Files" />
                <TabButton active={activeTab === 'focus'}     onClick={() => setActiveTab('focus')}     icon={<Timer     size={18} />} label="Pomodoro & Focus" />
                <TabButton active={activeTab === 'audio'}     onClick={() => setActiveTab('audio')}     icon={<Bell      size={18} />} label="Notifications" />
                <TabButton active={activeTab === 'backup'}    onClick={() => setActiveTab('backup')}    icon={<Download  size={18} />} label="Backup & Restore" />
                <TabButton active={activeTab === 'connected'} onClick={() => setActiveTab('connected')} icon={<Link      size={18} />} label="Connected Services" />
              </nav>

              <AnimatePresence>
                {installPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700/50"
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
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white dark:bg-slate-900">
          {/* Close button — visible on all sizes now that mobile header is removed */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 active:scale-90 z-20"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pt-12 md:p-8 md:pt-8">
            {activeTab === 'general' && <GeneralTab preferences={preferences} setPreferences={setPreferences} />}
            {activeTab === 'categories' && <CategoriesTab buckets={buckets} setBuckets={setBuckets} tasks={tasks} />}
            {activeTab === 'storage' && <StorageTab tasks={tasks} setTasks={setTasks} />}
            {activeTab === 'focus' && <FocusTab preferences={preferences} setPreferences={setPreferences} />}
            {activeTab === 'audio' && <AudioTab preferences={preferences} setPreferences={setPreferences} />}
            {activeTab === 'backup' && <BackupTab tasks={tasks} buckets={buckets} preferences={preferences} setTasks={setTasks} setBuckets={setBuckets} setPreferences={setPreferences} onClose={onClose} />}
            {activeTab === 'connected' && <ConnectedTab preferences={preferences} setPreferences={setPreferences} buckets={buckets} setBuckets={setBuckets} />}
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

// ── Tabs Implementation ──────────────────────────────────────────────────────

function GeneralTab({ preferences, setPreferences }: { preferences: Preferences, setPreferences: React.Dispatch<React.SetStateAction<Preferences>> }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">General Preferences</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Customize your default startup view and UI.</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group hover:border-violet-300 dark:hover:border-violet-700/50 transition-colors">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Default Startup View</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Which view should open on startup</p>
            </div>
            <select
              value={preferences.defaultStartupView}
              onChange={(e) => setPreferences({ ...preferences, defaultStartupView: e.target.value as 'main' | 'zone' | 'today' | 'important' | 'all' })}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <option value="main">Main Categories</option>
              <option value="zone">Zone Mode</option>
              <option value="today">Today</option>
              <option value="important">Important</option>
              <option value="all">All Uncompleted</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Task Fields Visibility</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Hide optional fields from the task editor.</p>
        
        <div className="space-y-3">
          <div className="flex flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Energy Level</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show High/Low energy buttons</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={preferences.showEnergyLevel} onChange={(e) => setPreferences({ ...preferences, showEnergyLevel: e.target.checked })} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
            </label>
          </div>
          
          <div className="flex flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Repeat/Recurrence</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show routine and repeating options</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={preferences.showRepeat} onChange={(e) => setPreferences({ ...preferences, showRepeat: e.target.checked })} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
            </label>
          </div>
          
          <div className="flex flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Notes/Description</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show notes text area</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={preferences.showNotes} onChange={(e) => setPreferences({ ...preferences, showNotes: e.target.checked })} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab({ buckets, setBuckets, tasks }: { buckets: LifeBucket[], setBuckets: React.Dispatch<React.SetStateAction<LifeBucket[]>>, tasks: Task[] }) {
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
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(b.id); }}
                    className="w-12 text-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    maxLength={2}
                  />
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(b.id); }}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 text-sm text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">{b.defaultLabel}</span>
              )}
              
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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

function StorageTab({ tasks, setTasks }: { tasks: Task[], setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSmartCleanup = () => {
    if (!window.confirm('This will permanently delete attachments from ALL completed tasks. Proceed?')) return;
    
    setTasks(tasks.map((t: Task) => 
      t.isCompleted && t.attachments && t.attachments.length > 0 
        ? { ...t, attachments: undefined } 
        : t
    ));
    alert('Smart Cleanup complete! Unnecessary storage has been freed.');
  };

  const handleClearData = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    if (window.confirm("Are you absolutely sure? This will permanently delete all your tasks, categories, and settings. This cannot be undone.")) {
      // Clear IndexedDB — must match the DB_NAME in utils/db.ts
      indexedDB.deleteDatabase('TaskZoneDB');
      // Clear LocalStorage
      localStorage.clear();
      
      // Fallback reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      setConfirmDelete(false);
    }
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

        {/* Danger Zone */}
        <div className="border-t border-red-200/50 dark:border-red-900/30 pt-8 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-red-500" />
            <h4 className="text-lg font-bold text-red-600 dark:text-red-500">Danger Zone</h4>
          </div>
          <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-slate-100">Clear All Local Data</h5>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Permanently delete all tasks, categories, and settings. This will reset the app to factory defaults.
                </p>
              </div>
              <div className="flex flex-col sm:items-end w-full sm:w-auto">
                <button 
                  onClick={handleClearData}
                  onBlur={() => setConfirmDelete(false)}
                  className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all w-full sm:w-auto ${
                    confirmDelete 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-900/20' 
                      : 'border-2 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                  }`}
                >
                  {confirmDelete ? 'Click again to confirm delete' : 'Clear Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableSegment({ value, onChange, min, max, isBreak = false }: { value: number, onChange: (v: number) => void, min: number, max: number, isBreak?: boolean }) {
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

function DualDraggableClock({ minutes, seconds, setMinutes, setSeconds, isBreak }: { minutes: number, seconds: number, setMinutes: (v: number) => void, setSeconds: (v: number) => void, isBreak: boolean }) {
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

function FocusTab({ preferences, setPreferences }: { preferences: Preferences, setPreferences: React.Dispatch<React.SetStateAction<Preferences>> }) {
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

function AudioTab({ preferences, setPreferences }: { preferences: Preferences, setPreferences: React.Dispatch<React.SetStateAction<Preferences>> }) {
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

function BackupTab({ tasks, buckets, preferences, setTasks, setBuckets, setPreferences, onClose }: { tasks: Task[], buckets: LifeBucket[], preferences: Preferences, setTasks: React.Dispatch<React.SetStateAction<Task[]>>, setBuckets: React.Dispatch<React.SetStateAction<LifeBucket[]>>, setPreferences: React.Dispatch<React.SetStateAction<Preferences>>, onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync Mock States
  const [isDriveConnected, setIsDriveConnected] = useState(() => localStorage.getItem('isDriveConnected') === 'true');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(() => localStorage.getItem('isSupabaseConnected') === 'true');
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isConnectingSupabase, setIsConnectingSupabase] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    localStorage.setItem('isDriveConnected', String(isDriveConnected));
  }, [isDriveConnected]);

  useEffect(() => {
    localStorage.setItem('isSupabaseConnected', String(isSupabaseConnected));
  }, [isSupabaseConnected]);

  const handleConnectDrive = () => {
    if (isDriveConnected) {
      setIsDriveConnected(false);
      return;
    }
    setIsConnectingDrive(true);
    setTimeout(() => {
      setIsConnectingDrive(false);
      setIsDriveConnected(true);
      if (isSupabaseConnected) setIsSupabaseConnected(false);
    }, 1500);
  };

  const handleConnectSupabase = () => {
    if (isSupabaseConnected) {
      setIsSupabaseConnected(false);
      return;
    }
    setIsConnectingSupabase(true);
    setTimeout(() => {
      setIsConnectingSupabase(false);
      setIsSupabaseConnected(true);
      if (isDriveConnected) setIsDriveConnected(false);
    }, 1500);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
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
      setIsExporting(false);
    }, 1000);
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
        if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.buckets && Array.isArray(parsed.buckets)) {
          // Sanitize tasks to ensure they match current schema
          const sanitizedTasks = parsed.tasks.map((task: Record<string, unknown>) => ({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            recurrence: task.recurrence || (task.isRoutine ? 'daily' : 'none'),
            notes: task.notes || '',
            reminderTime: task.reminderTime || undefined,
            reminderTriggered: !!task.reminderTriggered,
          }));

          // Sanitize and deep merge preferences
          const sanitizedPreferences = {
            ...DEFAULT_PREFERENCES,
            ...preferences,
            ...(parsed.preferences || {}),
          };

          setTasks(sanitizedTasks);
          setBuckets(parsed.buckets);
          setPreferences(sanitizedPreferences);
          
          alert('Backup restored successfully!');
          onClose(); // Close modal on success
        } else {
          alert('Invalid backup file. Missing or invalid tasks/buckets array.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse backup JSON. File may be corrupted or invalid format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {(isDriveConnected || isSupabaseConnected) && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Cloud Sync Active via {isDriveConnected ? 'Google Drive' : 'Supabase'}
          </span>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Backup & Cloud Sync</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your data locally or securely sync it to the cloud.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download size={24} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Export Data</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">Download your entire IndexedDB state (tasks, attachments, buckets, settings) into a single portable JSON file.</p>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                isExporting
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-not-allowed'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
              }`}
            >
              {isExporting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                'Download Backup'
              )}
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

        <div className="border-t border-slate-200 dark:border-slate-800/60 pt-8">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Cloud Synchronization</h4>
          <div className="space-y-4">
            
            {/* Google Drive Card */}
            <div className={`p-5 rounded-2xl border ${isDriveConnected ? 'border-violet-300 dark:border-violet-700/50 bg-violet-50/50 dark:bg-violet-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120]'} transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDriveConnected ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <Cloud size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Google Drive Sync</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sync your data directly to your personal Google Drive app folder.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <button 
                    onClick={handleConnectDrive}
                    disabled={isConnectingDrive || isConnectingSupabase}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${
                      isConnectingDrive ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' :
                      isDriveConnected ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40' :
                      isSupabaseConnected ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' :
                      'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {isConnectingDrive ? (
                      <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
                    ) : isDriveConnected ? (
                      'Disconnect'
                    ) : (
                      'Connect Drive'
                    )}
                  </button>
                  {isDriveConnected && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 text-center sm:text-right w-full">
                      Status: Connected as user@gmail.com
                    </span>
                  )}
                  {(!isDriveConnected && isSupabaseConnected) && (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2 text-center sm:text-right w-full">
                      Supabase is currently active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Supabase Card */}
            <div className={`p-5 rounded-2xl border ${isSupabaseConnected ? 'border-violet-300 dark:border-violet-700/50 bg-violet-50/50 dark:bg-violet-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120]'} transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSupabaseConnected ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <Database size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Supabase Sync</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Securely sync your tasks to a fast, dedicated cloud database.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <button 
                    onClick={handleConnectSupabase}
                    disabled={isConnectingSupabase || isConnectingDrive}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${
                      isConnectingSupabase ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' :
                      isSupabaseConnected ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40' :
                      isDriveConnected ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' :
                      'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {isConnectingSupabase ? (
                      <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
                    ) : isSupabaseConnected ? (
                      'Disconnect'
                    ) : (
                      'Connect Supabase'
                    )}
                  </button>
                  {isSupabaseConnected && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 text-center sm:text-right w-full">
                      Status: Connected (Cloud Database Active)
                    </span>
                  )}
                  {(!isSupabaseConnected && isDriveConnected) && (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2 text-center sm:text-right w-full">
                      Google Drive is currently active
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectedTab({ preferences, setPreferences, buckets, setBuckets }: { preferences: Preferences, setPreferences: React.Dispatch<React.SetStateAction<Preferences>>, buckets: LifeBucket[], setBuckets: React.Dispatch<React.SetStateAction<LifeBucket[]>> }) {
  const isConnected = preferences.isGoogleCalendarConnected;
  const mockLists = ['Work', 'Personal', 'Family'];

  const toggleConnection = () => {
    setPreferences(prev => ({
      ...prev,
      isGoogleCalendarConnected: !prev.isGoogleCalendarConnected,
      mockGoogleLists: !prev.isGoogleCalendarConnected ? [] : prev.mockGoogleLists
    }));
  };

  const toggleList = (listName: string) => {
    setPreferences(prev => {
      const currentLists = prev.mockGoogleLists || [];
      const isSelected = currentLists.includes(listName);
      let newLists;
      if (isSelected) {
        newLists = currentLists.filter(l => l !== listName);
        // Clean up mock bucket
        setBuckets(b => b.filter(bucket => bucket.id !== `gcal-${listName.toLowerCase()}`));
      } else {
        newLists = [...currentLists, listName];
        // Create mock bucket
        setBuckets(b => [
          ...b,
          {
            id: `gcal-${listName.toLowerCase()}`,
            defaultLabel: `[GCal] ${listName}`,
            color: 'bg-sky-500',
            emoji: '📅'
          }
        ]);
      }
      return { ...prev, mockGoogleLists: newLists };
    });
  };

  // Notion Mock States
  const [isNotionConnected, setIsNotionConnected] = useState(() => localStorage.getItem('isNotionConnected') === 'true');
  const [isConnectingNotion, setIsConnectingNotion] = useState(false);
  const mockNotionDbs = ['Task Master DB', 'Life OS Tracker', 'Content Pipeline'];
  const [selectedNotionDbs, setSelectedNotionDbs] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('isNotionConnected', String(isNotionConnected));
  }, [isNotionConnected]);

  const handleConnectNotion = () => {
    if (isNotionConnected) {
      setIsNotionConnected(false);
      setSelectedNotionDbs([]);
      return;
    }
    setIsConnectingNotion(true);
    setTimeout(() => {
      setIsConnectingNotion(false);
      setIsNotionConnected(true);
    }, 1500);
  };

  const toggleNotionDb = (dbName: string) => {
    setSelectedNotionDbs(prev => 
      prev.includes(dbName) ? prev.filter(db => db !== dbName) : [...prev, dbName]
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Connected Services</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Integrate Focus Flow with your favorite tools.</p>
        
        <div className="space-y-4">
          {/* Google Calendar Card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Google Calendar</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isConnected ? 'Connected as user@gmail.com' : 'Sync your events to Focus Flow'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleConnection}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  isConnected 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40' 
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                ].join(' ')}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {isConnected && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Select Calendars to Sync</p>
                <div className="space-y-2">
                  {mockLists.map(list => {
                    const isSelected = (preferences.mockGoogleLists || []).includes(list);
                    return (
                      <label key={list} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleList(list)}
                          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{list}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selected calendars will appear as categories in your sidebar.
                </p>
              </div>
            )}
          </div>

          {/* Notion Integration Card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.459 4.208c-.742.15-1.05.51-1.05 1.14v13.626c0 .736.324 1.156 1.05 1.29l10.155 1.832c.677.105 1.217-.225 1.217-.99V7.126c0-.661-.406-1.127-1.036-1.232L4.459 4.208zM14.992 20.354l-8.916-1.606v-13.6l8.916 1.62v13.586zm5.55-15.01c.742-.15 1.05-.51 1.05-1.14V-9.42c0-.736-.324-1.156-1.05-1.29l-10.155-1.832c-.677-.105-1.217.225-1.217.99v13.98c0 .661.406 1.127 1.036 1.232l10.336 1.684z" transform="translate(0, 4)"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Notion</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isNotionConnected ? 'Status: Connected to Workspace' : 'Sync your tasks with your Notion databases and workspaces'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnectNotion}
                disabled={isConnectingNotion}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                  isConnectingNotion ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' :
                  isNotionConnected 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40' 
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                ].join(' ')}
              >
                {isConnectingNotion ? (
                  <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
                ) : isNotionConnected ? (
                  'Disconnect'
                ) : (
                  'Connect'
                )}
              </button>
            </div>

            {isNotionConnected && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Select Notion Database</p>
                <div className="space-y-2">
                  {mockNotionDbs.map(db => {
                    const isSelected = selectedNotionDbs.includes(db);
                    return (
                      <label key={db} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNotionDb(db)}
                          className="w-4 h-4 rounded text-slate-900 dark:text-white focus:ring-slate-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{db}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Databases map your Notion items directly into focus categories.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
