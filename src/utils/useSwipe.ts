import { useState, type TouchEvent } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 40,
  /** If true, right-swipe only fires when the touch started within edgeZone px of the left edge.
   *  This prevents task-row horizontal swipes from triggering page-level back navigation. */
  edgeOnly: boolean = false,
  edgeZone: number = 40,
): SwipeHandlers {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    setStartPos({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!startPos) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = startPos.x - endX;
    const deltaY = Math.abs(startPos.y - endY);

    // Only trigger if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX < 0 && onSwipeRight) {
        // Edge guard: only fire the right-swipe (back) callback if the gesture
        // started near the left edge of the screen — never from the middle.
        if (!edgeOnly || startPos.x <= edgeZone) {
          onSwipeRight();
        }
      }
    }
    setStartPos(null);
  };

  return { onTouchStart, onTouchEnd };
}
