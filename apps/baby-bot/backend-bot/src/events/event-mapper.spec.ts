import { buildDetailData } from './event-mapper';

describe('buildDetailData', () => {
  it('camelCases keys', () => {
    const out = buildDetailData({ feeding_type: 'breast', amount_ml: 120 });
    expect(out).toEqual({ feedingType: 'breast', amountMl: 120 });
  });

  it('coerces a timezone-less AI datetime into a UTC Date (the raw-entries bug)', () => {
    const out = buildDetailData({ sleep_type: 'night', started_at: '2026-06-04T05:23:04' });
    expect(out.sleepType).toBe('night');
    expect(out.startedAt).toBeInstanceOf(Date);
    // Naked datetime is pinned to UTC, not the server's local zone.
    expect((out.startedAt as Date).toISOString()).toBe('2026-06-04T05:23:04.000Z');
  });

  it('keeps an explicit UTC offset / Z suffix intact', () => {
    const out = buildDetailData({ started_at: '2026-06-04T05:23:04Z', ended_at: '2026-06-04T08:23:04+03:00' });
    expect((out.startedAt as Date).toISOString()).toBe('2026-06-04T05:23:04.000Z');
    expect((out.endedAt as Date).toISOString()).toBe('2026-06-04T05:23:04.000Z');
  });

  it('drops an unparseable timestamp rather than forwarding a bad string to Prisma', () => {
    const out = buildDetailData({ sleep_type: 'nap', started_at: 'не знаю' });
    expect(out.sleepType).toBe('nap');
    expect('startedAt' in out).toBe(false);
  });

  it('leaves null/absent datetime fields untouched', () => {
    const out = buildDetailData({ duration_min: 30, ended_at: null });
    expect(out).toEqual({ durationMin: 30, endedAt: null });
  });
});
