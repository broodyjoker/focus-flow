// ─────────────────────────────────────────────────────────────────────────────
// Life Buckets — the 10 category constants
//
// Keeping IDs as kebab-case strings (not emoji-based) makes them safe to use
// as CSS class names, localStorage keys, URL params, and i18n message keys.
// ─────────────────────────────────────────────────────────────────────────────

export interface LifeBucket {
  /** Stable programmatic key — never changes even if the label is translated. */
  id: string;

  /**
   * i18n message key. A translation function can look this up:
   * `t(bucket.labelKey)` → localised string.
   * Falls back to `defaultLabel` when no translation is available.
   */
  labelKey: string;

  /** English default label (emoji + name). Used before i18n is wired up. */
  defaultLabel: string;

  /** Single emoji character that acts as a quick visual cue. */
  emoji: string;

  /**
   * Accent colour in HSL (passed to CSS custom properties).
   * Chosen to be distinct, accessible, and work on both light and dark
   * backgrounds.
   */
  accentHsl: string;
}

export const LIFE_BUCKETS: LifeBucket[] = [
  {
    id: 'career-moves',
    labelKey: 'bucket.careerMoves',
    defaultLabel: '💼 Career Moves',
    emoji: '💼',
    accentHsl: '221 83% 53%', // vibrant blue
  },
  {
    id: 'daily-quests',
    labelKey: 'bucket.dailyQuests',
    defaultLabel: '🌅 Daily Quests',
    emoji: '🌅',
    accentHsl: '34 100% 50%', // sunrise amber
  },
  {
    id: 'brain-food',
    labelKey: 'bucket.brainFood',
    defaultLabel: '🧠 Brain Food',
    emoji: '🧠',
    accentHsl: '262 80% 58%', // deep violet
  },
  {
    id: 'wealth-engine',
    labelKey: 'bucket.wealthEngine',
    defaultLabel: '💰 Wealth Engine',
    emoji: '💰',
    accentHsl: '142 71% 45%', // emerald green
  },
  {
    id: 'mind-body',
    labelKey: 'bucket.mindBody',
    defaultLabel: '🧘🏻‍♀️ Mind & Body',
    emoji: '🧘🏻‍♀️',
    accentHsl: '330 80% 54%', // soft rose
  },
  {
    id: 'joy-play',
    labelKey: 'bucket.joyPlay',
    defaultLabel: '🎮 Joy & Play',
    emoji: '🎮',
    accentHsl: '16 100% 55%', // warm coral
  },
  {
    id: 'tribe-connect',
    labelKey: 'bucket.tribeConnect',
    defaultLabel: '🤝 Tribe & Connect',
    emoji: '🤝',
    accentHsl: '188 78% 41%', // teal
  },
  {
    id: 'home-base',
    labelKey: 'bucket.homeBase',
    defaultLabel: '🏠 Home Base',
    emoji: '🏠',
    accentHsl: '24 90% 50%', // terracotta
  },
  {
    id: 'passion-projects',
    labelKey: 'bucket.passionProjects',
    defaultLabel: '🚀 Passion Projects',
    emoji: '🚀',
    accentHsl: '210 100% 45%', // space blue
  },
  {
    id: 'someday-magic',
    labelKey: 'bucket.somedayMagic',
    defaultLabel: '✨ Someday Magic',
    emoji: '✨',
    accentHsl: '280 65% 60%', // dreamy lavender
  },
];

/** Lookup helper: find a bucket by its stable ID. */
export function getBucketById(id: string): LifeBucket | undefined {
  return LIFE_BUCKETS.find((b) => b.id === id);
}
