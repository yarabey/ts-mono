import { useMemo, useState } from 'react';
import { usePattern } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import {
  eventLabel,
  formatDuration,
  formatTime,
  type PatternEvent,
  patternColor,
  PATTERN_EVENT_COLORS,
  today,
} from '@acme/baby-bot-domain';
import styles from './Pattern.module.css';

const SHORT_DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

const LEGEND: { type: string; label: string }[] = [
  { type: 'sleep', label: 'Сон' },
  { type: 'feeding', label: 'Кормление' },
  { type: 'diaper', label: 'Подгузник' },
  { type: 'pumping', label: 'Сцеживание' },
  { type: 'walk', label: 'Прогулка' },
  { type: 'bath', label: 'Купание' },
  { type: 'mood', label: 'Настроение' },
  { type: 'weight', label: 'Вес' },
];

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

interface PositionedBar {
  event: PatternEvent;
  leftPct: number;
  widthPct: number;
}

export function Pattern() {
  const [date, setDate] = useState(today());
  const { data, isLoading } = usePattern(date);
  const events = useMemo(() => data?.events ?? [], [data]);
  const isToday = date === today();

  const hours = useMemo(() => {
    const result: { hour: number; items: PositionedBar[] }[] = [];
    for (let h = 0; h < 24; h++) {
      const items: PositionedBar[] = [];
      for (const e of events) {
        const start = e.started_at || e.occurred_at;
        const end = e.ended_at;
        const startHour = new Date(start).getHours();
        const endHour = end ? new Date(end).getHours() : startHour;
        if (h >= startHour && h <= endHour) {
          const startMin = new Date(start).getMinutes();
          const endMin = end ? new Date(end).getMinutes() : startMin;
          const leftPct = h === startHour ? (startMin / 60) * 100 : 0;
          const rightPct = h === endHour ? ((60 - endMin) / 60) * 100 : 0;
          const widthPct = Math.max(100 - leftPct - rightPct, 3);
          items.push({ event: e, leftPct, widthPct });
        }
      }
      result.push({ hour: h, items });
    }
    return result;
  }, [events]);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Паттерн дня</h1>
      </div>

      <div className={styles.nav}>
        <button type="button" className={styles.navBtn} onClick={() => setDate(addDays(date, -1))}>
          ←
        </button>
        <button
          type="button"
          className={`${styles.navBtn} ${isToday ? styles.navBtnActive : ''}`}
          onClick={() => setDate(today())}
        >
          Сегодня
        </button>
        <button type="button" className={styles.navBtn} onClick={() => setDate(addDays(date, 1))}>
          →
        </button>
        <span className={styles.navDate}>{SHORT_DATE.format(new Date(`${date}T00:00:00`))}</span>
      </div>

      {isLoading ? (
        <div className={styles.chart}>
          <Skeleton height={240} />
        </div>
      ) : (
        <div className={styles.chart}>
          {hours.map(({ hour, items }) => (
            <div key={hour} className={styles.hourRow}>
              <span className={styles.hourLabel}>{String(hour).padStart(2, '0')}</span>
              <div className={styles.track}>
                {items.map((item, i) => (
                  <div
                    key={i}
                    className={styles.bar}
                    style={{
                      left: `${item.leftPct}%`,
                      width: `${item.widthPct}%`,
                      backgroundColor: patternColor(item.event.event_type),
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className={styles.legend}>
            {LEGEND.map((l) => (
              <span key={l.type} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: PATTERN_EVENT_COLORS[l.type as keyof typeof PATTERN_EVENT_COLORS] }}
                />
                {l.label}
              </span>
            ))}
          </div>

          <div className={styles.eventList}>
            {events.map((e, i) => (
              <div key={i} className={styles.eventRow}>
                <span className={styles.eventTime}>{formatTime(e.started_at || e.occurred_at)}</span>
                <span className={styles.eventDot} style={{ backgroundColor: patternColor(e.event_type) }} />
                <span>{eventLabel(e.event_type)}</span>
                {e.duration_min ? <span className={styles.eventDuration}>{formatDuration(e.duration_min)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
