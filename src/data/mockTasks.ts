// ─────────────────────────────────────────────────────────────────────────────
// src/data/mockTasks.ts
//
// Sample data used during development to verify the data model renders correctly.
// This file will be removed once real data persistence (localStorage / backend)
// is wired up in a later stage.
//
// Stage 4 demo tasks:
//   mock-001 — due today (shows violet badge + action tray)
//   mock-002 — routine with a PAST date → auto-expire useEffect resets it to Today
// ─────────────────────────────────────────────────────────────────────────────

import type { Task } from '../models';

// Helper: a Date set to N days ago (past midnight, time-agnostic)
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: today at midnight
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const MOCK_TASKS: Task[] = [
  {
    id: 'mock-001',
    title: 'Review Q3 project proposal',
    notes: 'Check the budget section and leave inline comments before EOD.',
    parentId: undefined,
    category: 'career-moves',
    priority: 'high',
    energyLevel: 'high',
    isRoutine: false,
    dueDate: today(), // Due today — demonstrates the violet badge + "Push to Tomorrow" snooze
    isCompleted: false,
  },
  {
    id: 'mock-002',
    title: 'Morning journal (10 min)',
    notes: 'Free-write, no rules.',
    parentId: undefined,
    category: 'mind-body',
    priority: 'medium',
    energyLevel: 'low',
    isRoutine: true,   // ← Routine flag
    dueDate: daysAgo(2), // 2 days ago → auto-expire useEffect rolls this to Today on load
    isCompleted: true,   // Was "done" yesterday → routine resets to false on load
  },
];
