import { useGrowthChart } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import { ageInMonths, estimatePercentile, formatDate, whoDataForGender } from '@acme/baby-bot-domain';
import styles from './screens.module.css';

export function GrowthChart() {
  const { data, isLoading } = useGrowthChart();

  if (isLoading || !data) return <div className={styles.screen}><Skeleton height={240} /></div>;

  const who = whoDataForGender(data.child.gender);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Рост и вес</h1>
      </div>
      <div className={styles.statLabel}>{data.child.name}</div>

      {data.data_points.length ? (
        <div className={styles.list}>
          {data.data_points.map((p) => {
            const months = ageInMonths(data.child.birth_date, new Date(p.date));
            const wp = p.weight_kg != null ? estimatePercentile(who.weightForAge, months, p.weight_kg) : null;
            return (
              <div key={p.date} className={styles.statCard} style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{formatDate(p.date)}</div>
                <div className={styles.statLabel}>
                  {p.weight_kg != null ? `Вес: ${p.weight_kg} кг${wp ? ` (P${wp})` : ''}` : ''}
                  {p.height_cm != null ? ` · Рост: ${p.height_cm} см` : ''}
                  {p.head_circumference_cm != null ? ` · Окр. головы: ${p.head_circumference_cm} см` : ''}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>Нет измерений</div>
      )}
    </div>
  );
}
