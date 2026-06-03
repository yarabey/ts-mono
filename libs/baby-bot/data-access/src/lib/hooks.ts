import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ActiveTimersResponseSchema,
  ChildrenResponseSchema,
  EventFilter,
  EventSchema,
  EventsResponseSchema,
  GrowthChartResponseSchema,
  PatternResponseSchema,
  type QuickButtonsConfig,
  RawEntriesResponseSchema,
  RawEntryStatus,
  resolveQuickButtonTypes,
  SettingValueSchema,
  StatsResponseSchema,
} from '@acme/baby-bot-domain';
import { api } from './api-client.js';
import { queryKeys, QUICK_BUTTONS_SETTING_KEY } from './query-keys.js';

/** Page size for the Journal's infinite-scroll feed. */
export const EVENTS_PAGE_SIZE = 30;

const ActiveEventsSchema = z.object({ events: z.array(EventSchema) });

export function useEvents(filter: EventFilter = {}) {
  return useQuery({
    queryKey: queryKeys.events(filter),
    queryFn: async () => EventsResponseSchema.parse(await api.events.list(filter as Record<string, string | number>)),
  });
}

export function useEvent(id: number | null) {
  return useQuery({
    queryKey: queryKeys.event(id ?? 0),
    queryFn: async () => EventSchema.parse(await api.events.get(id as number)),
    enabled: id != null,
  });
}

export function useActiveEvents() {
  return useQuery({
    queryKey: queryKeys.activeEvents(),
    queryFn: async () => ActiveEventsSchema.parse(await api.events.active()),
    refetchInterval: 30_000,
  });
}

export function useStats(period: string, childId = 1) {
  return useQuery({
    queryKey: queryKeys.stats(period, childId),
    queryFn: async () => StatsResponseSchema.parse(await api.stats.get(period, childId)),
  });
}

export function usePattern(date: string | undefined, childId = 1) {
  return useQuery({
    queryKey: queryKeys.pattern(date, childId),
    queryFn: async () => PatternResponseSchema.parse(await api.stats.pattern(date, childId)),
  });
}

export function useGrowthChart(childId = 1) {
  return useQuery({
    queryKey: queryKeys.growthChart(childId),
    queryFn: async () => GrowthChartResponseSchema.parse(await api.stats.growthChart(childId)),
  });
}

export function useTimers() {
  return useQuery({
    queryKey: queryKeys.timers(),
    queryFn: async () => ActiveTimersResponseSchema.parse(await api.timers.active()),
    refetchInterval: 10_000,
  });
}

export function useRawEntries(params: { status?: RawEntryStatus; limit?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.rawEntries(params),
    queryFn: async () => RawEntriesResponseSchema.parse(await api.rawEntries.list(params as Record<string, string | number>)),
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.setting(key),
    queryFn: async () => SettingValueSchema.parse(await api.settings.get(key)),
  });
}

export function useChildren() {
  return useQuery({
    queryKey: queryKeys.children(),
    queryFn: async () => ChildrenResponseSchema.parse(await api.children.list()),
  });
}

/** The active child (defaults to the first). `id` selects a specific child. */
export function useChild(id?: number) {
  const query = useChildren();
  const children = query.data?.children ?? [];
  const child = id != null ? children.find((c) => c.id === id) : children[0];
  return { ...query, data: child };
}

/**
 * Journal feed with offset pagination. Each page is an `EventsResponse`; the
 * next-page param advances by `offset + limit` until all `total` rows load.
 */
export function useInfiniteEvents(filter: Omit<EventFilter, 'limit' | 'offset'> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.events({ ...filter, infinite: true }),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      EventsResponseSchema.parse(
        await api.events.list({
          ...(filter as Record<string, string | number>),
          limit: EVENTS_PAGE_SIZE,
          offset: pageParam as number,
        }),
      ),
    getNextPageParam: (last) => {
      const next = last.offset + last.limit;
      return next < last.total ? next : undefined;
    },
  });
}

const QuickButtonsConfigSchema = z.object({
  order: z.array(z.string()).default([]),
  hidden: z.array(z.string()).default([]),
});

/**
 * Quick-button visibility/order, persisted as a single JSON `{ order, hidden }`
 * config under {@link QUICK_BUTTONS_SETTING_KEY}. `config` is `null` when unset;
 * `types` is always the resolved, ordered list of visible event types.
 */
export function useQuickButtons() {
  const query = useSetting(QUICK_BUTTONS_SETTING_KEY);
  let config: QuickButtonsConfig | null = null;
  const raw = query.data?.value;
  if (raw) {
    try {
      config = QuickButtonsConfigSchema.parse(JSON.parse(raw));
    } catch {
      config = null;
    }
  }
  return { ...query, config, data: resolveQuickButtonTypes(config) };
}
