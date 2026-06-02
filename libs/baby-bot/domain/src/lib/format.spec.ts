import { describe, it, expect } from 'vitest';
import { formatDuration, eventSummary, eventLabel, ageFromBirth } from './format.js';
import type { Event } from './events.js';

describe('formatDuration', () => {
  it('formats minutes into ч/м', () => {
    expect(formatDuration(0)).toBe('0м');
    expect(formatDuration(45)).toBe('45м');
    expect(formatDuration(60)).toBe('1ч');
    expect(formatDuration(135)).toBe('2ч 15м');
  });
});

describe('eventSummary', () => {
  const base = {
    id: 1,
    child_id: 1,
    occurred_at: '2026-06-02T10:00:00.000Z',
    source: 'miniapp' as const,
    details: null,
  };

  it('summarizes a breast feeding', () => {
    const e = { ...base, event_type: 'feeding' as const, details: { feeding_type: 'breast', breast_side: 'left', duration_min: 12 } } as Event;
    expect(eventSummary(e)).toContain('Грудь');
    expect(eventSummary(e)).toContain('левая');
  });

  it('summarizes a diaper', () => {
    const e = { ...base, event_type: 'diaper' as const, details: { diaper_type: 'wet' } } as Event;
    expect(eventSummary(e)).toBe('Мокрый');
  });
});

describe('eventLabel', () => {
  it('maps known types and falls back to the raw type', () => {
    expect(eventLabel('sleep')).toBe('Сон');
    expect(eventLabel('xyz')).toBe('xyz');
  });
});

describe('ageFromBirth', () => {
  it('computes months for a 3-month-old', () => {
    expect(ageFromBirth('2026-03-02', new Date('2026-06-02T12:00:00Z'))).toContain('3 мес');
  });
});
