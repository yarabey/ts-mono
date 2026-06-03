import styles from './TimeInput.module.css';

export interface TimeInputProps {
  /** `HH:mm` value. */
  value: string;
  onChange: (value: string) => void;
}

/** Custom HH:mm time picker (native `<input type="time">`), styled to match. */
export function TimeInput({ value, onChange }: TimeInputProps) {
  return (
    <input
      type="time"
      className={styles.input}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
