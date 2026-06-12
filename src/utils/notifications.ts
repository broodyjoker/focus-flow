export function sendNotification(title: string, body: string, isEnabled: boolean) {
  if (!isEnabled) return;
  
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (e) {
        console.warn('Failed to send push notification', e);
      }
    }
  }
}
