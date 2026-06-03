import { describe, expect, it } from 'vitest';
import type { StatsResponse } from '@acme/baby-bot-domain';
import { computeSmartAlerts, DEFAULT_THRESHOLDS } from './SmartAlerts.js';

const NOW = new Date('2026-06-03T12:00:00Z').getTime();

function statsWith(overrides: Partial<StatsResponse>): StatsResponse {
  return {
    period: { from: '', to: '' },
    feedings: {
      total: 0,
      by_type: {},
      avg_interval_min: null,
      total_duration_min: 0,
      total_ml: 0,
      ml_by_type: {},
      last_feeding_at: null,
    },
    sleep: { total_count: 0, total_duration_min: 0, night_min: 0, nap_min: 0, avg_duration_min: null },
    diapers: { total: 0, by_type: {}, last_diaper_at: null },
    last_growth: { weight_kg: null, height_cm: null, head_circumference_cm: null, measured_at: null },
    pumping: { total: 0, total_amount_ml: 0, by_side: {}, avg_amount_ml: null },
    walks: { total: 0, total_duration_min: 0, avg_duration_min: null },
    milk_balance: { pumped_ml: 0, fed_ml: 0, remaining_ml: 0 },
    wake_window: {
      current_min: null,
      sleeping_min: null,
      sleeping_started_at: null,
      avg_min: null,
      max_min: null,
      recommended_max: 0,
      last_sleep_ended_at: null,
    },
    ...overrides,
  };
}

describe('computeSmartAlerts', () => {
  it('returns no alerts when nothing is near its threshold', () => {
    const iso = new Date(NOW - 10 * 60000).toISOString(); // 10 min ago
    const stats = statsWith({
      feedings: { ...statsWith({}).feedings, last_feeding_at: iso },
      diapers: { total: 1, by_type: {}, last_diaper_at: iso },
    });
    expect(computeSmartAlerts(stats, DEFAULT_THRESHOLDS, NOW)).toEqual([]);
  });

  it('emits a critical feeding alert once the threshold is exceeded', () => {
    const iso = new Date(NOW - 200 * 60000).toISOString(); // 200 min > 180
    const stats = statsWith({
      feedings: { ...statsWith({}).feedings, last_feeding_at: iso },
    });
    const alerts = computeSmartAlerts(stats, DEFAULT_THRESHOLDS, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ key: 'feeding', urgency: 'critical', route: '/add/feeding' });
  });

  it('emits a warning feeding alert within 30 min of the threshold', () => {
    const iso = new Date(NOW - 160 * 60000).toISOString(); // remaining 20 min
    const stats = statsWith({
      feedings: { ...statsWith({}).feedings, last_feeding_at: iso },
    });
    const alerts = computeSmartAlerts(stats, DEFAULT_THRESHOLDS, NOW);
    expect(alerts[0]).toMatchObject({ key: 'feeding', urgency: 'warning' });
  });

  it('emits a critical wake alert only while awake (not sleeping)', () => {
    const awake = statsWith({
      wake_window: { ...statsWith({}).wake_window, current_min: 200, sleeping_started_at: null },
    });
    expect(computeSmartAlerts(awake, DEFAULT_THRESHOLDS, NOW)[0]).toMatchObject({
      key: 'wake',
      urgency: 'critical',
    });

    const sleeping = statsWith({
      wake_window: {
        ...statsWith({}).wake_window,
        current_min: 200,
        sleeping_started_at: new Date(NOW).toISOString(),
      },
    });
    expect(computeSmartAlerts(sleeping, DEFAULT_THRESHOLDS, NOW)).toEqual([]);
  });
});
