# Data import

Two sources feed the `events` tables: **CSV** (self-service) and **Realm**
(offline, one-time migration from the legacy mobile app).

## CSV import

Supported in the deployed Mini App and the backend:

- **Mini App → Профиль → «Импорт CSV»** uploads a `.csv` to `POST /api/import/upload`.
- **`CSV_DIR` scan** — files dropped in `CSV_DIR` are imported by a cron job
  (`CsvImportService`, every 5 min) and on demand.

Columns: `Дата и время, Событие, Тип, Значение, Значение.Число, Начало,
Окончание, Комментарий`. Timed events (сон, прогулка, кормление грудью,
сцеживание) keep their `Начало`/`Окончание`; when `Окончание` is empty the end
is derived from start + duration (`csv-mapper.ts`).

## Realm import (offline / admin only)

Realm import is a **one-time historical migration** and is intentionally **not**
available in the deployed Mini App or the served backend.

Why: the `realm` npm package is **deprecated** and heavy (~1 GB installed — the
tarball bundles Android/iOS prebuilds). Only `realm@12` still supports Node, and
its native binary is downloaded from `static.realm.io` at install time. Baking
that into the always-on backend container (ADR 0007) is not worth it for a
migration that runs once. The native module is therefore loaded lazily and used
**only** from the `realm-import` Nx target (`realm-import.script.ts`), which
shares its mapping/loop with `realm-mapper.ts` / `realm-importer.ts`.

### Procedure

Run from a checkout that can reach the target Postgres (see "Reaching the prod
DB" below):

```bash
# 1. Install the Node-capable Realm build (needs network to static.realm.io).
pnpm add -w realm@12

# 2. Put the .realm file(s) where the importer looks (defaults to ./data/realm).
mkdir -p data/realm && cp /path/to/default.realm data/realm/

# 3. Point at the target DB and run the one-shot import.
DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB" \
REALM_DIR="./data/realm" \
  pnpm nx run baby-bot-backend-bot:realm-import
```

The import is idempotent — it dedupes on `realmId` (`realm_import` table), so
re-running updates rather than duplicates.

### Reaching the prod DB

The production Postgres runs inside the compose stack and is **not** published to
the host (`infra/baby-bot/docker-compose.yml`). To import against it, open a
temporary path to it, e.g. an SSH tunnel from your machine to the server and a
short-lived port mapping on the `postgres` service, then set `DATABASE_URL`
through the tunnel. Remove the temporary exposure when done.

If an operator uploaded a `.realm` via the Mini App before it was hidden, the
file is persisted in the backend's data volume at `REALM_DIR` (`/app/data/realm`);
copy it out with `docker compose cp backend:/app/data/realm/<file> .` and import
it with the procedure above.
