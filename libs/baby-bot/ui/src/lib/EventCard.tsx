import { type Event, eventIcon, eventLabel, eventSummary, formatTime } from '@acme/baby-bot-domain';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
  /** Makes the card body tappable (e.g. to open the editor). */
  onClick?: (event: Event) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  /** Close an active/ongoing event (shows a ✓ action). */
  onClose?: (event: Event) => void;
}

export function EventCard({ event, onClick, onEdit, onDelete, onClose }: EventCardProps) {
  return (
    <article className={styles.card}>
      <span className={styles.icon}>{event.raw_entry_emoji || eventIcon(event.event_type)}</span>
      <div
        className={styles.main}
        onClick={onClick ? () => onClick(event) : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <div className={styles.row}>
          <span className={styles.label}>{eventLabel(event.event_type)}</span>
          <span className={styles.time}>{formatTime(event.occurred_at)}</span>
        </div>
        <div className={styles.summary}>{eventSummary(event)}</div>
        {event.note && <div className={styles.note}>{event.note}</div>}
      </div>
      {(onEdit || onDelete || onClose) && (
        <div className={styles.actions}>
          {onClose && (
            <button className={styles.action} onClick={() => onClose(event)} aria-label="Закрыть событие">
              ✓
            </button>
          )}
          {onEdit && (
            <button className={styles.action} onClick={() => onEdit(event)} aria-label="Изменить">
              ✏️
            </button>
          )}
          {onDelete && (
            <button className={styles.action} onClick={() => onDelete(event)} aria-label="Удалить">
              🗑️
            </button>
          )}
        </div>
      )}
    </article>
  );
}
