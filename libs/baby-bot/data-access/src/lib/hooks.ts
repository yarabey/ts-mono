import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ActiveTimersResponseSchema,
  EventFilter,
  EventSchema,
  EventsResponseSchema,
  GrowthChartResponseSchema,
  PatternResponseSchema,
  RawEntriesResponseSchema,
  RawEntryStatus,
  SettingValueSchema,
  StatsResponseSchema,
} from '@acme/baby-bot-domain';
import { api } from './api-client.js';
import { queryKeys } from './query-keys.js';

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
