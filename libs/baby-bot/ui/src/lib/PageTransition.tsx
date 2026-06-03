import type { ReactNode } from 'react';
import styles from './PageTransition.module.css';

export type TransitionDirection = 'forward' | 'back' | 'none';

export interface PageTransitionProps {
  /** Changes per route so the animation restarts (typically the pathname). */
  transitionKey: string;
  /** Slide direction; `none` renders children without animating (tab switch). */
  direction: TransitionDirection;
  children: ReactNode;
}

/**
 * CSS slide transition between routes. Direction is computed by the app shell
 * (forward when navigating into a sub-screen, back when returning, none for
 * top-level tab switches) and passed in so this stays router-agnostic.
 */
export function PageTransition({ transitionKey, direction, children }: PageTransitionProps) {
  if (direction === 'none') return <>{children}</>;
  const cls = direction === 'forward' ? styles.forward : styles.back;
  return (
    <div className={cls} key={transitionKey}>
      {children}
    </div>
  );
}
