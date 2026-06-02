import { describe, it, expect } from 'vitest';
import { ParseOperationSchema, StatsResponseSchema } from './dto.js';
import { EventTypeSchema } from './enums.js';
import { CreateEventPayloadSchema } from './events.js';

describe('event contracts', () => {
  it('rejects an unknown event type', () => {
    expect(() => EventTypeSchema.parse('flying')).toThrow();
    expect(EventTypeSchema.parse('feeding')).toBe('feeding');
  });

  it('accepts a valid create payload and rejects a bad type', () => {
    expect(CreateEventPayloadSchema.parse({ event_type: 'diaper' }).event_type).toBe('diaper');
    expect(() => CreateEventPayloadSchema.parse({ event_type: 'nope' })).toThrow();
  });
});

describe('AI parse operation contract', () => {
  it('accepts a well-formed create_event operation', () => {
    const op = ParseOperationSchema.parse({
      action: 'create_event',
      event: { child_id: 1, event_type: 'feeding', occurred_at: '2026-06-02T10:00:00.000Z' },
      details: { table: 'event_feedings', data: { feeding_type: 'breast' } },
      raw_entry_id: 5,
    });
    expect(op.action).toBe('create_event');
  });

  it('rejects invalid LLM output (missing required fields / unknown action)', () => {
    expect(() => ParseOperationSchema.parse({ action: 'delete_everything' })).toThrow();
    expect(() => ParseOperationSchema.parse({ action: 'create_event', event: {} })).toThrow();
  });
});

describe('stats response contract', () => {
  it('round-trips a minimal stats object', () => {
    const stats = {
      period: { from: '2026-06-01', to: '2026-06-02' },
      feedings: { total: 0, by_type: {}, avg_interval_min: null, total_duration_min: 0, total_ml: 0, ml_by_type: {}, last_feeding_at: null },
      sleep: { total_count: 0, total_duration_min: 0, night_min: 0, nap_min: 0, avg_duration_min: null },
      diapers: { total: 0, by_type: {}, last_diaper_at: null },
      last_growth: { weight_kg: null, height_cm: null, head_circumference_cm: null, measured_at: null },
      pumping: { total: 0, total_amount_ml: 0, by_side: {}, avg_amount_ml: null },
      walks: { total: 0, total_duration_min: 0, avg_duration_min: null },
      milk_balance: { pumped_ml: 0, fed_ml: 0, remaining_ml: 0 },
      wake_window: { current_min: null, sleeping_min: null, sleeping_started_at: null, avg_min: null, max_min: null, recommended_max: 180, last_sleep_ended_at: null },
    };
    expect(() => StatsResponseSchema.parse(stats)).not.toThrow();
  });
});
