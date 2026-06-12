// ─────────────────────────────────────────────────────────────────────────────
// src/i18n/index.ts
//
// Minimal translation helper. Designed to be a drop-in shim that can be
// replaced by react-i18next or LinguiJS later without changing call sites.
//
// Usage:
//   import { t } from '@/i18n';
//   t('app.title')  // → "Focus Flow"
// ─────────────────────────────────────────────────────────────────────────────

import en from './en';

type LocaleMessages = Record<string, string>;

/** Currently active locale messages. Swap this reference to change language. */
let activeMessages: LocaleMessages = en;

/**
 * Translate a message key.
 * Falls back to the key itself so missing translations are immediately visible
 * in the UI rather than crashing the app.
 */
export function t(key: string, vars?: Record<string, string>): string {
  let message = activeMessages[key] ?? key;

  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
  }

  return message;
}

/**
 * Switch the active locale at runtime.
 * Call this before re-rendering the tree (e.g. inside a React state update).
 */
export function setLocale(messages: LocaleMessages): void {
  activeMessages = messages;
}

export { en };
