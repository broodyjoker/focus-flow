// ─────────────────────────────────────────────────────────────────────────────
// Task Data Model
// All types live here so they can be imported across the app without circular
// dependencies. String literal unions are used instead of enums so they
// serialise cleanly to JSON and are easy to extend later.
// ─────────────────────────────────────────────────────────────────────────────

export type EnergyLevel = 'low' | 'high';

/**
 * An attached file, processed and stored as a base64 Data URL.
 */
export interface Attachment {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
  size: number;
}

/**
 * The canonical Task shape used throughout the application.
 * Optional fields are marked with `?` to avoid over-specifying at creation
 * time while still surfacing all ADHD-support attributes.
 */
export interface Task {
  /** Unique identifier (UUID or nanoid). */
  id: string;

  /** Short, scannable title shown in list views. */
  title: string;

  /** Longer free-text notes / brain-dump. Optional. */
  notes?: string;

  /**
   * Reference to a parent task ID. When set, this task is a "chunk" nested
   * under the parent — enabling the task-chunking ADHD strategy.
   */
  parentId?: string;

  /**
   * One of the 10 Life Bucket category IDs.
   * Uses the bucket `id` from LIFE_BUCKETS constant, e.g. "career-moves".
   */
  category: string;

  /**
   * Task priority level.
   * Scoped sorting: high -> medium -> low -> none (among siblings).
   */
  priority: 'high' | 'medium' | 'low' | 'none';

  /**
   * Estimated cognitive/physical demand required to complete the task.
   * Helps the user pick tasks that match their current capacity.
   */
  energyLevel?: EnergyLevel;

  /**
   * When true, the task is a recurring routine and should auto-reset or
   * auto-expire on a schedule (logic to be implemented in a later stage).
   */
  isRoutine: boolean;

  /** Optional target date for deadline-aware views. */
  dueDate?: Date;

  /** Completion state. */
  isCompleted: boolean;

  /** Processed file attachments stored locally. */
  attachments?: Attachment[];

  /** Whether the task is explicitly parked in the focus Zone. */
  inZone?: boolean;
}
