/**
 * One-shot Realm → Postgres importer, run via:
 *   pnpm nx run baby-bot-backend-bot:realm-import
 *
 * `realm` is a heavy native module deliberately kept OUT of the served backend
 * bundle (marked external in project.json and dynamically imported here). This
 * script talks to Postgres directly via the generated Prisma client.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '../generated/client';
import { detailDelegate } from '../common/prisma-delegate';

interface RealmEvent {
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

const EventItemSchema = {
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

const DETAIL_DELEGATE: Record<string, string> = {
  feeding: 'eventFeeding',
  sleep: 'eventSleep',
  diaper: 'eventDiaper',
  growth: 'eventGrowth',
  pumping: 'eventPumping',
  walk: 'eventWalk',
  weight: 'eventWeight',
};

const dateToIso = (d?: Date | null): string | null => (d ? d.toISOString() : null);
const durationMin = (a?: Date | null, b?: Date | null): number | null =>
  a && b ? Math.round((b.getTime() - a.getTime()) / 60000) : null;
const secToMin = (s?: number | null): number | null => (s == null ? null : Math.round(s / 60));

function mapRealmEvent(item: RealmEvent): { eventType: string; details: Record<string, unknown> | null; note?: string } | null {
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
      return {
        eventType: 'feeding',
        details: {
          feedingType: 'breast',
          breastSide,
          durationMin: dur,
          leftDurationMin: left,
          rightDurationMin: right,
          startedAt: dateToIso(item.leftStart) ?? dateToIso(item.rightStart) ?? undefined,
          endedAt: dateToIso(item.leftEnd) ?? dateToIso(item.rightEnd) ?? undefined,
        },
      };
    }
    case 'pumping': {
      let side: string | null = null;
      if (item.leftStart && item.rightStart) side = 'both';
      else if (item.leftStart) side = 'left';
      else if (item.rightStart) side = 'right';
      return { eventType: 'pumping', details: { breastSide: side, amountMl: item.bottleAmount ?? item.amount ?? null } };
    }
    case 'sleep':
      return {
        eventType: 'sleep',
        details: {
          sleepType: item.isDaySleep ? 'nap' : 'night',
          startedAt: dateToIso(item.leftStart) ?? undefined,
          endedAt: dateToIso(item.leftEnd) ?? undefined,
          durationMin: durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.singleTimerSeconds),
        },
      };
    case 'diaper': {
      const c = item.customComment?.toLowerCase() || '';
      const diaperType = c.includes('wet') || c.includes('мокр') ? 'wet' : c.includes('mixed') || c.includes('смешан') ? 'mixed' : 'dirty';
      return { eventType: 'diaper', details: { diaperType }, note: item.customComment || undefined };
    }
    case 'weight':
      return { eventType: 'weight', details: { weightKg: item.weight ?? item.amount ?? 0 } };
    case 'height':
      return { eventType: 'growth', details: { heightCm: item.height ?? item.amount ?? 0 } };
    case 'stroll':
      return {
        eventType: 'walk',
        details: {
          durationMin: durationMin(item.leftStart, item.leftEnd) ?? secToMin(item.singleTimerSeconds),
          startedAt: dateToIso(item.leftStart) ?? undefined,
          endedAt: dateToIso(item.leftEnd) ?? undefined,
        },
      };
    default:
      return null;
  }
}

async function main(): Promise<void> {
  const realmDir = path.resolve(process.env.REALM_DIR || './data/realm');
  if (!fs.existsSync(realmDir)) {
    console.log(`Realm dir ${realmDir} does not exist — nothing to import.`);
    return;
  }

  // Dynamic, non-literal specifier so the (optional, native) module is not a
  // hard build/type dependency. Install `realm` to actually run this.
  const realmSpecifier = 'realm';
  let Realm: { open: (cfg: unknown) => Promise<{ objects: (n: string) => Iterable<RealmEvent>; close: () => void; isClosed: boolean }> };
  try {
    Realm = (await import(realmSpecifier as string)).default ?? (await import(realmSpecifier as string));
  } catch {
    console.error('The `realm` package is not installed. Run `pnpm add -w realm` to enable Realm import.');
    process.exit(1);
    return;
  }

  const prisma = new PrismaClient();
  const childId = 1;
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  const files = fs.readdirSync(realmDir).filter((f) => f.endsWith('.realm')).sort();
  for (const fileName of files) {
    const filePath = path.join(realmDir, fileName);
    const realm = await Realm.open({ path: filePath, readOnly: true, schema: [EventItemSchema] });
    try {
      for (const item of realm.objects('EventItem')) {
        try {
          const mapped = mapRealmEvent(item);
          if (!mapped || !item.id) continue;
          const occurredAt = item.date ?? new Date();
          const delegate = DETAIL_DELEGATE[mapped.eventType];
          const existing = await prisma.realmImport.findUnique({ where: { realmId: item.id } });

          if (existing?.eventId) {
            const old = await prisma.event.findUnique({ where: { id: existing.eventId } });
            if (old) {
              const oldDelegate = DETAIL_DELEGATE[old.eventType];
              if (oldDelegate) await detailDelegate(prisma, oldDelegate).deleteMany({ where: { eventId: old.id } });
              await prisma.event.update({ where: { id: existing.eventId }, data: { eventType: mapped.eventType as never, occurredAt, note: mapped.note ?? null } });
              if (mapped.details && delegate) await detailDelegate(prisma, delegate).create({ data: { eventId: existing.eventId, ...mapped.details } });
            }
            updated++;
          } else {
            const event = await prisma.event.create({ data: { childId, eventType: mapped.eventType as never, occurredAt, source: 'realm_import', note: mapped.note ?? null } });
            if (mapped.details && delegate) await detailDelegate(prisma, delegate).create({ data: { eventId: event.id, ...mapped.details } });
            await prisma.realmImport.create({ data: { realmId: item.id, eventId: event.id } });
            inserted++;
          }
        } catch (err) {
          errors.push(`item ${item.id}: ${(err as Error).message}`);
        }
      }
    } finally {
      if (!realm.isClosed) realm.close();
    }
  }

  await prisma.$disconnect();
  console.log(`Realm import done: ${inserted} inserted, ${updated} updated, ${errors.length} errors.`);
  if (errors.length) console.error(errors.slice(0, 20).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
