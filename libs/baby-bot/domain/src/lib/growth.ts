import {
  WhoPercentileData,
  WhoPercentileRow,
  whoPercentilesBoys,
  whoPercentilesGirls,
} from './who-percentiles.js';
import type { Gender } from './enums.js';

/** Whole months elapsed between a birth date and a reference date. */
export function ageInMonths(birthDate: string, at: Date = new Date()): number {
  const birth = new Date(birthDate);
  let months =
    (at.getFullYear() - birth.getFullYear()) * 12 +
    (at.getMonth() - birth.getMonth());
  if (at.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function whoDataForGender(gender: Gender): WhoPercentileData {
  return gender === 'female' ? whoPercentilesGirls : whoPercentilesBoys;
}

/**
 * Estimate which WHO percentile band a measurement falls into for a given age.
 * Returns one of 3 / 15 / 50 / 85 / 97 (nearest band), or null if no data.
 */
export function estimatePercentile(
  rows: WhoPercentileRow[],
  ageMonths: number,
  value: number,
): number | null {
  if (!rows.length) return null;
  const row = rows.reduce((best, r) =>
    Math.abs(r.month - ageMonths) < Math.abs(best.month - ageMonths) ? r : best,
  );
  const bands: Array<[number, number]> = [
    [3, row.p3],
    [15, row.p15],
    [50, row.p50],
    [85, row.p85],
    [97, row.p97],
  ];
  let nearest = bands[0];
  for (const band of bands) {
    if (Math.abs(band[1] - value) < Math.abs(nearest[1] - value)) nearest = band;
  }
  return nearest[0];
}

/**
 * Age-appropriate recommended maximum wake window (minutes).
 * Mirrors the original baby-ai thresholds used for stats + notifications.
 */
export function recommendedWakeWindowMin(ageMonths: number): number {
  if (ageMonths < 1) return 60;
  if (ageMonths < 3) return 90;
  if (ageMonths < 6) return 120;
  if (ageMonths < 9) return 180;
  if (ageMonths < 12) return 240;
  if (ageMonths < 18) return 300;
  return 360;
}
