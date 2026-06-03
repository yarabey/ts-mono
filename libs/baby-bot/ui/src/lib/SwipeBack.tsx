import { useEffect, useRef } from 'react';

const EDGE_WIDTH = 25;
const THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.3;

export interface SwipeBackProps {
  /** Whether the left-edge back gesture is active (false on the root screen). */
  enabled: boolean;
  /** Invoked when a completed back-swipe is recognized. */
  onBack: () => void;
}

/**
 * Left-edge swipe-to-go-back gesture. Renders nothing; attaches passive touch
 * listeners to the document and calls {@link SwipeBackProps.onBack} once the
 * horizontal drag from the left edge passes the distance/velocity threshold.
 * Router wiring lives in the app shell so this stays presentational.
 */
export function SwipeBack({ enabled, onBack }: SwipeBackProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const tracking = useRef(false);
  const startTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (x > EDGE_WIDTH) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, select, a, [data-no-swipe]')) return;
      startX.current = x;
      startY.current = y;
      currentX.current = x;
      tracking.current = true;
      startTime.current = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - startX.current;
      const dy = Math.abs(y - startY.current);
      if (dx < 0 || dy > Math.abs(dx) * 1.5) {
        tracking.current = false;
        return;
      }
      currentX.current = x;
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const dx = currentX.current - startX.current;
      const dt = Date.now() - startTime.current;
      const velocity = dt > 0 ? dx / dt : 0;
      if (dx > THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        onBack();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onBack]);

  return null;
}
