// ─────────────────────────────────────────────────────────────────────────────
// src/utils/depth.ts — Task depth utilities
//
// Single source of truth for depth logic used across columns and App.tsx.
//
// Depth definition (1-indexed):
//   Level 1 — root tasks (no parentId, directly in a bucket)
//   Level 2 — children of root tasks
//   …
//   Level 5 — maximum allowed depth (MAX_DEPTH)
//
// Tasks at Level MAX_DEPTH are "leaf nodes":
//   • No chevron / drill-down interaction
//   • Cannot have children added below them
//   • Clicking in Column 3 only toggles isCompleted
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';

/** The maximum nesting depth a task can reach. Hard-coded for ADHD clarity. */
export const MAX_DEPTH = 5;

/**
 * Returns the 1-based depth of a task in the hierarchy.
 *
 * Algorithm: walk up the parentId chain and count hops.
 * A root task (no parentId) returns 1.
 * A safety limit of MAX_DEPTH + 2 prevents infinite loops in corrupt data.
 *
 * @example
 *   getTaskDepth('task-uuid', tasks) // → 3 (root → parent → this task)
 */
export function getTaskDepth(taskId: string, tasks: Task[]): number {
  let depth = 1;
  let current = tasks.find((t) => t.id === taskId);

  while (current?.parentId) {
    depth++;
    current = tasks.find((t) => t.id === current!.parentId);
    if (depth > MAX_DEPTH + 2) break; // safety guard against circular references
  }

  return depth;
}

/**
 * Returns true when a task is at MAX_DEPTH and therefore cannot have children.
 * Convenience wrapper used in rendering logic to gate UI affordances.
 */
export function isLeafNode(taskId: string, tasks: Task[]): boolean {
  return getTaskDepth(taskId, tasks) >= MAX_DEPTH;
}

/** Finds the Level 1 root ancestor of a task. Returns the task itself if it has no parent. */
export function getRootAncestor(taskId: string, tasks: Task[]): Task | undefined {
  let current = tasks.find((t) => t.id === taskId);
  let depth = 1;

  while (current?.parentId) {
    const parent = tasks.find((t) => t.id === current!.parentId);
    if (!parent) break;
    current = parent;
    depth++;
    if (depth > MAX_DEPTH + 2) break; // safety guard
  }
  return current;
}

/** Recursively gathers all descendants (sub-tasks at any deep level) of a parent task. */
export function getAllDescendants(parentId: string, tasks: Task[]): Task[] {
  const children = tasks.filter((t) => t.parentId === parentId);
  if (children.length === 0) return [];
  
  let descendants = [...children];
  for (const child of children) {
    descendants = descendants.concat(getAllDescendants(child.id, tasks));
  }
  return descendants;
}
