export const TICK_SOUND = "/sounds/tick.mp3";
export const CHIME_SOUND = "/sounds/chime.mp3";

export function playSound(type: 'tick' | 'chime', isEnabled: boolean) {
  if (!isEnabled) return;
  
  try {
    const audio = new Audio(type === 'tick' ? TICK_SOUND : CHIME_SOUND);
    audio.play().catch(() => {
      // Fail silently and gracefully without throwing console errors
      // Prepares the app so the user can simply drop their preferred .mp3 files
    });
  } catch (e) {
    // Fail silently
  }
}
