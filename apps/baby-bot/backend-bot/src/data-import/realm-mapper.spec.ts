import { mapRealmEvent, type RealmEvent } from './realm-mapper';

const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

describe('mapRealmEvent', () => {
  it('maps a bottle feeding', () => {
    const m = mapRealmEvent({ id: '1', type: 'bottle', bottleAmount: 120, mixType: 'Смесь', date: new Date('2026-06-01T10:00:00Z') });
    expect(m?.eventType).toBe('feeding');
    expect(m?.details).toMatchObject({ feedingType: 'bottle', amountMl: 120, foodName: 'Смесь' });
  });

  it('derives sleep end from start + singleTimerSeconds (no explicit end)', () => {
    const item: RealmEvent = { id: '2', type: 'sleep', date: new Date('2026-06-01T22:00:00Z'), singleTimerSeconds: 1800, isDaySleep: false };
    const d = mapRealmEvent(item)?.details as Record<string, string | number>;
    expect(d.sleepType).toBe('night');
    expect(d.durationMin).toBe(30);
    expect(d.startedAt).toBeTruthy();
    expect(d.endedAt).toBeTruthy();
    expect(minutesBetween(d.startedAt as string, d.endedAt as string)).toBe(30);
  });

  it('uses explicit left start/end for lactation', () => {
    const item: RealmEvent = {
      id: '3',
      type: 'lactation',
      leftStart: new Date('2026-06-01T08:00:00Z'),
      leftEnd: new Date('2026-06-01T08:15:00Z'),
    };
    const d = mapRealmEvent(item)?.details as Record<string, string | number>;
    expect(d.feedingType).toBe('breast');
    expect(d.breastSide).toBe('left');
    expect(d.durationMin).toBe(15);
    expect(minutesBetween(d.startedAt as string, d.endedAt as string)).toBe(15);
  });

  it('maps stroll to a walk with derived end', () => {
    const item: RealmEvent = { id: '4', type: 'stroll', date: new Date('2026-06-01T09:00:00Z'), singleTimerSeconds: 2700 };
    const m = mapRealmEvent(item);
    expect(m?.eventType).toBe('walk');
    const d = m?.details as Record<string, string | number>;
    expect(d.durationMin).toBe(45);
    expect(minutesBetween(d.startedAt as string, d.endedAt as string)).toBe(45);
  });

  it('returns null for unknown types', () => {
    expect(mapRealmEvent({ id: '5', type: 'mystery' })).toBeNull();
  });
});
