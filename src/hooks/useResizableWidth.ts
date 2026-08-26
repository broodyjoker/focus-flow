import { useState, useCallback, useEffect, useRef } from 'react';

export function useResizableWidth(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
  }, [width]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing.current) {
        const delta = e.clientX - startX.current;
        const newWidth = Math.min(Math.max(startWidth.current + delta, minWidth), maxWidth);
        setWidth(newWidth);
      }
    },
    [minWidth, maxWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return { width, startResizing };
}
