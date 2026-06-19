export interface Preferences {
  pomodoroWorkTime: number; // in minutes
  pomodoroBreakTime: number; // in minutes
  pushNotifications: boolean;
  soundEffects: boolean;
  defaultStartupView: 'main' | 'zone' | 'all' | 'today' | 'important';
  showEnergyLevel: boolean;
  showRepeat: boolean;
  showNotes: boolean;
  isGoogleCalendarConnected?: boolean;
  mockGoogleLists?: string[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  pomodoroWorkTime: 25,
  pomodoroBreakTime: 5,
  pushNotifications: false,
  soundEffects: false,
  defaultStartupView: 'main',
  showEnergyLevel: true,
  showRepeat: true,
  showNotes: true,
  isGoogleCalendarConnected: false,
  mockGoogleLists: [],
};
