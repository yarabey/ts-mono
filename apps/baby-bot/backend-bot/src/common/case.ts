/** snake_case <-> camelCase helpers for translating between the API's
 * snake_case detail payloads and Prisma's camelCase model fields. */

export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Convert a flat object's keys snake_case -> camelCase. */
export function keysToCamel<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[snakeToCamel(k)] = v;
  return out;
}

/** Convert a flat object's keys camelCase -> snake_case, turning Date values
 * into ISO strings and dropping null/undefined. */
export function keysToSnake(
  obj: Record<string, unknown>,
  { dropEmpty = true }: { dropEmpty?: boolean } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (dropEmpty && (v === null || v === undefined)) continue;
    out[camelToSnake(k)] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/** ISO string for a Date, or null. */
export function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/**
 * Coerce a wire datetime into a Date. A naked ISO datetime carrying no zone
 * designator (e.g. "2026-06-04T05:23:04" — no trailing `Z`, no `±HH:MM`
 * offset) is interpreted as UTC, matching the rest of the wire format. This
 * keeps Prisma from ever seeing a string it rejects as non-ISO-8601 ("premature
 * end of input"). Returns `null` for empty / unparseable input.
 */
export function toUtcDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  const naked = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s);
  const d = new Date(naked ? `${s}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}
