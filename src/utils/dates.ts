// ─────────────────────────────────────────────────────────────────────────────
// src/utils/dates.ts — Date helpers for guilt-free scheduling
//
// Principles:
//   • All comparisons strip the time component (compare days, not milliseconds)
//   • Past dates are NEVER labeled "Overdue" — just shown neutrally
//   • "Someday" = clearing dueDate (undefined)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a copy of the date with hours/minutes/seconds/ms zeroed. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today at midnight — the reference point for all comparisons. */
export function getToday(): Date {
  return startOfDay(new Date());
}

/** Tomorrow at midnight. */
export function getTomorrow(): Date {
  const d = getToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/** True if the given date falls on today (time-agnostic). */
export function isToday(date: Date): boolean {
  return startOfDay(date).getTime() === getToday().getTime();
}

/** True if the given date falls on tomorrow (time-agnostic). */
export function isTomorrow(date: Date): boolean {
  return startOfDay(date).getTime() === getTomorrow().getTime();
}

/**
 * True if the date is strictly before today.
 * Used ONLY for styling — never for "overdue" labels.
 */
export function isPast(date: Date): boolean {
  return startOfDay(date).getTime() < getToday().getTime();
}

/**
 * Human-readable label for a due date.
 * Never returns "Overdue" — past dates are shown with a neutral date string.
 */
export function formatDueDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';

  const dayDiff = Math.round(
    (startOfDay(date).getTime() - getToday().getTime()) / (1000 * 60 * 60 * 24),
  );

  // Within the current week: show weekday name
  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Past or far future: short date (e.g. "Jun 3") — neutral, no alarm language
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Semantic color token for a due date badge.
 *   'today'   → violet (action-oriented, positive)
 *   'soon'    → indigo (upcoming)
 *   'neutral' → slate gray (past OR far future — no anxiety)
 */
export type DueDateColor = 'today' | 'soon' | 'neutral';

export function getDueDateColor(date: Date): DueDateColor {
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'soon';
  return 'neutral';
}
