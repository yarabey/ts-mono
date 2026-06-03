/**
 * One-shot Realm → Postgres importer, run via:
 *   pnpm nx run baby-bot-backend-bot:realm-import
 *
 * Batch sibling of the upload-triggered `RealmImportService`: both share the
 * mapping (`realm-mapper.ts`) and import loop (`realm-importer.ts`). `realm` is
 * a heavy native module kept OUT of the served bundle and loaded lazily (see
 * ADR 0007); install it (`pnpm add -w realm`) to run this.
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
