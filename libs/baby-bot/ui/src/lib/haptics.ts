/**
 * Telegram WebApp haptic feedback with a silent no-op fallback when the API is
 * unavailable (desktop/dev/browser). Mirrors `baby-ai`'s `utils/haptics.ts`.
 */

interface HapticFeedbackApi {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged?: () => void;
}

function haptic(): HapticFeedbackApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: HapticFeedbackApi } } })
    .Telegram?.WebApp?.HapticFeedback;
}

export function impactLight(): void {
  try {
    haptic()?.impactOccurred?.('light');
  } catch {
    /* no-op */
  }
}

export function impactMedium(): void {
  try {
    haptic()?.impactOccurred?.('medium');
  } catch {
    /* no-op */
  }
}

export function notificationSuccess(): void {
  try {
    haptic()?.notificationOccurred?.('success');
  } catch {
    /* no-op */
  }
}

export function notificationError(): void {
  try {
    haptic()?.notificationOccurred?.('error');
  } catch {
    /* no-op */
  }
}

export function selectionChanged(): void {
  try {
    haptic()?.selectionChanged?.();
  } catch {
    /* no-op */
  }
}
