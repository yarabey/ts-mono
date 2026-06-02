## 1. Foundation — domain contracts & database

- [x] 1.1 Populate `libs/baby-bot/domain` with Zod contracts + inferred types for event types, sources, raw-entry statuses, all event detail shapes, and request/response DTOs (single source of truth replacing both `src/types/index.ts` files)
- [x] 1.2 Add WHO percentile data into the domain (or a util) for growth calculations
- [x] 1.3 Author `apps/baby-bot/backend-bot/prisma/schema.prisma` modeling all 20 tables (Child, User, Event + 11 detail models, RawEntry, Photo, CsvImport, RealmImport, UserSetting, AuthorizedChat, Timer, EventRawEntry) with Prisma enums, DateTime, cascades
- [x] 1.4 Create the initial Prisma migration and wire Nx `prisma-generate` / `prisma-migrate` / `prisma-seed` targets in `project.json`
- [x] 1.5 Add a Postgres service to `docker-compose.yml` for local dev and document the connection string / `.env.example`
- [x] 1.6 Verify: `pnpm nx build baby-bot-domain` and `prisma generate` succeed

## 2. Backend bootstrap (NestJS + Fastify)

- [x] 2.1 Replace the `backend-bot` stub with a NestJS app on the Fastify adapter (main.ts, app.module.ts) mirroring `apps/sample/backend`; add build/serve/test targets to `project.json`
- [x] 2.2 Add a `PrismaModule`/service and a `ConfigModule` exposing all env vars (PORT, JWT_SECRET, ACCESS_CODE, TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, ZAI_*, SOCKS5 proxy, DATA_DIR/CSV_DIR/REALM_DIR/UPLOADS_DIR)
- [x] 2.3 Add a global exception filter producing `{ error: "..." }` with correct status codes and Nest structured logging
- [x] 2.4 Add `JwtAuthGuard` protecting all `/api/*` routes except auth endpoints

## 3. Backend — core domains

- [x] 3.1 `auth` module: Telegram initData HMAC verify + access-code login → JWT (satisfies **authentication**)
- [x] 3.2 `events` module: CRUD, list with filters/pagination, single-event enrichment, quick feeding/diaper, active/close lifecycle (satisfies **event-tracking**)
- [x] 3.3 `timers` module: start/stop (auto-create event w/ duration), list active with elapsed (satisfies **event-tracking** timers)
- [x] 3.4 `photos` module: upload (type/size limits), serve by id, link to event (satisfies **event-tracking** photos)
- [x] 3.5 `settings` module: per-user key/value get/set (satisfies **authentication** settings)
- [x] 3.6 `stats` module: period aggregation, pattern timeline, growth chart + WHO percentiles, wake windows, milk balance — using TypedSQL `.sql` files in `prisma/sql/` with Zod-validated results (satisfies **statistics**)
- [x] 3.7 `raw-entries` module: list with status filter/pagination + retry action (satisfies **ai-entry-parsing** retry surface)
- [x] 3.8 Port the markdown-diary writer as a config-gated side effect of raw-entry creation

## 4. Backend — ingestion, AI & import

- [x] 4.1 `telegram` module: polling bot over SOCKS5, commands, intent detection → query responder vs raw-entry, Whisper voice transcription, authorized-chat gating (satisfies **message-ingestion**)
- [x] 4.2 `alice` module: webhook storing raw entries + valid Alice response (satisfies **message-ingestion**)
- [x] 4.3 `notifications` service: threshold monitoring + Telegram alerts honoring per-user settings (satisfies **message-ingestion**)
- [x] 4.4 `ai-processor` module: scheduled (`@nestjs/schedule`) LLM parse of pending entries, Zod-validated `create_event`/`update_details` operations applied transactionally, status lifecycle + transient/permanent/needs_review handling, link events to raw entries (satisfies **ai-entry-parsing**)
- [x] 4.5 `data-import`: CSV importer (mapping + dedup by row hash, source `csv_import`) + Realm importer isolated behind an Nx target/script with `realm` marked external; authenticated upload endpoint (satisfies **data-import**)
- [x] 4.6 Serve the built mini-app static assets from the backend (parity with current single-process serving) or document the chosen serving strategy

## 5. Frontend — data-access, ui, feature

- [x] 5.1 `libs/baby-bot/data-access`: TanStack Query hooks (events, stats, timers, raw-entries) + mutations over one `QueryClientProvider` (staleTime 30s/gcTime 5min), Zod-validating responses; replaces SWR (satisfies **mini-app** server state)
- [x] 5.2 `libs/baby-bot/ui`: port presentational components (EventCard, Timer, BottomSheet, Spinner, TabBar, QuickButtons, Skeleton, etc.) to CSS Modules (translate Tailwind)
- [x] 5.3 `libs/baby-bot/feature-main`: port screens (Dashboard, AddEvent, Journal, Stats, Pattern, GrowthChart, Profile) composing data-access + ui
- [x] 5.4 Zustand stores for client/UI state (sheets, toasts, active-timer display, offline queue) — no server-data mirroring

## 6. Frontend — mini-app shell

- [x] 6.1 Replace the `mini-app` stub with a React/Vite app shell: router, `QueryClientProvider`, providers, Telegram SDK init; add build/serve/test targets
- [x] 6.2 Implement auth flow: Telegram initData/access-code → JWT, attach to requests, 401 → re-auth/logout (satisfies **mini-app** authenticated access)
- [x] 6.3 Wire screens into routes and verify the full UI renders against a running backend

## 7. Tests

- [x] 7.1 Backend Jest specs against throwaway Postgres: events CRUD, auth, timers, stats aggregation, ai-processor (LLM mocked), csv-import, notifications, raw-entries, prisma schema round-trip
- [x] 7.2 Lib/mini-app Vitest + RTL + MSW specs: data-access hooks, domain Zod schemas, formatters, key components/screens
- [x] 7.3 Ensure boundary tags (`scope:baby-bot`, `type:*`) are correct so `@nx/enforce-module-boundaries` passes

## 8. Verify & document

- [x] 8.1 Run `pnpm nx run-many -t lint test build` (and `pnpm nx affected ...`) green for all baby-bot projects
- [x] 8.2 Boot `pnpm nx serve baby-bot-backend-bot` against local Postgres, serve the mini-app, and smoke-test: create event, quick action, timer start/stop, stats, AI parse of a raw entry, auth — confirm it runs correctly
- [x] 8.3 Update root docs/AGENTS.md for the baby-bot product; record ADR(s) only for any unavoidable off-allowlist dependency (e.g. `node-telegram-bot-api`, `realm`)
- [x] 8.4 Remove or explicitly leave-as-stub the unused `web` and `backend-orders` baby-bot scaffolds per scope decision
