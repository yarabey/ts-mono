/**
 * Pure Realm → event mapping, shared by the in-process import service
 * (`realm-import.service.ts`, triggered from the upload endpoint) and the
 * one-shot `realm-import` Nx target. No `realm`, Prisma, or NestJS imports here
 * so it stays trivially unit-testable.
 */

export interface RealmEvent {
  id: string;
  type?: string;
  date?: Date;
  bottleAmount?: number;
  mixType?: string;
  leftStart?: Date;
  leftEnd?: Date;
  rightStart?: Date;
  rightEnd?: Date;
  doubleLeftTimerSeconds?: number;
  doubleRightTimerSeconds?: number;
  singleTimerSeconds?: number;
  isDaySleep?: boolean;
  customComment?: string;
  weight?: number;
  height?: number;
  stroll?: boolean;
  amount?: number;
}

/** Realm object schema passed to `Realm.open` (read-only). */
export const EventItemSchema = {
  name: 'EventItem',
  primaryKey: 'id',
  properties: {
    id: 'string',
    type: 'string?',
    date: 'date?',
    bottleAmount: 'double?',
    mixType: 'string?',
    leftStart: 'date?',
    leftEnd: 'date?',
    rightStart: 'date?',
    rightEnd: 'date?',
    doubleLeftTimerSeconds: 'double?',
    doubleRightTimerSeconds: 'double?',
    singleTimerSeconds: 'double?',
    isDaySleep: 'bool?',
    customComment: 'string?',
    weight: 'double?',
    height: 'double?',
    stroll: 'bool?',
    amount: 'double?',
  },
};

/** Prisma model delegate per event type's detail table. */
export const REALM_DETAIL_DELEGATE: Record<string, string> = {
  feeding: 'eventFeeding',
  sleep: 'eventSleep',
  diaper: 'eventDiaper',
  growth: 'eventGrowth',
  pumping: 'eventPumping',
  walk: 'eventWalk',
  weight: 'eventWeight',
};

export interface MappedRealm {
  eventType: string;
  details: Record<string, unknown> | null;
  note?: string;
}

const dateToIso = (d?: Date | null): string | null => (d ? d.toISOString() : null);
const durationMin = (a?: Date | null, b?: Date | null): number | null =>
  a && b ? Math.round((b.getTime() - a.getTime()) / 60000) : null;
const secToMin = (s?: number | null): number | null => (s == null ? null : Math.round(s / 60));
const addMin = (d?: Date | null, min?: number | null): Date | null =>
  d && min != null ? new Date(d.getTime() + min * 60000) : null;

/** Map a single Realm `EventItem` to an event type + camelCase detail payload
 * (camelCase because Realm details are written straight to Prisma). */
export function mapRealmEvent(item: RealmEvent): MappedRealm | null {
  switch (item.type) {
    case 'bottle':
      return { eventType: 'feeding', details: { feedingType: 'bottle', amountMl: item.bottleAmount ?? 0, foodName: item.mixType || null } };
    case 'lactation': {
      const hasLeft = !!item.leftStart;
      const hasRight = !!item.rightStart;
      let breastSide: string | null = null;
      let left: number | null = null;
      let right: number | null = null;
      let dur: number | null = null;
      if (hasLeft && hasRight) {
        breastSide = 'both';
        left = durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.doubleLeftTimerSeconds);
        right = durationMin(item.rightStart, item.rightEnd) ?? secToMin(item.doubleRightTimerSeconds);
        dur = (left ?? 0) + (right ?? 0) || null;
      } else if (hasLeft) {
        breastSide = 'left';
        left = durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.doubleLeftTimerSeconds);
        dur = left;
      } else if (hasRight) {
        breastSide = 'right';
        right = durationMin(item.rightStart, item.rightEnd) ?? secToMin(item.doubleRightTimerSeconds);
        dur = right;
      }
      const start = item.leftStart ?? item.rightStart ?? item.date ?? null;
      const end = item.leftEnd ?? item.rightEnd ?? addMin(start, dur);
      return {
        eventType: 'feeding',
        details: {
          feedingType: 'breast',
          breastSide,
          durationMin: dur,
          leftDurationMin: left,
          rightDurationMin: right,
          startedAt: dateToIso(start) ?? undefined,
          endedAt: dateToIso(end) ?? undefined,
        },
      };
    }
    case 'pumping': {
      let side: string | null = null;
      if (item.leftStart && item.rightStart) side = 'both';
      else if (item.leftStart) side = 'left';
      else if (item.rightStart) side = 'right';
      const start = item.leftStart ?? item.rightStart ?? item.date ?? null;
      const dur =
        durationMin(item.leftStart, item.leftEnd) ??
        durationMin(item.rightStart, item.rightEnd) ??
        secToMin(item.singleTimerSeconds);
      const end = item.leftEnd ?? item.rightEnd ?? addMin(start, dur);
      return {
        eventType: 'pumping',
        details: {
          breastSide: side,
          amountMl: item.bottleAmount ?? item.amount ?? null,
          durationMin: dur,
          startedAt: dateToIso(start) ?? undefined,
          endedAt: dateToIso(end) ?? undefined,
        },
      };
    }
    case 'sleep': {
      // Realm sleeps record the moment in `date` with the length in
      // `singleTimerSeconds` (the breast-timer fields are unused); derive the
      // end from start + duration so it isn't collapsed onto the start.
      const start = item.leftStart ?? item.date ?? null;
      const dur = durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.singleTimerSeconds);
      const end = item.leftEnd ?? addMin(start, dur);
      return {
        eventType: 'sleep',
        details: {
          sleepType: item.isDaySleep ? 'nap' : 'night',
          startedAt: dateToIso(start) ?? undefined,
          endedAt: dateToIso(end) ?? undefined,
          durationMin: dur,
        },
      };
    }
    case 'diaper': {
      const c = item.customComment?.toLowerCase() || '';
      const diaperType = c.includes('wet') || c.includes('мокр') ? 'wet' : c.includes('mixed') || c.includes('смешан') ? 'mixed' : 'dirty';
      return { eventType: 'diaper', details: { diaperType }, note: item.customComment || undefined };
    }
    case 'weight':
      return { eventType: 'weight', details: { weightKg: item.weight ?? item.amount ?? 0 } };
    case 'height':
      return { eventType: 'growth', details: { heightCm: item.height ?? item.amount ?? 0 } };
    case 'stroll': {
      const start = item.leftStart ?? item.date ?? null;
      const dur = durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.singleTimerSeconds);
      const end = item.leftEnd ?? addMin(start, dur);
      return {
        eventType: 'walk',
        details: {
          durationMin: dur,
          startedAt: dateToIso(start) ?? undefined,
          endedAt: dateToIso(end) ?? undefined,
        },
      };
    }
    default:
      return null;
  }
}
