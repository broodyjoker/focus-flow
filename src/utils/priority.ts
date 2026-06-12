import type { Task } from '../models';

export type PriorityValue = 'high' | 'medium' | 'low' | 'none';

export const PRIORITY_META: Record<PriorityValue, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  high: {
    label: 'High',
    icon: '🔥',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700'
  },
  medium: {
    label: 'Medium',
    icon: '⭐️',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  low: {
    label: 'Low',
    icon: '🧊',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/30',
    borderColor: 'border-sky-300 dark:border-sky-700'
  },
  none: {
    label: 'None',
    icon: '',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-white dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700'
  }
};

const PRIORITY_WEIGHT: Record<PriorityValue, number> = {
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

/**
 * Sort tasks by priority: high -> medium -> low -> none.
 * Note: Should only be applied to arrays of siblings (tasks with the same parent)
 * to prevent breaking the nested tree structure.
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const wA = PRIORITY_WEIGHT[a.priority as PriorityValue] ?? 4;
    const wB = PRIORITY_WEIGHT[b.priority as PriorityValue] ?? 4;
    return wA - wB;
  });
}
