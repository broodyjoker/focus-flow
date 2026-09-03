const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const start = code.indexOf('const navigateBack = useCallback(() => {');
const end = code.indexOf('}, [activeParentId, tasks]);', start);
if (start > -1 && end > -1) {
  const replacement = "const navigateBack = useCallback(() => {\n" +
"    if (!activeParentId) return;\n" +
"    const activeParentTask = tasks.find(t => t.id === activeParentId);\n" +
"    setSlideDirection('back');\n\n" +
"    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;\n\n" +
"    if (isMobile) {\n" +
"      setSelectedTaskId(null);\n" +
"      setActiveParentId(activeParentTask?.parentId ?? null);\n" +
"      setMobileView('col2');\n" +
"    } else {\n" +
"      if (!activeParentTask?.parentId) {\n" +
"        setSelectedTaskId(null);\n" +
"        setActiveParentId(null);\n" +
"      } else {\n" +
"        setSelectedTaskId(activeParentId);\n" +
"        setActiveParentId(activeParentTask.parentId);\n" +
"      }\n" +
"    }\n" +
"  ";
  code = code.substring(0, start) + replacement + code.substring(end);
  fs.writeFileSync('src/App.tsx', code, 'utf8');
  console.log('Successfully replaced navigateBack');
} else {
  console.log('Could not find navigateBack', start, end);
}
