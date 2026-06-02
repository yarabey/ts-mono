import { useEffect } from 'react';
import { useUiStore } from './ui-store.js';
import styles from './Toaster.module.css';

/** Renders toasts from the UI store; each auto-dismisses after 3s. */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => removeToast(t.id), 3000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  if (!toasts.length) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`} onClick={() => removeToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
