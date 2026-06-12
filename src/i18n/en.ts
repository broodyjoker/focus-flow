// ─────────────────────────────────────────────────────────────────────────────
// src/i18n/en.ts  — English (default) locale strings
//
// Structure:
//   • Keys are dot-namespaced strings that map to the labelKey fields in
//     LIFE_BUCKETS and any future UI copy.
//   • Values are plain strings. Interpolation slots use {variable} syntax so
//     a future i18n library (e.g. react-i18next, LinguiJS) can adopt them
//     without mass refactoring.
// ─────────────────────────────────────────────────────────────────────────────

const en: Record<string, string> = {
  // ── App shell ─────────────────────────────────────────────────────────────
  'app.title': 'Focus Flow',
  'app.tagline': 'One task at a time.',

  // ── Life Buckets ──────────────────────────────────────────────────────────
  'bucket.careerMoves': '💼 Career Moves',
  'bucket.dailyQuests': '🌅 Daily Quests',
  'bucket.brainFood': '🧠 Brain Food',
  'bucket.wealthEngine': '💰 Wealth Engine',
  'bucket.mindBody': '🧘🏻‍♀️ Mind & Body',
  'bucket.joyPlay': '🎮 Joy & Play',
  'bucket.tribeConnect': '🤝 Tribe & Connect',
  'bucket.homeBase': '🏠 Home Base',
  'bucket.passionProjects': '🚀 Passion Projects',
  'bucket.somedayMagic': '✨ Someday Magic',

  // ── Task card labels ───────────────────────────────────────────────────────
  'task.priority': 'Priority',
  'task.energy.low': 'Low energy',
  'task.energy.high': 'High energy',
  'task.routine': 'Routine',
  'task.completed': 'Completed',
  'task.dueDate': 'Due',

  // ── Empty states ──────────────────────────────────────────────────────────
  'bucket.empty': 'No tasks yet. Add one!',
};

export default en;
