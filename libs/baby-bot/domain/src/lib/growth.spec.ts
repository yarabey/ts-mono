import { describe, it, expect } from 'vitest';
import { ageInMonths, estimatePercentile, recommendedWakeWindowMin } from './growth.js';
import { whoPercentilesBoys } from './who-percentiles.js';

describe('ageInMonths', () => {
  it('counts whole months elapsed', () => {
    expect(ageInMonths('2026-01-02', new Date('2026-06-02T00:00:00Z'))).toBe(5);
    expect(ageInMonths('2026-06-01', new Date('2026-06-02T00:00:00Z'))).toBe(0);
  });
});

describe('estimatePercentile', () => {
  it('picks the nearest band for a median weight', () => {
    // 6-month boy median weight is 7.4kg -> P50
    expect(estimatePercentile(whoPercentilesBoys.weightForAge, 6, 7.4)).toBe(50);
  });
  it('returns null with no rows', () => {
    expect(estimatePercentile([], 6, 7)).toBeNull();
  });
});

describe('recommendedWakeWindowMin', () => {
  it('increases with age', () => {
    expect(recommendedWakeWindowMin(0)).toBeLessThan(recommendedWakeWindowMin(12));
    expect(recommendedWakeWindowMin(24)).toBe(360);
  });
});
