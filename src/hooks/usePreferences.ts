// =============================================================================
// usePreferences.ts
//
// Manages all user preferences (dark mode, default startup view, pomodoro
// settings, sound effects, etc.) and their persistence to IndexedDB.
//
// WHY A SEPARATE HOOK?
//   Preferences are read by almost every component (dark mode, sound effects,
//   pomodoro timings) but change very rarely. Isolating them here means a
//   preference change ONLY re-renders components that actually consume this
//   hook, instead of re-rendering the entire App tree.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import type { Preferences } from '../models';
import { DEFAULT_PREFERENCES } from '../models';
import { loadData, saveData } from '../utils/db';

// =============================================================================
// RETURN TYPE
// =============================================================================

export interface UsePreferencesReturn {
  // The full preferences object. Treat this as read-only outside the hook.
  preferences: Preferences;

  // Replace the entire preferences object at once.
  // Used by SettingsModal when the user saves all settings together.
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;

  // Convenience updater — merges a partial update into the current preferences.
  // Use this for single-field updates (e.g., toggling sound effects).
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;

  // Dark mode as a first-class boolean — kept separate from preferences so the
  // <html> class can be toggled synchronously without waiting for a re-render.
  isDark: boolean;
  toggleDark: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * usePreferences
 *
 * Loads preferences from IndexedDB once on mount (the `isDbLoaded` flag from
 * the parent signals when it's safe to call this). Persists any change back
 * to IndexedDB automatically via a `useEffect` sync watcher.
 *
 * @param isDbLoaded  True once the parent's DB init sequence has finished.
 *                    Prevents writing default values over real saved data.
 */
export function usePreferences(isDbLoaded: boolean): UsePreferencesReturn {

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Start with the compile-time defaults so the UI renders immediately.
  // The DB load useEffect will overwrite these with real saved values.
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  // Dark mode lives in localStorage (synchronous) so it can be applied
  // immediately on first paint without waiting for IndexedDB.
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      // localStorage may be blocked in some browsers — fail silently.
      return false;
    }
  });

  // ---------------------------------------------------------------------------
  // SYNC: Apply the dark class to <html> whenever isDark changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // ---------------------------------------------------------------------------
  // SYNC: Persist preferences to IndexedDB whenever they change.
  // The `isDbLoaded` guard is critical — without it, the very first render
  // would write DEFAULT_PREFERENCES to the DB before we've read the real data.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDbLoaded) {
      saveData('preferences', preferences);
    }
  }, [preferences, isDbLoaded]);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /** Toggle between light and dark mode. */
  const toggleDark = useCallback(() => setIsDark(d => !d), []);

  /**
   * Update a single preference key without touching the rest.
   * Example: updatePreference('soundEffects', false)
   */
  const updatePreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    preferences,
    setPreferences,
    updatePreference,
    isDark,
    toggleDark,
  };
}
