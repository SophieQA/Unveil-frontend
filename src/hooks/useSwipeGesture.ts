import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum swipe distance (px)
  restraint?: number; // Max vertical deviation (px)
  allowedTime?: number; // Max swipe time (ms)
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    restraint = 100,
    allowedTime = 500,
  } = options;

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchEndTime = Date.now();

      const distX = touchEndX - touchStartX.current;
      const distY = touchEndY - touchStartY.current;
      const elapsedTime = touchEndTime - touchStartTime.current;

      // Check swipe threshold
      if (elapsedTime <= allowedTime) {
        if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
          if (distX < 0) {
            // Swipe left
            onSwipeLeft?.();
          } else {
            // Swipe right
            onSwipeRight?.();
          }
        }
      }
    },
    [onSwipeLeft, onSwipeRight, threshold, restraint, allowedTime]
  );

  // Handle trackpad gestures (macOS)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Detect horizontal scroll (two-finger trackpad)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        
        // deltaX > 0 means swipe left (scroll right)
        // deltaX < 0 means swipe right (scroll left)
        if (Math.abs(e.deltaX) > 10) { // Threshold to avoid accidental triggers
          if (e.deltaX > 0) {
            onSwipeLeft?.();
          } else {
            onSwipeRight?.();
          }
        }
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  useEffect(() => {
    const element = document.documentElement;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchEnd, handleWheel]);
}
