import { describe, it, expect } from 'vitest';
import { EventSchema } from './events.js';

/** Build a wire-shaped event (backend sends `null` for empty detail columns). */
const wireEvent = (event_type: string, details: unknown) => ({
  id: 1,
  child_id: 1,
  event_type,
  occurred_at: '2026-06-02T10:00:00.000Z',
  source: 'miniapp',
  author: null,
  note: null,
  raw_entry_id: null,
  raw_entry_emoji: null,
  details,
  photo: null,
});

describe('EventSchema detail parsing', () => {
  it('keeps started_at for an ongoing sleep whose empty columns are null', () => {
    // Regression: a blind union used to drop every field (details === {}),
    // which made the editor think the event had ended (Конец == Начало).
    const e = EventSchema.parse(
      wireEvent('sleep', {
        sleep_type: null,
        started_at: '2026-06-02T10:00:00.000Z',
        ended_at: null,
        duration_min: null,
        quality: null,
      }),
    );
    const d = e.details as Record<string, unknown>;
    expect(d.started_at).toBe('2026-06-02T10:00:00.000Z');
    expect(d.ended_at == null).toBe(true);
  });

  it('keeps all fields for a closed sleep', () => {
    const e = EventSchema.parse(
      wireEvent('sleep', {
        sleep_type: 'night',
        started_at: '2026-06-02T10:00:00.000Z',
        ended_at: '2026-06-02T11:30:00.000Z',
        duration_min: 90,
        quality: 'good',
      }),
    );
    const d = e.details as Record<string, unknown>;
    expect(d.ended_at).toBe('2026-06-02T11:30:00.000Z');
    expect(d.duration_min).toBe(90);
  });

  it('does not let an all-optional schema swallow weight_kg', () => {
    // Regression: weight details matched the (earlier, all-optional) growth
    // schema in the union and lost weight_kg.
    const e = EventSchema.parse(wireEvent('weight', { weight_kg: 8.2 }));
    expect((e.details as Record<string, unknown>).weight_kg).toBe(8.2);
  });

  it('preserves started_at for an ongoing feeding/pumping', () => {
    const feeding = EventSchema.parse(
      wireEvent('feeding', {
        feeding_type: 'breast',
        breast_side: 'left',
        duration_min: null,
        started_at: '2026-06-02T10:00:00.000Z',
        ended_at: null,
      }),
    );
    expect((feeding.details as Record<string, unknown>).started_at).toBe('2026-06-02T10:00:00.000Z');

    const pumping = EventSchema.parse(
      wireEvent('pumping', {
        breast_side: null,
        amount_ml: null,
        duration_min: null,
        started_at: '2026-06-02T10:00:00.000Z',
        ended_at: null,
      }),
    );
    expect((pumping.details as Record<string, unknown>).started_at).toBe('2026-06-02T10:00:00.000Z');
  });

  it('parses note/mood events with null details', () => {
    const e = EventSchema.parse(wireEvent('note', null));
    expect(e.details).toBeNull();
  });
});
