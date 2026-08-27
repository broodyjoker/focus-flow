const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// 1. Inject the Close button in the header
const headerTarget = '<h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none tracking-tight">\n                {t(\'app.title\')}\n              </h1>\n            </div>\n          </div>';
const headerReplacement = headerTarget + '\n          <button onClick={onClose} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">\n            <X size={20} />\n          </button>';

if (code.includes(headerTarget) && !code.includes('<X size={20} />')) {
  code = code.replace(headerTarget, headerReplacement);
}

// 2. Replace the return block to restore mobile drawer and fix width px bug
const returnStart = code.indexOf('<aside\n        className="hidden md:flex');
const returnEnd = code.lastIndexOf('</aside>');

if (returnStart > -1 && returnEnd > -1) {
  const newReturn = `<aside
        className="hidden md:flex flex-col bg-white dark:bg-[#0b1120] border-r border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/40 z-10 flex-shrink-0 transition-colors h-full relative"
        style={{ width: \`\${width}px\` }}
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
      </AnimatePresence>`;

  code = code.substring(0, returnStart) + newReturn + code.substring(returnEnd + 8);
  fs.writeFileSync('src/components/Sidebar.tsx', code, 'utf8');
  console.log('Successfully restored Mobile Drawer and fixed width bug!');
} else {
  console.error('Could not locate return block!', returnStart, returnEnd);
}
