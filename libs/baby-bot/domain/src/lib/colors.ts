import type { EventType } from './enums.js';

/**
 * Pattern timeline event colors — the 8 colors `baby-ai` uses for the 24-hour
 * color-coded bar chart. Ported from the reference's Tailwind palette
 * (indigo/orange/green/yellow/teal/cyan/pink/red `-400` shades) to concrete
 * hex values, mirrored as `--bb-pattern-*` CSS variables in the mini-app's
 * `index.css`. Event types without a dedicated color fall back to muted grey.
 */
export const PATTERN_EVENT_COLORS: Partial<Record<EventType, string>> = {
  sleep: '#818cf8', // indigo-400
  feeding: '#fb923c', // orange-400
  diaper: '#4ade80', // green-400
  pumping: '#facc15', // yellow-400
  walk: '#2dd4bf', // teal-400
  bath: '#22d3ee', // cyan-400
  mood: '#f472b6', // pink-400
  weight: '#f87171', // red-400
};

/** Fallback bar color for event types not in {@link PATTERN_EVENT_COLORS}. */
export const PATTERN_FALLBACK_COLOR = '#9ca3af'; // gray-400

export function patternColor(eventType: string): string {
  return (
    PATTERN_EVENT_COLORS[eventType as EventType] ?? PATTERN_FALLBACK_COLOR
  );
}
