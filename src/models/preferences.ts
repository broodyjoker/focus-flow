export interface Preferences {
  pomodoroWorkTime: number; // in minutes
  pomodoroBreakTime: number; // in minutes
  pushNotifications: boolean;
  soundEffects: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  pomodoroWorkTime: 25,
  pomodoroBreakTime: 5,
  pushNotifications: false,
  soundEffects: false,
};
