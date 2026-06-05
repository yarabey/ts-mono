import styles from './TimeInput.module.css';

export interface DateInputProps {
  /** `YYYY-MM-DD` value. */
  value: string;
  onChange: (value: string) => void;
}

/** Custom date picker (native `<input type="date">`), styled to match TimeInput. */
export function DateInput({ value, onChange }: DateInputProps) {
  return (
    <input
      type="date"
      className={styles.input}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
