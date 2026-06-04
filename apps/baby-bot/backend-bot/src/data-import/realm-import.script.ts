/**
 * One-shot Realm → Postgres importer, run via:
 *   pnpm nx run baby-bot-backend-bot:realm-import
 *
 * Offline, one-time historical migration. `realm` is a heavy, deprecated native
 * module kept OUT of the served backend (ADR 0007) and loaded lazily here; the
 * shared mapping (`realm-mapper.ts`) and import loop (`realm-importer.ts`) are
 * only used from this entrypoint. Install the Node-capable build first:
 * `pnpm add -w realm@12`. See `README.md` for the full procedure.
 */
import * as path from 'path';
import { PrismaClient } from '../generated/client';
import { importRealmDir } from './realm-importer';

async function main(): Promise<void> {
  const realmDir = path.resolve(process.env.REALM_DIR || './data/realm');
  const prisma = new PrismaClient();
  try {
    const r = await importRealmDir(prisma, realmDir);
    if (!r.filesProcessed) {
      console.log(`No .realm files found in ${realmDir} — nothing to import.`);
      return;
    }
    console.log(`Realm import done: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped, ${r.errors.length} errors.`);
    if (r.errors.length) console.error(r.errors.slice(0, 20).join('\n'));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
