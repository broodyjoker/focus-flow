import { useEffect } from 'react';
import type { Task, Preferences } from '../models';
import { sendNotification } from './notifications';
import { playSound } from './audio';

export function useReminders(
  tasks: Task[],
  preferences: Preferences,
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
) {
  useEffect(() => {
    // Run the check every 30 seconds
    const interval = setInterval(() => {
      const now = new Date();
      // Zero out seconds/milliseconds to match just the minute portion
      now.setSeconds(0, 0);
      const nowTime = now.getTime();

      tasks.forEach((task) => {
        if (!task.isCompleted && task.reminderTime && !task.reminderTriggered) {
          const reminderDate = new Date(task.reminderTime);
          reminderDate.setSeconds(0, 0);

          // If the reminder time is exactly now or in the past (and hasn't triggered yet)
          if (reminderDate.getTime() <= nowTime) {
            // Trigger!
            sendNotification('Reminder: ' + task.title, 'It is time to start your task.', preferences.pushNotifications);
            playSound('chime', preferences.soundEffects);
            
            // Mark as triggered so it doesn't spam
            onUpdateTask(task.id, { reminderTriggered: true });
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks, preferences, onUpdateTask]);
}
