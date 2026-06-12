import { useState, type TouchEvent } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 40
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
    // This prevents triggering swipe when the user is simply scrolling down the list
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0 && onSwipeLeft) {
        onSwipeLeft(); // Swipe Right-to-Left
      } else if (deltaX < 0 && onSwipeRight) {
        onSwipeRight(); // Swipe Left-to-Right
      }
    }
    setStartPos(null);
  };

  return { onTouchStart, onTouchEnd };
}
