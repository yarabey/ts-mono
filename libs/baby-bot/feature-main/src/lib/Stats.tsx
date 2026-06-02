import { useState } from 'react';
import { useStats } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import { formatDuration } from '@acme/baby-bot-domain';
import styles from './screens.module.css';

const PERIODS: Array<{ id: string; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];

export function Stats() {
  const [period, setPeriod] = useState('week');
  const { data, isLoading } = useStats(period);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Статистика</h1>
      </div>
      <div className={styles.row}>
        {PERIODS.map((p) => (
          <button key={p.id} className={`${styles.chip} ${period === p.id ? styles.chipActive : ''}`} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton height={120} />
      ) : (
        <>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Кормление</div>
            <div className={styles.statGrid}>
              <Stat label="Всего" value={data.feedings.total} />
              <Stat label="Молоко" value={`${data.feedings.total_ml} мл`} />
              <Stat label="Интервал" value={data.feedings.avg_interval_min ? `${data.feedings.avg_interval_min}м` : '—'} />
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Сон</div>
            <div className={styles.statGrid}>
              <Stat label="Всего" value={formatDuration(data.sleep.total_duration_min)} />
              <Stat label="Ночной" value={formatDuration(data.sleep.night_min)} />
              <Stat label="Дневной" value={formatDuration(data.sleep.nap_min)} />
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Прочее</div>
            <div className={styles.statGrid}>
              <Stat label="Подгузники" value={data.diapers.total} />
              <Stat label="Сцеживание" value={`${data.pumping.total_amount_ml} мл`} />
              <Stat label="Баланс молока" value={`${data.milk_balance.remaining_ml} мл`} />
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Бодрствование</div>
            <div className={styles.statGrid}>
              <Stat label="Сейчас" value={data.wake_window.current_min ? `${data.wake_window.current_min}м` : '—'} />
              <Stat label="Среднее" value={data.wake_window.avg_min ? `${data.wake_window.avg_min}м` : '—'} />
              <Stat label="Норма" value={`${data.wake_window.recommended_max}м`} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
