import { z } from 'zod';
import {
  BreastSideSchema,
  DiaperTypeSchema,
  EventTypeSchema,
  FeedingTypeSchema,
  HealthTypeSchema,
  MilestoneCategorySchema,
  SleepQualitySchema,
  SleepTypeSchema,
  SourceSchema,
} from './enums.js';

/** ISO-8601 datetime string (the wire format for all timestamps). */
export const IsoDateTime = z.string();

// ---------------------------------------------------------------------------
// Detail shapes — one per event type that carries a typed detail row.
// `note` and `mood` carry no detail row (everything lives on the base event).
// ---------------------------------------------------------------------------

export const EventFeedingDetailsSchema = z.object({
  feeding_type: FeedingTypeSchema,
  breast_side: BreastSideSchema.optional(),
  duration_min: z.number().optional(),
  left_duration_min: z.number().optional(),
  right_duration_min: z.number().optional(),
  amount_ml: z.number().optional(),
  food_name: z.string().optional(),
  started_at: IsoDateTime.optional(),
  ended_at: IsoDateTime.optional(),
});
export type EventFeedingDetails = z.infer<typeof EventFeedingDetailsSchema>;

export const EventSleepDetailsSchema = z.object({
  sleep_type: SleepTypeSchema.optional(),
  started_at: IsoDateTime,
  ended_at: IsoDateTime.optional(),
  duration_min: z.number().optional(),
  quality: SleepQualitySchema.optional(),
});
export type EventSleepDetails = z.infer<typeof EventSleepDetailsSchema>;

export const EventDiaperDetailsSchema = z.object({
  diaper_type: DiaperTypeSchema,
  color: z.string().optional(),
});
export type EventDiaperDetails = z.infer<typeof EventDiaperDetailsSchema>;

export const EventGrowthDetailsSchema = z.object({
  height_cm: z.number().optional(),
  head_circumference_cm: z.number().optional(),
});
export type EventGrowthDetails = z.infer<typeof EventGrowthDetailsSchema>;

export const EventWeightDetailsSchema = z.object({
  weight_kg: z.number(),
});
export type EventWeightDetails = z.infer<typeof EventWeightDetailsSchema>;

export const EventWalkDetailsSchema = z.object({
  duration_min: z.number().optional(),
  started_at: IsoDateTime.optional(),
  ended_at: IsoDateTime.optional(),
});
export type EventWalkDetails = z.infer<typeof EventWalkDetailsSchema>;

export const EventHealthDetailsSchema = z.object({
  health_type: HealthTypeSchema,
  value: z.number().optional(),
  doctor_name: z.string().optional(),
  vaccine_name: z.string().optional(),
  medication: z.string().optional(),
  description: z.string().optional(),
});
export type EventHealthDetails = z.infer<typeof EventHealthDetailsSchema>;

export const EventMilestoneDetailsSchema = z.object({
  category: MilestoneCategorySchema,
  title: z.string(),
  description: z.string().optional(),
});
export type EventMilestoneDetails = z.infer<typeof EventMilestoneDetailsSchema>;

export const EventPumpingDetailsSchema = z.object({
  breast_side: BreastSideSchema.optional(),
  amount_ml: z.number().optional(),
  duration_min: z.number().optional(),
  started_at: IsoDateTime.optional(),
  ended_at: IsoDateTime.optional(),
});
export type EventPumpingDetails = z.infer<typeof EventPumpingDetailsSchema>;

export const EventBathDetailsSchema = z.object({
  duration_min: z.number().optional(),
  started_at: IsoDateTime.optional(),
  ended_at: IsoDateTime.optional(),
});
export type EventBathDetails = z.infer<typeof EventBathDetailsSchema>;

/** Union of every typed detail payload. */
export const EventDetailsSchema = z.union([
  EventFeedingDetailsSchema,
  EventSleepDetailsSchema,
  EventDiaperDetailsSchema,
  EventGrowthDetailsSchema,
  EventWeightDetailsSchema,
  EventWalkDetailsSchema,
  EventHealthDetailsSchema,
  EventMilestoneDetailsSchema,
  EventPumpingDetailsSchema,
  EventBathDetailsSchema,
]);
export type EventDetails = z.infer<typeof EventDetailsSchema>;

/** Map of event type -> its detail schema, for runtime detail validation. */
export const DETAIL_SCHEMA_BY_TYPE = {
  feeding: EventFeedingDetailsSchema,
  sleep: EventSleepDetailsSchema,
  diaper: EventDiaperDetailsSchema,
  growth: EventGrowthDetailsSchema,
  weight: EventWeightDetailsSchema,
  walk: EventWalkDetailsSchema,
  health: EventHealthDetailsSchema,
  milestone: EventMilestoneDetailsSchema,
  pumping: EventPumpingDetailsSchema,
  bath: EventBathDetailsSchema,
} as const;

// ---------------------------------------------------------------------------
// Base records
// ---------------------------------------------------------------------------

export const ChildSchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  birth_date: z.string(),
  gender: z.enum(['male', 'female']).optional(),
  age_months: z.number().optional(),
  avatar_url: z.string().optional(),
  created_at: IsoDateTime.optional(),
  updated_at: IsoDateTime.optional(),
});
export type Child = z.infer<typeof ChildSchema>;

/** Fully-enriched event as returned to the mini-app (base + details + photo). */
export const EventSchema = z.object({
  id: z.number().int(),
  child_id: z.number().int(),
  event_type: EventTypeSchema,
  occurred_at: IsoDateTime,
  source: SourceSchema,
  author: z.string().nullish(),
  note: z.string().nullish(),
  raw_entry_id: z.number().int().nullish(),
  raw_entry_emoji: z.string().nullish(),
  details: EventDetailsSchema.nullable(),
  photo: z
    .object({
      id: z.number().int(),
      url: z.string(),
      caption: z.string().optional(),
    })
    .nullish(),
});
export type Event = z.infer<typeof EventSchema>;

export const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type EventsResponse = z.infer<typeof EventsResponseSchema>;

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export const CreateEventPayloadSchema = z.object({
  child_id: z.number().int().optional(),
  event_type: EventTypeSchema,
  occurred_at: IsoDateTime.optional(),
  source: SourceSchema.optional(),
  author: z.string().optional(),
  note: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  photo_id: z.number().int().optional(),
});
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>;

export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial();
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>;

export const EventFilterSchema = z.object({
  child_id: z.coerce.number().int().optional(),
  event_type: EventTypeSchema.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  source: SourceSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
});
export type EventFilter = z.infer<typeof EventFilterSchema>;

export const QuickFeedingPayloadSchema = z.object({
  child_id: z.number().int().optional(),
  feeding_type: FeedingTypeSchema.default('breast'),
  breast_side: BreastSideSchema.optional(),
  amount_ml: z.number().optional(),
  occurred_at: IsoDateTime.optional(),
});
export type QuickFeedingPayload = z.infer<typeof QuickFeedingPayloadSchema>;

export const QuickDiaperPayloadSchema = z.object({
  child_id: z.number().int().optional(),
  diaper_type: DiaperTypeSchema.default('wet'),
  occurred_at: IsoDateTime.optional(),
});
export type QuickDiaperPayload = z.infer<typeof QuickDiaperPayloadSchema>;
