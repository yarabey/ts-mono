import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 24, label }: SpinnerProps) {
  return (
    <span className={styles.wrap} role="status" aria-label={label ?? 'Загрузка'}>
      <span className={styles.spinner} style={{ width: size, height: size }} />
    </span>
  );
}
