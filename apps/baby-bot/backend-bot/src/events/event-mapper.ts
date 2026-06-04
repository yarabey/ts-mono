import type { Event as ApiEvent, EventType } from '@acme/baby-bot-domain';
import { isoOrNull, keysToCamel, keysToSnake, toUtcDate } from '../common/case';

/** Event types that carry a typed detail row, mapped to the Event relation
 * field name (same as the Prisma delegate, lower-cased). */
export const DETAIL_RELATION: Partial<Record<EventType, string>> = {
  feeding: 'feeding',
  sleep: 'sleep',
  diaper: 'diaper',
  growth: 'growth',
  weight: 'weight',
  walk: 'walk',
  health: 'health',
  milestone: 'milestone',
  pumping: 'pumping',
  bath: 'bath',
};

/** Prisma model delegate name for each event type's detail table. */
export const DETAIL_DELEGATE: Partial<Record<EventType, string>> = {
  feeding: 'eventFeeding',
  sleep: 'eventSleep',
  diaper: 'eventDiaper',
  growth: 'eventGrowth',
  weight: 'eventWeight',
  walk: 'eventWalk',
  health: 'eventHealth',
  milestone: 'eventMilestone',
  pumping: 'eventPumping',
  bath: 'eventBath',
};

/** Map the original SQLite detail table names (used by AI parse operations)
 * to the Prisma model delegate. */
export const TABLE_TO_DELEGATE: Record<string, string> = {
  event_feedings: 'eventFeeding',
  event_sleep: 'eventSleep',
  event_diapers: 'eventDiaper',
  event_growth: 'eventGrowth',
  event_weight: 'eventWeight',
  event_health: 'eventHealth',
  event_milestones: 'eventMilestone',
  event_pumping: 'eventPumping',
  event_walks: 'eventWalk',
  event_baths: 'eventBath',
};

/** Detail tables that carry a started_at column (default it to occurred_at). */
export const TABLES_WITH_STARTED_AT = new Set([
  'event_sleep',
  'event_feedings',
  'event_walks',
  'event_baths',
  'event_pumping',
]);

/** Relations to include when fetching an event for enrichment. */
export const EVENT_INCLUDE = {
  feeding: true,
  sleep: true,
  diaper: true,
  growth: true,
  weight: true,
  walk: true,
  health: true,
  milestone: true,
  pumping: true,
  bath: true,
  photos: true,
  rawEntry: { select: { emoji: true } },
} as const;

/** Detail columns that map to Prisma `DateTime` fields (camelCase). */
const DATETIME_DETAIL_FIELDS = ['startedAt', 'endedAt'] as const;

/** Build camelCased Prisma create data for a typed detail row. Datetime
 * columns are coerced to `Date` objects so Prisma never receives a bare
 * timezone-less string (e.g. an AI-produced "2026-06-04T05:23:04"), which it
 * rejects as non-ISO-8601. Unparseable timestamps are dropped rather than
 * forwarded — for `started_at` this lets the caller fall back to the event's
 * `occurred_at`. */
export function buildDetailData(details: Record<string, unknown>): Record<string, unknown> {
  const data = keysToCamel(details);
  for (const field of DATETIME_DETAIL_FIELDS) {
    if (data[field] == null) continue;
    const parsed = toUtcDate(data[field]);
    if (parsed) data[field] = parsed;
    else delete data[field];
  }
  return data;
}

/** Strip Prisma bookkeeping fields and convert a detail row to the API's
 * snake_case shape with ISO datetimes. */
function detailToApi(detail: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!detail) return null;
  const { id: _id, eventId: _eventId, ...rest } = detail;
  void _id;
  void _eventId;
  return keysToSnake(rest, { dropEmpty: false });
}

/** A Prisma event fetched with EVENT_INCLUDE relations. Detail relations are
 * accessed dynamically by name, hence the `unknown` index signature. */
export interface EnrichableEvent {
  id: number;
  childId: number;
  eventType: string;
  occurredAt: Date;
  source: string;
  author?: string | null;
  note?: string | null;
  rawEntryId?: number | null;
  rawEntry?: { emoji?: string | null } | null;
  photos?: Array<{ id: number; caption?: string | null }>;
  [relation: string]: unknown;
}

/** Convert a Prisma event (with EVENT_INCLUDE relations) to the API Event. */
export function enrichEvent(event: EnrichableEvent): ApiEvent {
  const relation = DETAIL_RELATION[event.eventType as EventType];
  const detail = relation ? (event[relation] as Record<string, unknown> | null) : null;

  const photoRow = Array.isArray(event.photos) && event.photos.length ? event.photos[0] : null;

  return {
    id: event.id,
    child_id: event.childId,
    event_type: event.eventType as ApiEvent['event_type'],
    occurred_at: event.occurredAt.toISOString(),
    source: event.source as ApiEvent['source'],
    author: event.author ?? null,
    note: event.note ?? null,
    raw_entry_id: event.rawEntryId ?? null,
    raw_entry_emoji: event.rawEntry?.emoji ?? null,
    details: detailToApi(detail) as ApiEvent['details'],
    photo: photoRow
      ? { id: photoRow.id, url: `/api/photos/${photoRow.id}`, caption: photoRow.caption ?? undefined }
      : null,
  };
}

/** ISO helper re-export for controllers/services. */
export { isoOrNull };
