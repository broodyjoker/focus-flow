// SortableTaskRow — thin wrapper that hooks useSortable into TaskRow.
// Keep this separate so TaskRow stays pure and usable in non-sortable contexts
// (e.g. completed-tasks section, smart views).
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskRow } from "./TaskRow";
import type { Task } from "../models";

interface SortableTaskRowProps {
  task: Task;
  isSelected?: boolean;
  isDimmed?: boolean;
  hasChildren?: boolean;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  onOpenDetail: (id: string) => void;
  isAtMaxDepth?: boolean;
  onSwipeDeeper?: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onToggleTimer?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SortableTaskRow(props: SortableTaskRowProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        {...props}
        dndSetNodeRef={undefined} // ref already on wrapper div
        dndListeners={listeners}
        dndAttributes={attributes}
        isDragging={isDragging}
      />
    </div>
  );
}
