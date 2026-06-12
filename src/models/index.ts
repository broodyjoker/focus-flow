// ─────────────────────────────────────────────────────────────────────────────
// src/models/index.ts  — barrel export
// Import from here so consumer code stays clean and import paths are stable
// even if internal file names change.
// ─────────────────────────────────────────────────────────────────────────────

export type { Task, EnergyLevel } from './task.types';
export { LIFE_BUCKETS, getBucketById } from './buckets.constants';
export type { LifeBucket } from './buckets.constants';
export type { Preferences } from './preferences';
export { DEFAULT_PREFERENCES } from './preferences';
