import { eventIcon, eventLabel } from '@acme/baby-bot-domain';
import { impactLight } from './haptics.js';
import styles from './QuickButtons.module.css';

export interface QuickButtonsProps {
  /** Ordered, already-filtered event types to render as quick buttons. */
  types: string[];
  /** Invoked with the chosen type (app navigates to the add screen). */
  onSelect: (type: string) => void;
}

/** Configurable 4-column quick-action grid (one button per event type). */
export function QuickButtons({ types, onSelect }: QuickButtonsProps) {
  return (
    <div className={styles.grid}>
      {types.map((type) => (
        <button
          key={type}
          type="button"
          className={styles.btn}
          onClick={() => {
            impactLight();
            onSelect(type);
          }}
        >
          <span className={styles.icon}>{eventIcon(type)}</span>
          <span className={styles.caption}>{eventLabel(type)}</span>
        </button>
      ))}
    </div>
  );
}
