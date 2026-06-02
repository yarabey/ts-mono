import styles from './QuickButtons.module.css';

export interface QuickButtonsProps {
  onQuickFeeding: () => void;
  onQuickDiaper: () => void;
  onAddNote: () => void;
  onStartTimer: () => void;
}

export function QuickButtons({ onQuickFeeding, onQuickDiaper, onAddNote, onStartTimer }: QuickButtonsProps) {
  return (
    <div className={styles.grid}>
      <button className={styles.btn} onClick={onQuickFeeding}>
        <span className={styles.icon}>🍼</span>Кормление
      </button>
      <button className={styles.btn} onClick={onQuickDiaper}>
        <span className={styles.icon}>🧷</span>Подгузник
      </button>
      <button className={styles.btn} onClick={onStartTimer}>
        <span className={styles.icon}>⏱️</span>Таймер
      </button>
      <button className={styles.btn} onClick={onAddNote}>
        <span className={styles.icon}>📝</span>Заметка
      </button>
    </div>
  );
}
