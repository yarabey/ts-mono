import { useState } from 'react';
import { usePattern } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import { eventIcon, eventLabel, formatDuration, formatTime, today } from '@acme/baby-bot-domain';
import styles from './screens.module.css';

export function Pattern() {
  const [date, setDate] = useState(today());
  const { data, isLoading } = usePattern(date);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Режим дня</h1>
      </div>
      <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      {isLoading ? (
        <Skeleton height={200} />
      ) : data?.events.length ? (
        <div className={styles.list}>
          {data.events.map((e, i) => (
            <div key={i} className={styles.statCard} style={{ display: 'flex', gap: 12, textAlign: 'left', alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{eventIcon(e.event_type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{eventLabel(e.event_type)}</div>
                <div className={styles.statLabel}>
                  {formatTime(e.occurred_at)}
                  {e.duration_min ? ` · ${formatDuration(e.duration_min)}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Нет событий за этот день</div>
      )}
    </div>
  );
}
