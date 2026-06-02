import { z } from 'zod';

/**
 * Single source of truth for the baby-bot domain enums.
 * Mirrors the SQLite CHECK constraints from the original baby-ai schema,
 * upgraded to Zod enums shared between backend and mini-app.
 */

export const EventTypeSchema = z.enum([
  'feeding',
  'sleep',
  'diaper',
  'growth',
  'health',
  'milestone',
  'note',
  'pumping',
  'bath',
  'walk',
  'weight',
  'mood',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SourceSchema = z.enum([
  'miniapp',
  'telegram',
  'alice',
  'telegram_voice',
  'ai_parsed',
  'test',
  'csv_import',
  'realm_import',
]);
export type Source = z.infer<typeof SourceSchema>;

export const RawEntryStatusSchema = z.enum([
  'pending',
  'processing',
  'processed',
  'error',
  'needs_review',
]);
export type RawEntryStatus = z.infer<typeof RawEntryStatusSchema>;

export const FeedingTypeSchema = z.enum([
  'breast',
  'bottle',
  'solid',
  'mixed',
  'water',
]);
export type FeedingType = z.infer<typeof FeedingTypeSchema>;

export const BreastSideSchema = z.enum(['left', 'right', 'both']);
export type BreastSide = z.infer<typeof BreastSideSchema>;

export const SleepTypeSchema = z.enum(['night', 'nap']);
export type SleepType = z.infer<typeof SleepTypeSchema>;

export const SleepQualitySchema = z.enum(['good', 'normal', 'bad']);
export type SleepQuality = z.infer<typeof SleepQualitySchema>;

export const DiaperTypeSchema = z.enum(['wet', 'dirty', 'mixed']);
export type DiaperType = z.infer<typeof DiaperTypeSchema>;

export const HealthTypeSchema = z.enum([
  'temperature',
  'vaccination',
  'doctor',
  'medication',
  'illness',
]);
export type HealthType = z.infer<typeof HealthTypeSchema>;

export const MilestoneCategorySchema = z.enum([
  'motor',
  'speech',
  'social',
  'cognitive',
]);
export type MilestoneCategory = z.infer<typeof MilestoneCategorySchema>;

export const GenderSchema = z.enum(['male', 'female']);
export type Gender = z.infer<typeof GenderSchema>;

export const UserRoleSchema = z.enum(['parent', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TimerEventTypeSchema = z.enum([
  'feeding',
  'sleep',
  'walk',
  'pumping',
  'bath',
]);
export type TimerEventType = z.infer<typeof TimerEventTypeSchema>;
