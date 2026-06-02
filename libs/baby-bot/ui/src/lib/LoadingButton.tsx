import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner.js';
import styles from './LoadingButton.module.css';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  children: ReactNode;
}

export function LoadingButton({ loading, variant = 'primary', children, disabled, ...rest }: LoadingButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${styles.btn} ${styles[variant]} ${rest.className ?? ''}`}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  );
}
