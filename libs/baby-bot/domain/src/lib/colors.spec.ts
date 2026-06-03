import { describe, expect, it } from 'vitest';
import {
  PATTERN_EVENT_COLORS,
  PATTERN_FALLBACK_COLOR,
  patternColor,
} from './colors.js';

describe('patternColor', () => {
  it('returns the mapped color for the 8 timeline event types', () => {
    expect(patternColor('sleep')).toBe('#818cf8');
    expect(patternColor('feeding')).toBe('#fb923c');
    expect(patternColor('diaper')).toBe('#4ade80');
    expect(patternColor('pumping')).toBe('#facc15');
    expect(patternColor('walk')).toBe('#2dd4bf');
    expect(patternColor('bath')).toBe('#22d3ee');
    expect(patternColor('mood')).toBe('#f472b6');
    expect(patternColor('weight')).toBe('#f87171');
  });

  it('covers exactly the 8 reference event colors', () => {
    expect(Object.keys(PATTERN_EVENT_COLORS).sort()).toEqual(
      ['bath', 'diaper', 'feeding', 'mood', 'pumping', 'sleep', 'walk', 'weight'].sort(),
    );
  });

  it('falls back to muted grey for unmapped types', () => {
    expect(patternColor('health')).toBe(PATTERN_FALLBACK_COLOR);
    expect(patternColor('note')).toBe(PATTERN_FALLBACK_COLOR);
    expect(patternColor('unknown')).toBe(PATTERN_FALLBACK_COLOR);
  });
});
