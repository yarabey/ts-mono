import { z } from 'zod';
import { EventSchema, IsoDateTime } from './events.js';
import { RawEntryStatusSchema, SourceSchema, TimerEventTypeSchema } from './enums.js';

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const StatsResponseSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  feedings: z.object({
    total: z.number(),
    by_type: z.record(z.string(), z.number()),
    avg_interval_min: z.number().nullable(),
    total_duration_min: z.number(),
    total_ml: z.number(),
    ml_by_type: z.record(z.string(), z.number()),
    last_feeding_at: z.string().nullable(),
  }),
  sleep: z.object({
    total_count: z.number(),
    total_duration_min: z.number(),
    night_min: z.number(),
    nap_min: z.number(),
    avg_duration_min: z.number().nullable(),
  }),
  diapers: z.object({
    total: z.number(),
    by_type: z.record(z.string(), z.number()),
    last_diaper_at: z.string().nullable(),
  }),
  last_growth: z.object({
    weight_kg: z.number().nullable(),
    height_cm: z.number().nullable(),
    head_circumference_cm: z.number().nullable(),
    measured_at: z.string().nullable(),
  }),
  pumping: z.object({
    total: z.number(),
    total_amount_ml: z.number(),
    by_side: z.record(z.string(), z.number()),
    avg_amount_ml: z.number().nullable(),
  }),
  walks: z.object({
    total: z.number(),
    total_duration_min: z.number(),
    avg_duration_min: z.number().nullable(),
  }),
  milk_balance: z.object({
    pumped_ml: z.number(),
    fed_ml: z.number(),
    remaining_ml: z.number(),
  }),
  wake_window: z.object({
    current_min: z.number().nullable(),
    sleeping_min: z.number().nullable(),
    sleeping_started_at: z.string().nullable(),
    avg_min: z.number().nullable(),
    max_min: z.number().nullable(),
    recommended_max: z.number(),
    last_sleep_ended_at: z.string().nullable(),
  }),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export const StatsPeriodSchema = z.enum(['today', 'week', 'month', 'custom']);
export type StatsPeriod = z.infer<typeof StatsPeriodSchema>;

