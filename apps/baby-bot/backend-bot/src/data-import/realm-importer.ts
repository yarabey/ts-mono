/**
 * Realm → Postgres import loop, shared by the upload-triggered
 * `RealmImportService` and the one-shot `realm-import` Nx target.
 *
 * `realm` is a heavy native module deliberately kept OUT of the served bundle:
 * it is marked `external` in `project.json` and loaded here via a non-literal
 * dynamic `import()` so it is never statically bundled and is optional to
 * install (see ADR 0007). Importing a file simply requires the module to be
 * present at runtime; if it is not, `loadRealm()` rejects with a clear message.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { PrismaClient } from '../generated/client';
import { detailDelegate } from '../common/prisma-delegate';
import { EventItemSchema, mapRealmEvent, REALM_DETAIL_DELEGATE, type RealmEvent } from './realm-mapper';

export interface RealmImportResult {
  filesProcessed: number;
  eventsTotal: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function emptyRealmResult(): RealmImportResult {
  return { filesProcessed: 0, eventsTotal: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
}

interface RealmDb {
  objects(name: string): Iterable<RealmEvent>;
  close(): void;
  isClosed: boolean;
}
interface RealmModule {
  open(cfg: unknown): Promise<RealmDb>;
}

/** Dynamically load the optional native `realm` module. Rejects with an
 * actionable message when it isn't installed (e.g. the served container). */
export async function loadRealm(): Promise<RealmModule> {
  // Non-literal specifier so esbuild leaves it external (not bundled).
  const specifier = 'realm';
  try {
    const mod = (await import(specifier as string)) as { default?: RealmModule } & RealmModule;
    return (mod.default ?? mod) as RealmModule;
  } catch {
    throw new Error('Realm import is unavailable: the `realm` package is not installed. Run `pnpm add -w realm` to enable it.');
  }
}

/** Upsert a stream of Realm events into Postgres, deduplicating on `realmId`. */
export async function importRealmObjects(
  prisma: PrismaClient,
  items: Iterable<RealmEvent>,
  childId: number,
  result: RealmImportResult,
): Promise<void> {
  for (const item of items) {
    try {
      const mapped = mapRealmEvent(item);
      if (!mapped || !item.id) {
        result.skipped++;
        continue;
      }
      result.eventsTotal++;
      const occurredAt = item.date ?? new Date();
      const delegate = REALM_DETAIL_DELEGATE[mapped.eventType];
      const existing = await prisma.realmImport.findUnique({ where: { realmId: item.id } });

      if (existing?.eventId) {
        const old = await prisma.event.findUnique({ where: { id: existing.eventId } });
        if (old) {
          const oldDelegate = REALM_DETAIL_DELEGATE[old.eventType];
          if (oldDelegate) await detailDelegate(prisma, oldDelegate).deleteMany({ where: { eventId: old.id } });
          await prisma.event.update({ where: { id: existing.eventId }, data: { eventType: mapped.eventType as never, occurredAt, note: mapped.note ?? null } });
          if (mapped.details && delegate) await detailDelegate(prisma, delegate).create({ data: { eventId: existing.eventId, ...mapped.details } });
        }
        result.updated++;
      } else {
        const event = await prisma.event.create({ data: { childId, eventType: mapped.eventType as never, occurredAt, source: 'realm_import', note: mapped.note ?? null } });
        if (mapped.details && delegate) await detailDelegate(prisma, delegate).create({ data: { eventId: event.id, ...mapped.details } });
        await prisma.realmImport.create({ data: { realmId: item.id, eventId: event.id } });
        result.inserted++;
      }
    } catch (err) {
      result.errors.push(`item ${item.id}: ${(err as Error).message}`);
    }
  }
}

/** Open a single `.realm` file read-only and import its `EventItem`s. */
export async function importRealmFile(
  prisma: PrismaClient,
  Realm: RealmModule,
  filePath: string,
  childId: number,
  result: RealmImportResult,
): Promise<void> {
  const realm = await Realm.open({ path: filePath, readOnly: true, schema: [EventItemSchema] });
  try {
    await importRealmObjects(prisma, realm.objects('EventItem'), childId, result);
  } finally {
    if (!realm.isClosed) realm.close();
  }
}

/** Scan a directory for `.realm` files and import each (used by the Nx target). */
export async function importRealmDir(prisma: PrismaClient, dir: string, childId = 1): Promise<RealmImportResult> {
  const result = emptyRealmResult();
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) return result;
  const files = fs.readdirSync(resolved).filter((f) => f.endsWith('.realm')).sort();
  if (!files.length) return result;
  const Realm = await loadRealm();
  for (const fileName of files) {
    result.filesProcessed++;
    await importRealmFile(prisma, Realm, path.join(resolved, fileName), childId, result);
  }
  return result;
}
