import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  eventSummary,
  eventLabel,
  ageFromBirth,
  isOpenEvent,
  resolveEventTiming,
} from './format.js';
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

describe('resolveEventTiming', () => {
  const base = {
    id: 1,
    child_id: 1,
    occurred_at: '2026-06-02T10:00:00.000Z',
    source: 'miniapp' as const,
    details: null,
  };

  it('marks a started, never-ended event without a duration as ongoing', () => {
    const e = { ...base, event_type: 'sleep' as const, details: { started_at: '2026-06-02T10:00:00.000Z' } } as Event;
    const t = resolveEventTiming(e);
    expect(t.is_open).toBe(true);
    expect(isOpenEvent(e)).toBe(true);
    expect(t.started_at).toBe('2026-06-02T10:00:00.000Z');
  });

  it('keeps an explicit end and is not ongoing', () => {
    const e = {
      ...base,
      event_type: 'sleep' as const,
      details: { started_at: '2026-06-02T10:00:00.000Z', ended_at: '2026-06-02T11:30:00.000Z', duration_min: 90 },
    } as Event;
    const t = resolveEventTiming(e);
    expect(t.is_open).toBe(false);
    expect(t.ended_at).toBe('2026-06-02T11:30:00.000Z');
    expect(t.ended_at).not.toBe(t.started_at);
  });

  it('derives the end from started_at + duration when ended_at is missing (imported event)', () => {
    const e = {
      ...base,
      event_type: 'sleep' as const,
      details: { started_at: '2026-06-02T10:00:00.000Z', duration_min: 45 },
    } as Event;
    const t = resolveEventTiming(e);
    // A duration without an explicit end means the event is closed, not ongoing.
    expect(t.is_open).toBe(false);
    expect(t.ended_at).toBe('2026-06-02T10:45:00.000Z');
    expect(t.ended_at).not.toBe(t.started_at);
  });

  it('falls back to occurred_at and derives the end when only a duration is present', () => {
    const e = {
      ...base,
      event_type: 'pumping' as const,
      details: { breast_side: 'left', amount_ml: 120, duration_min: 20 },
    } as Event;
    const t = resolveEventTiming(e);
    expect(t.is_open).toBe(false);
    expect(t.started_at).toBe('2026-06-02T10:00:00.000Z');
    expect(t.ended_at).toBe('2026-06-02T10:20:00.000Z');
    expect(t.ended_at).not.toBe(t.started_at);
  });

  it('never treats a non-timed event as ongoing', () => {
    const e = { ...base, event_type: 'diaper' as const, details: { diaper_type: 'wet' } } as Event;
    expect(resolveEventTiming(e).is_open).toBe(false);
    expect(isOpenEvent(e)).toBe(false);
  });
});
