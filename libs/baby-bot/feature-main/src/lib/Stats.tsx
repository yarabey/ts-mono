import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStats } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import { formatDuration } from '@acme/baby-bot-domain';
import styles from './Stats.module.css';

const PERIODS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

function Row({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`${styles.row} ${muted ? styles.muted : ''}`}>
      <span>{label}</span>
      <span className={strong ? styles.strong : ''}>{value}</span>
    </div>
  );
}

export function Stats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');
  const { data: stats, isLoading } = useStats(period);

  const f = stats?.feedings;
  const mlByType = f?.ml_by_type ?? {};

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Статистика</h1>
      </div>

      <div className={styles.periods}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`${styles.period} ${period === p.value ? styles.periodActive : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !stats ? (
        <div className={styles.sections}>
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
        </div>
      ) : (
        <div className={styles.sections}>
          <section>
            <div className={styles.sectionTitle}>Кормления</div>
            <div className={styles.card}>
              <Row label="Всего" value={stats.feedings.total} strong />
              <Row
                label="Грудь / Бутылочка / Прикорм"
                value={`${stats.feedings.by_type.breast || 0} / ${stats.feedings.by_type.bottle || 0} / ${stats.feedings.by_type.solid || 0}`}
                muted
              />
              {stats.feedings.avg_interval_min != null && (
                <Row label="Средний интервал" value={formatDuration(stats.feedings.avg_interval_min)} muted />
              )}
              {stats.feedings.total_duration_min > 0 && (
                <Row label="Общее время" value={formatDuration(stats.feedings.total_duration_min)} muted />
              )}
              {stats.feedings.total_ml > 0 && <Row label="Всего выпито" value={`${stats.feedings.total_ml} мл`} muted />}
              {Object.keys(mlByType).length > 0 && (
                <Row
                  label="Грудь / Бутылочка / Прикорм / Вода"
                  value={`${mlByType.breast || 0} / ${mlByType.bottle || 0} / ${mlByType.solid || 0} / ${mlByType.water || 0}`}
                  muted
                />
              )}
            </div>
          </section>

          <section>
            <div className={styles.sectionTitle}>Сцеживание</div>
            <div className={styles.card}>
              <Row label="Всего" value={stats.pumping.total} strong />
              <Row label="Общий объём" value={`${stats.pumping.total_amount_ml} мл`} muted />
              <Row
                label="Левая / Правая / Обе"
                value={`${stats.pumping.by_side.left || 0} / ${stats.pumping.by_side.right || 0} / ${stats.pumping.by_side.both || 0}`}
                muted
              />
              {stats.pumping.avg_amount_ml != null && (
                <Row label="Средний объём" value={`${stats.pumping.avg_amount_ml} мл`} muted />
              )}
            </div>
          </section>

          {(stats.milk_balance.pumped_ml > 0 || stats.milk_balance.fed_ml > 0) && (
            <section>
              <div className={styles.sectionTitle}>Баланс молока</div>
              <div className={styles.card}>
                <Row label="Сцежено" value={`${stats.milk_balance.pumped_ml} мл`} strong />
                <Row label="Скормлено (бутылочка)" value={`${stats.milk_balance.fed_ml} мл`} muted />
                <div className={`${styles.row} ${styles.strong}`}>
                  <span>Остаток</span>
                  <span className={stats.milk_balance.remaining_ml >= 0 ? styles.pos : styles.neg}>
                    {stats.milk_balance.remaining_ml} мл
                  </span>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className={styles.sectionTitle}>Сон</div>
            <div className={styles.card}>
              <Row label="Всего" value={stats.sleep.total_count} strong />
              {stats.sleep.total_duration_min > 0 && (
                <Row label="Общее время" value={formatDuration(stats.sleep.total_duration_min)} strong />
              )}
              <Row
                label="Ночной / Дневной"
                value={`${formatDuration(stats.sleep.night_min)} / ${formatDuration(stats.sleep.nap_min)}`}
                muted
              />
              {stats.sleep.avg_duration_min != null && (
                <Row label="Средний сон" value={formatDuration(stats.sleep.avg_duration_min)} muted />
              )}
            </div>
          </section>

          <section>
            <div className={styles.sectionTitle}>Прогулки</div>
            <div className={styles.card}>
              <Row label="Всего" value={stats.walks.total} strong />
              {stats.walks.total_duration_min > 0 && (
                <Row label="Общее время" value={formatDuration(stats.walks.total_duration_min)} strong />
              )}
              {stats.walks.avg_duration_min != null && (
                <Row label="Средняя" value={formatDuration(stats.walks.avg_duration_min)} muted />
              )}
            </div>
          </section>

          <section>
            <div className={styles.sectionTitle}>Подгузники</div>
            <div className={styles.card}>
              <Row label="Всего" value={stats.diapers.total} strong />
              <Row
                label="Мокрых / Грязных / Смешанных"
                value={`${stats.diapers.by_type.wet || 0} / ${stats.diapers.by_type.dirty || 0} / ${stats.diapers.by_type.mixed || 0}`}
                muted
              />
            </div>
          </section>

          {(stats.last_growth.weight_kg != null ||
            stats.last_growth.height_cm != null ||
            stats.last_growth.head_circumference_cm != null) && (
            <section>
              <div className={styles.sectionTitle}>Рост</div>
              <div className={styles.card}>
                {stats.last_growth.weight_kg != null && (
                  <Row label="Вес" value={`${stats.last_growth.weight_kg} кг`} strong />
                )}
                {stats.last_growth.height_cm != null && (
                  <Row label="Рост" value={`${stats.last_growth.height_cm} см`} strong />
                )}
                {stats.last_growth.head_circumference_cm != null && (
                  <Row label="Окр. головы" value={`${stats.last_growth.head_circumference_cm} см`} strong />
                )}
              </div>
            </section>
          )}

          <button type="button" className={styles.growthBtn} onClick={() => navigate('/growth')}>
            Графики роста (ВОЗ)
          </button>
        </div>
      )}
    </div>
  );
}