export const StatsQuerySchema = z.object({
  child_id: z.coerce.number().int().optional(),
  period: StatsPeriodSchema.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type StatsQuery = z.infer<typeof StatsQuerySchema>;

// ---------------------------------------------------------------------------
// Pattern (daily timeline)
// ---------------------------------------------------------------------------

export const PatternEventSchema = z.object({
  event_type: z.string(),
  occurred_at: IsoDateTime,
  started_at: IsoDateTime.nullish(),
  ended_at: IsoDateTime.nullish(),
  duration_min: z.number().nullish(),
});
export type PatternEvent = z.infer<typeof PatternEventSchema>;

export const PatternResponseSchema = z.object({
  date: z.string(),
  events: z.array(PatternEventSchema),
});
export type PatternResponse = z.infer<typeof PatternResponseSchema>;

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export const TimerSchema = z.object({
  timer_id: z.string(),
  event_type: z.string(),
  started_at: IsoDateTime,
  elapsed_sec: z.number(),
});
export type Timer = z.infer<typeof TimerSchema>;

export const ActiveTimersResponseSchema = z.object({
  timers: z.array(TimerSchema),
});
export type ActiveTimersResponse = z.infer<typeof ActiveTimersResponseSchema>;

export const StartTimerPayloadSchema = z.object({
  event_type: TimerEventTypeSchema,
  child_id: z.number().int().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type StartTimerPayload = z.infer<typeof StartTimerPayloadSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.number().int(),
    telegram_id: z.number().int(),
    first_name: z.string(),
    role: z.string(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const VerifyInitDataPayloadSchema = z.object({
  initData: z.string(),
});
export type VerifyInitDataPayload = z.infer<typeof VerifyInitDataPayloadSchema>;

export const AccessCodePayloadSchema = z.object({
  code: z.string(),
});
export type AccessCodePayload = z.infer<typeof AccessCodePayloadSchema>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const SettingValueSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
});
export type SettingValue = z.infer<typeof SettingValueSchema>;

// ---------------------------------------------------------------------------
// Raw entries
// ---------------------------------------------------------------------------

export const RawEntrySchema = z.object({
  id: z.number().int(),
  source: SourceSchema,
  author: z.string().nullish(),
  text: z.string(),
  file_path: z.string().nullish(),
  recorded_at: IsoDateTime,
  status: RawEntryStatusSchema,
  parsed_events: z.number().int().nullish(),
  error_message: z.string().nullish(),
  emoji: z.string().nullish(),
  created_at: IsoDateTime.nullish(),
  processed_at: IsoDateTime.nullish(),
  linked_events: z.array(EventSchema).optional(),
});
export type RawEntry = z.infer<typeof RawEntrySchema>;

export const RawEntriesResponseSchema = z.object({
  entries: z.array(RawEntrySchema),
});
export type RawEntriesResponse = z.infer<typeof RawEntriesResponseSchema>;

// ---------------------------------------------------------------------------
// Growth chart
// ---------------------------------------------------------------------------

export const WhoPercentileRowSchema = z.object({
  month: z.number(),
  p3: z.number(),
  p15: z.number(),
  p50: z.number(),
  p85: z.number(),
  p97: z.number(),
});

export const WhoPercentileDataSchema = z.object({
  weightForAge: z.array(WhoPercentileRowSchema),
  heightForAge: z.array(WhoPercentileRowSchema),
  headCircumferenceForAge: z.array(WhoPercentileRowSchema),
});

export const GrowthChartDataPointSchema = z.object({
  date: z.string(),
  weight_kg: z.number().nullable(),
  height_cm: z.number().nullable(),
  head_circumference_cm: z.number().nullable(),
});
export type GrowthChartDataPoint = z.infer<typeof GrowthChartDataPointSchema>;

export const GrowthChartResponseSchema = z.object({
  child: z.object({
    id: z.number().int(),
    name: z.string(),
    birth_date: z.string(),
    gender: z.enum(['male', 'female']),
  }),
  data_points: z.array(GrowthChartDataPointSchema),
  percentiles: WhoPercentileDataSchema,
});
export type GrowthChartResponse = z.infer<typeof GrowthChartResponseSchema>;

// ---------------------------------------------------------------------------
// AI parse operations — the contract the LLM must produce, validated before
// any operation is applied to the database.
// ---------------------------------------------------------------------------

export const CreateEventOperationSchema = z.object({
  action: z.literal('create_event'),
  event: z.object({
    child_id: z.number().int(),
    event_type: z.string(),
    occurred_at: IsoDateTime,
    source: SourceSchema.optional(),
    author: z.string().optional(),
    note: z.string().optional(),
  }),
  details: z
    .object({
      table: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
  raw_entry_id: z.number().int().optional(),
});
export type CreateEventOperation = z.infer<typeof CreateEventOperationSchema>;

export const UpdateDetailsOperationSchema = z.object({
  action: z.literal('update_details'),
  event_id: z.number().int(),
  table: z.string(),
  data: z.record(z.string(), z.unknown()),
  event_update: z.record(z.string(), z.unknown()).optional(),
  raw_entry_id: z.number().int().optional(),
});
export type UpdateDetailsOperation = z.infer<typeof UpdateDetailsOperationSchema>;

export const ParseOperationSchema = z.discriminatedUnion('action', [
  CreateEventOperationSchema,
  UpdateDetailsOperationSchema,
]);
export type ParseOperation = z.infer<typeof ParseOperationSchema>;

export const ParseResultSchema = z.object({
  operations: z.array(ParseOperationSchema),
  needs_review: z.boolean().optional(),
  note: z.string().optional(),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;
