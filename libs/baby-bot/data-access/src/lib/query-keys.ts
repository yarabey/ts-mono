/** Centralized TanStack Query keys for cache management/invalidation. */
export const queryKeys = {
  events: (params?: Record<string, unknown>) => ['events', params ?? {}] as const,
  event: (id: number) => ['event', id] as const,
  activeEvents: () => ['events', 'active'] as const,
  stats: (period: string, childId: number) => ['stats', period, childId] as const,
  pattern: (date: string | undefined, childId: number) => ['pattern', date ?? 'today', childId] as const,
  growthChart: (childId: number) => ['growth-chart', childId] as const,
  timers: () => ['timers', 'active'] as const,
  rawEntries: (params?: Record<string, unknown>) => ['raw-entries', params ?? {}] as const,
  setting: (key: string) => ['setting', key] as const,
  children: () => ['children'] as const,
};

/** Settings key under which quick-button visibility/order is persisted (JSON). */
export const QUICK_BUTTONS_SETTING_KEY = 'quick_buttons';
