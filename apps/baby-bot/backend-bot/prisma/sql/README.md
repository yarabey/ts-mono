# TypedSQL queries (stats hot paths)

These `.sql` files are the canonical aggregation queries for the stats module
(per the Raw-SQL Policy: complex multi-join / aggregation hot paths, not CRUD).

They are authored for Prisma **TypedSQL**. To generate the typed
`$queryRawTyped(...)` functions, run against a provisioned database:

    DATABASE_URL=... pnpm nx run baby-bot-backend-bot:prisma-generate   # includes --sql

Because TypedSQL generation requires a live database (unavailable in CI, which
runs lint/test/build only, and in offline dev), `stats.service.ts` currently
executes the *same* queries via parameterized `prisma.$queryRaw` with
Zod-validated results. Switching to `$queryRawTyped` is a drop-in once the
typed client is generated. Parameters are positional: `$1`=child_id,
`$2`=from (timestamptz), `$3`=to (timestamptz).
