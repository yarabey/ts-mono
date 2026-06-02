import { useEffect, useState } from 'react';
import { LoadingButton } from './LoadingButton.js';
import styles from './Timer.module.css';

export interface TimerProps {
  label: string;
  startedAt: string;
  onStop?: () => void;
  stopping?: boolean;
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function Timer({ label, startedAt, onStop, stopping }: TimerProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));

  return (
    <div className={styles.timer}>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.elapsed}>{formatElapsed(elapsed)}</div>
      </div>
      {onStop && (
        <LoadingButton variant="danger" loading={stopping} onClick={onStop}>
          Стоп
        </LoadingButton>
      )}
    </div>
  );
}
