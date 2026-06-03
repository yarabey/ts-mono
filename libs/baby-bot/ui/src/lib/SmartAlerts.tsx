import { formatDuration, type StatsResponse } from '@acme/baby-bot-domain';
import styles from './SmartAlerts.module.css';

/** Minutes-before-threshold at which a warning (vs. critical) banner appears. */
export const WARN_BEFORE_MIN = 30;

export interface NotifyThresholds {
  feeding_min: number;
  diaper_min: number;
  wake_min: number;
}

export const DEFAULT_THRESHOLDS: NotifyThresholds = {
  feeding_min: 180,
  diaper_min: 240,
  wake_min: 150,
};

export interface SmartAlert {
  key: 'wake' | 'feeding' | 'diaper';
  icon: string;
  label: string;
  timeAgo: string;
  route: string;
  urgency: 'warning' | 'critical';
}

function minSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  return Math.round((now - new Date(iso).getTime()) / 60000);
}

/**
 * Pure threshold logic — derive overdue/approaching alerts from stats. A
 * banner becomes `warning` within {@link WARN_BEFORE_MIN} of its threshold and
 * `critical` once the threshold is exceeded.
 */
export function computeSmartAlerts(
  stats: StatsResponse,
  thresholds: NotifyThresholds = DEFAULT_THRESHOLDS,
  now: number = Date.now(),
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const ww = stats.wake_window;

  if (ww && !ww.sleeping_started_at && ww.current_min != null) {
    const remaining = thresholds.wake_min - ww.current_min;
    if (remaining <= WARN_BEFORE_MIN && remaining > 0) {
      alerts.push({
        key: 'wake',
        icon: '😴',
        label: `Скоро спать (осталось ${formatDuration(remaining)})`,
        timeAgo: `бодрствует ${formatDuration(ww.current_min)}`,
        route: '/add/sleep',
        urgency: 'warning',
      });
    } else if (remaining <= 0) {
      alerts.push({
        key: 'wake',
        icon: '😴',
        label: 'Пора спать!',
        timeAgo: `бодрствует ${formatDuration(ww.current_min)}`,
        route: '/add/sleep',
        urgency: 'critical',
      });
    }
  }

  const feedingMin = minSince(stats.feedings.last_feeding_at, now);
  if (feedingMin != null) {
    const remaining = thresholds.feeding_min - feedingMin;
    if (remaining <= WARN_BEFORE_MIN && remaining > 0) {
      alerts.push({
        key: 'feeding',
        icon: '🍼',
        label: `Скоро кормление (через ${formatDuration(remaining)})`,
        timeAgo: `последнее ${formatDuration(feedingMin)} назад`,
        route: '/add/feeding',
        urgency: 'warning',
      });
    } else if (remaining <= 0) {
      alerts.push({
        key: 'feeding',
        icon: '🍼',
        label: 'Пора кормить!',
        timeAgo: `последнее ${formatDuration(feedingMin)} назад`,
        route: '/add/feeding',
        urgency: 'critical',
      });
    }
  }

  const diaperMin = minSince(stats.diapers.last_diaper_at, now);
  if (diaperMin != null) {
    const remaining = thresholds.diaper_min - diaperMin;
    if (remaining <= WARN_BEFORE_MIN && remaining > 0) {
      alerts.push({
        key: 'diaper',
        icon: '🧷',
        label: `Скоро подгузник (через ${formatDuration(remaining)})`,
        timeAgo: `последний ${formatDuration(diaperMin)} назад`,
        route: '/add/diaper',
        urgency: 'warning',
      });
    } else if (remaining <= 0) {
      alerts.push({
        key: 'diaper',
        icon: '🧷',
        label: 'Пора сменить подгузник!',
        timeAgo: `последний ${formatDuration(diaperMin)} назад`,
        route: '/add/diaper',
        urgency: 'critical',
      });
    }
  }

  return alerts;
}

export interface SmartAlertsProps {
  stats: StatsResponse;
  thresholds?: NotifyThresholds;
  onNavigate: (route: string) => void;
}

export function SmartAlerts({ stats, thresholds, onNavigate }: SmartAlertsProps) {
  const alerts = computeSmartAlerts(stats, thresholds);
  if (alerts.length === 0) return null;

  return (
    <div className={styles.list}>
      {alerts.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={() => onNavigate(a.route)}
          className={`${styles.alert} ${a.urgency === 'critical' ? styles.critical : styles.warning}`}
        >
          <span className={styles.icon}>{a.icon}</span>
          <span className={styles.text}>
            <span className={styles.label}>{a.label}</span>
            <span className={styles.timeAgo}>{a.timeAgo}</span>
          </span>
          <span className={styles.arrow}>→</span>
        </button>
      ))}
    </div>
  );
}
