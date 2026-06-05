import type { Event } from './events.js';

/** Presentation helpers shared by the mini-app UI + features.
 * Native Intl/Date based (no dayjs). Russian locale. */

const RU_DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const RU_DATETIME = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '0м';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

/** Parse an ISO timestamp or a bare `YYYY-MM-DD` day key into a Date.
 * `new Date('2026-06-04')` is interpreted as UTC midnight, which shifts the
 * calendar day in non-UTC timezones (e.g. it renders as the previous day west
 * of UTC). Bare day keys are therefore parsed as *local* midnight instead. */
function parseDateInput(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return RU_DATE.format(parseDateInput(iso));
}

/** Calendar day (`YYYY-MM-DD`) of an ISO timestamp in the *local* timezone.
 * A plain `iso.slice(0, 10)` returns the UTC day, which pushes early-morning
 * events (e.g. anything before 03:00 in MSK / UTC+3) into the previous day. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function formatDateTime(iso: string): string {
  return RU_DATETIME.format(new Date(iso));
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMin = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

export function formatNumber(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '—';
  return `${n}${suffix}`;
}

export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nowLocalInput(now: Date = new Date()): string {
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 16);
}

export function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return nowLocalInput();
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function ageFromBirth(birthDate: string, now: Date = new Date()): string {
  const birth = new Date(birthDate);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  const anchor = new Date(birth);
  anchor.setMonth(anchor.getMonth() + months);
  const days = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / 86400000));
  if (months < 1) return `${days} дн`;
  if (days === 0) return `${months} мес`;
  return `${months} мес ${days} дн`;
}

export const EVENT_ICONS: Record<string, string> = {
  feeding: '🍼',
  sleep: '😴',
  diaper: '🧷',
  growth: '📏',
  health: '💊',
  milestone: '⭐',
  note: '📝',
  pumping: '🫙',
  bath: '🛁',
  walk: '🚶',
  weight: '⚖️',
  mood: '😊',
};

export const EVENT_LABELS: Record<string, string> = {
  feeding: 'Кормление',
  sleep: 'Сон',
  diaper: 'Подгузник',
  growth: 'Замеры',
  health: 'Здоровье',
  milestone: 'Достижение',
  note: 'Заметка',
  pumping: 'Сцеживание',
  bath: 'Купание',
  walk: 'Прогулка',
  weight: 'Вес',
  mood: 'Настроение',
};

export const eventLabel = (type: string): string => EVENT_LABELS[type] ?? type;
export const eventIcon = (type: string): string => EVENT_ICONS[type] ?? '📌';

type Detail = Record<string, unknown>;

/** Event types that carry a start/end interval (and can be "ongoing"). */
export const TIMED_EVENT_TYPES = ['feeding', 'sleep', 'walk', 'bath', 'pumping'];

/**
 * Resolve an event's effective start/end timing for editing and display.
 *
 * Imported (realm/CSV) or AI-parsed events may record only a `duration_min`
 * without an explicit `started_at`/`ended_at` — historically this made the
 * editor show `Конец == Начало` and never mark the event as ongoing. We treat
 * an event as still ongoing only when it has a start, no end, and no recorded
 * duration; otherwise we derive a sensible `ended_at` from the duration so the
 * end never collapses onto the start.
 */
export function resolveEventTiming(event: Event): {
  started_at: string;
  ended_at: string;
  is_open: boolean;
} {
  const d = (event.details ?? {}) as Detail;
  const timed = TIMED_EVENT_TYPES.includes(event.event_type);
  const dur = typeof d.duration_min === 'number' ? d.duration_min : null;
  const started = (d.started_at as string) ?? event.occurred_at;
  const isOpen = timed && !!d.started_at && !d.ended_at && dur == null;
  const ended =
    (d.ended_at as string) ??
    (dur != null ? new Date(new Date(started).getTime() + dur * 60000).toISOString() : started);
  return { started_at: started, ended_at: ended, is_open: isOpen };
}

export function isOpenEvent(event: Event): boolean {
  if (!event.details || !TIMED_EVENT_TYPES.includes(event.event_type)) return false;
  return resolveEventTiming(event).is_open;
}

function durationMin(d: Detail): number | null {
  if (d.duration_min != null) return d.duration_min as number;
  if (d.started_at && d.ended_at) {
    const min = Math.round((new Date(d.ended_at as string).getTime() - new Date(d.started_at as string).getTime()) / 60000);
    return min > 0 ? min : null;
  }
  return null;
}

/** Human-readable one-line summary of an event's details (Russian). */
export function eventSummary(event: Event): string {
  const d = event.details as Detail | null;
  if (!d) return event.note ?? '';
  const dur = durationMin(d);
  const parts: string[] = [];

  switch (event.event_type) {
    case 'feeding': {
      const t = d.feeding_type as string;
      if (t === 'breast') {
        parts.push('Грудь');
        const side = { left: 'левая', right: 'правая', both: 'обе' }[d.breast_side as string];
        if (side) parts.push(side);
        if (d.breast_side === 'both' && d.left_duration_min != null && d.right_duration_min != null) {
          parts.push(`Л: ${d.left_duration_min} мин, П: ${d.right_duration_min} мин`);
        } else if (dur) parts.push(`${dur} мин`);
        if (d.amount_ml) parts.push(`${d.amount_ml} мл`);
      } else if (t === 'bottle') {
        parts.push('Бутылочка');
        if (d.food_name) parts.push(String(d.food_name));
        if (d.amount_ml) parts.push(`${d.amount_ml} мл`);
      } else if (t === 'solid') {
        parts.push('Прикорм');
        if (d.food_name) parts.push(String(d.food_name));
      } else if (t === 'water') {
        parts.push('Вода');
        if (d.amount_ml) parts.push(`${d.amount_ml} мл`);
      }
      if (d.started_at && !d.ended_at) parts.push('идёт');
      return parts.join(', ');
    }
    case 'sleep':
      parts.push(d.sleep_type === 'night' ? 'Ночной' : 'Дневной');
      if (dur) parts.push(formatDuration(dur));
      if (d.started_at && !d.ended_at) parts.push('идёт');
      return parts.join(' ');
    case 'diaper':
      return ({ wet: 'Мокрый', dirty: 'Грязный', mixed: 'Смешанный' }[d.diaper_type as string]) ?? String(d.diaper_type);
    case 'growth':
      return d.height_cm ? `${d.height_cm} см` : '';
    case 'health':
      return String(d.description ?? d.health_type ?? '');
    case 'milestone':
      return String(d.title ?? d.description ?? '');
    case 'weight':
      return d.weight_kg ? `${d.weight_kg} кг` : event.note ?? '';
    case 'pumping': {
      const side = { left: 'Левая', right: 'Правая', both: 'Обе' }[d.breast_side as string];
      if (side) parts.push(side);
      if (d.amount_ml) parts.push(`${d.amount_ml} мл`);
      if (dur) parts.push(formatDuration(dur));
      return parts.join(', ') || event.note || 'Сцеживание';
    }
    case 'walk':
    case 'bath': {
      if (dur) parts.push(formatDuration(dur));
      if (d.started_at && !d.ended_at) parts.push('идёт');
      return parts.join(', ') || event.note || (event.event_type === 'walk' ? 'Прогулка' : 'Купание');
    }
    default:
      return event.note ?? '';
  }
}
