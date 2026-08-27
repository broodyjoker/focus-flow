const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const dndImports = "import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core';\nimport { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';\nimport { CSS } from '@dnd-kit/utilities';\nimport { createPortal } from 'react-dom';\n";
code = code.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\n" + dndImports);

const sortableComp = `
function SortableBucket({ bucket, taskCount, isActive, onClick, onMoveUp, onMoveDown, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bucket.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 99 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...(!isMobile ? attributes : {})} {...(!isMobile ? listeners : {})}>
      <CategoryCard bucket={bucket} taskCount={taskCount} isActive={isActive} onClick={onClick} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
    </div>
  );
}
`;
code = code.replace('export function Sidebar(', sortableComp + 'export function Sidebar(');

code = code.replace('const [draggedIndex, setDraggedIndex] = useState<number | null>(null);', 'const [activeDragId, setActiveDragId] = useState<string | null>(null);');
code = code.replace('const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);', 'const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));');
code = code.replace('const draggedItemRef = useRef<number | null>(null);', '');

const navStart = code.indexOf('<nav aria-label="Life buckets"');
const navEnd = code.indexOf('</nav>', navStart);

const newNav = `
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
`;

if (navStart > -1) {
  code = code.substring(0, navStart) + newNav.trim() + code.substring(navEnd + 6);
  fs.writeFileSync('src/components/Sidebar.tsx', code, 'utf8');
  console.log('Sidebar.tsx patched successfully.');
} else {
  console.error('Could not find nav tags');
}
