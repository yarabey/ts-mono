import type {
  BreastSide,
  DiaperType,
  EventType,
  FeedingType,
  MilestoneCategory,
  SleepQuality,
  SleepType,
} from './enums.js';

/**
 * Shared option lists + Russian label maps for the per-type event forms and
 * the summary formatter. Mirrors the literal sets `baby-ai`'s `AddEvent`
 * screen hard-codes inline, lifted into the domain so the form and the
 * `eventSummary`/Stats formatting stay in sync.
 */

/** Feeding sub-types offered as buttons (mixed is AI-only, not a form choice). */
export const FEEDING_TYPES = ['breast', 'bottle', 'solid', 'water'] as const;

export const FEEDING_TYPE_LABELS: Record<FeedingType, string> = {
  breast: 'Грудь',
  bottle: 'Бутылочка',
  solid: 'Прикорм',
  water: 'Вода',
  mixed: 'Смешанное',
};

/** Bottle "contents" presets; `other` switches the form to a free-text field. */
export const BOTTLE_CONTENTS = ['breast_milk', 'formula', 'water', 'other'] as const;
export type BottleContent = (typeof BOTTLE_CONTENTS)[number];

/** Persisted `food_name` values that map to a known label (vs. free text). */
export const BOTTLE_CONTENT_LABELS: Record<string, string> = {
  breast_milk: 'Грудное молоко',
  formula: 'Смесь',
  water: 'Вода',
  other: 'Другое',
};

export const BREAST_SIDE_LABELS: Record<BreastSide, string> = {
  left: 'левая',
  right: 'правая',
  both: 'обе',
};

/** Short side labels used on breast-feeding buttons (Л / П / Обе). */
export const BREAST_SIDE_SHORT_LABELS: Record<BreastSide, string> = {
  left: 'Л',
  right: 'П',
  both: 'Обе',
};

export const SLEEP_TYPE_LABELS: Record<SleepType, string> = {
  nap: 'Дневной',
  night: 'Ночной',
};

export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  good: 'Хорошо',
  normal: 'Нормально',
  bad: 'Плохо',
};

export const DIAPER_TYPE_LABELS: Record<DiaperType, string> = {
  wet: 'Мокрый',
  dirty: 'Грязный',
  mixed: 'Смешанный',
};

export const MILESTONE_CATEGORIES = [
  'motor',
  'speech',
  'social',
  'cognitive',
] as const;

export const MILESTONE_CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  motor: 'Моторика',
  speech: 'Речь',
  social: 'Социал.',
  cognitive: 'Познание',
};

/** Preset mood notes; the form also allows a free-text custom mood. */
export const MOOD_PRESETS = [
  'Плач',
  'Смех',
  'Спокойствие',
  'Капризы',
  'Игривое',
] as const;

/** Default order of the Dashboard quick-button grid (all 12 event types). */
export const DEFAULT_QUICK_BUTTON_TYPES: EventType[] = [
  'feeding',
  'pumping',
  'sleep',
  'diaper',
  'growth',
  'weight',
  'walk',
  'bath',
  'mood',
  'health',
  'milestone',
  'note',
];

/** Persisted quick-button config: a custom order plus a hidden set. */
export interface QuickButtonsConfig {
  order: string[];
  hidden: string[];
}

/**
 * Resolve the visible, ordered quick-button types from a stored config,
 * mirroring `baby-ai`: honour `order` (filtering hidden + unknown), then append
 * any remaining defaults not already placed.
 */
export function resolveQuickButtonTypes(
  config?: QuickButtonsConfig | null,
): EventType[] {
  if (!config) return DEFAULT_QUICK_BUTTON_TYPES;
  const hidden = new Set(config.hidden ?? []);
  const order = config.order ?? DEFAULT_QUICK_BUTTON_TYPES;
  const ordered = order.filter(
    (t): t is EventType =>
      !hidden.has(t) && DEFAULT_QUICK_BUTTON_TYPES.includes(t as EventType),
  );
  const remaining = DEFAULT_QUICK_BUTTON_TYPES.filter(
    (t) => !hidden.has(t) && !ordered.includes(t),
  );
  return [...ordered, ...remaining];
}
