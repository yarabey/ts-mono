## Context

`baby-ai` is a working single-process app (raw Fastify + SQLite + SWR + Tailwind) that tracks a baby's development. Inbound data arrives three ways: a Telegram bot (text/voice, polling over a SOCKS5 proxy), an Alice voice-skill webhook, and structured input from a React Telegram Mini App. Free-form text/voice lands in a `raw_entries` queue and is parsed asynchronously by an LLM (ZAI/GLM) into structured events. It exposes ~30 JWT-protected REST endpoints and aggregates stats (feeding/sleep/diaper, wake windows, milk balance, WHO growth percentiles).

ts-mono is an Nx domain-first monorepo with a strict allowlist (NestJS+Fastify, PostgreSQL+Prisma, TanStack Query, Zustand, Zod, CSS Modules, Vitest/RTL/MSW + Jest) enforced by `@nx/enforce-module-boundaries`. A `baby-bot` scope is scaffolded but empty: `apps/baby-bot/{web,mini-app,backend-bot,backend-orders}` and `libs/baby-bot/{domain,data-access,ui,feature-main}`, with `@acme/baby-bot-*` path aliases already in `tsconfig.base.json`. The `sample` product is the reference implementation (NestJS backend with Prisma + TypedSQL, React web with TanStack Query data-access lib, Zustand UI store).

The user has chosen a **full rewrite onto the allowlist** (not a lift-and-shift) targeting **two apps**: `backend-bot` and `mini-app`.

## Goals / Non-Goals

**Goals:**
- Reproduce baby-ai's full behavior on the approved stack with no feature regressions in the event/stats/timer/auth/import/ingestion/AI flows.
- Establish the canonical `baby-bot` layout other future baby-bot apps can build on (domain → data-access → ui → feature → app).
- Share one set of Zod contracts between backend and mini-app via `libs/baby-bot/domain`.
- Pass `pnpm nx run-many -t lint test build` for all new projects, and have `backend-bot` boot and serve the mini-app against a local Postgres.
- Keep raw-SQL aggregation fast via Prisma TypedSQL where the Prisma Client API is suboptimal.

**Non-Goals:**
- Migrating live SQLite data into Postgres (the CSV/Realm importers cover historical backfill; a one-shot SQLite→Postgres script is out of scope).
- Populating the `web` and `backend-orders` baby-bot apps.
- Production TLS/ingress/Let's Encrypt wiring (the standalone in-process HTTPS is dropped; deployment follows monorepo Docker conventions).
- Changing the AI provider, the WHO percentile data, or the Telegram/Alice UX.

## Decisions

### 1. Backend: NestJS modules mirroring the route groups
Each Fastify route file becomes a NestJS module (controller + service + Prisma access): `events`, `stats`, `timers`, `auth`, `photos`, `import`, `raw-entries`, `settings`, plus `telegram`, `alice`, and an `ai-processor` background module. Fastify adapter (`@nestjs/platform-fastify`) keeps Fastify's perf and matches the sample backend. Cross-cutting concerns become Nest primitives: JWT auth → a `JwtAuthGuard` (replacing the manual middleware), global error shape `{ error: "..." }` → an exception filter, structured logging → Nest logger. Cron jobs (AI parse every 5 min, CSV autoimport) → `@nestjs/schedule`.
- *Alternatives*: Keep raw Fastify (rejected — off allowlist). One giant module (rejected — loses boundary clarity and testability).

### 2. Database: Prisma schema reauthored from the 20 SQLite tables; TypedSQL for stats
One Prisma model per table: `Child`, `User`, `Event` + 11 typed detail models (`EventFeeding`, `EventSleep`, `EventDiaper`, `EventGrowth`, `EventWeight`, `EventHealth`, `EventMilestone`, `EventPumping`, `EventWalk`, `EventBath`), `RawEntry`, `Photo`, `CsvImport`, `RealmImport`, `UserSetting`, `AuthorizedChat`, `Timer`, `EventRawEntry` junction. SQLite-isms are upgraded: `TEXT` enums → Prisma enums (event_type, source, raw_entry_status, feeding_type, etc.); `INTEGER` epoch/`TEXT` ISO timestamps → `DateTime`; booleans real booleans. Detail tables key off `eventId` (1:1 with `Event`, cascade delete). The stats aggregation (the one perf-sensitive, multi-join/window area) uses **TypedSQL** `.sql` files in `prisma/sql/` per the Raw-SQL Policy; all raw results are Zod-parsed. Ordinary CRUD uses the Prisma Client API.
- *Alternatives*: Keep SQLite (rejected — off allowlist). Port hand-written SQL migrations verbatim via `$executeRawUnsafe` (rejected — violates Raw-SQL Policy). Do stats in Prisma Client only (rejected — wake-window/milk-balance aggregations are awkward and slow without SQL).

### 3. Domain library owns Zod contracts; types derive from them
`libs/baby-bot/domain` exports Zod schemas for every event type + detail, sources, statuses, request/response DTOs, and `z.infer` types. Backend validates inbound DTOs and parses LLM/CSV/Realm output against these; mini-app validates API responses at the fetch boundary. Single source of truth eliminates the current drift between `src/types/index.ts` and `mini-app/src/types/index.ts`.
- *Alternatives*: Separate backend/frontend types (rejected — that's the duplication we're removing). Prisma-generated types as the contract (rejected — Prisma types leak DB shape and aren't available to the browser; Zod gives runtime validation).

### 4. Mini-app: TanStack Query in data-access, Zustand for UI, CSS Modules
Server-state hooks (`useEvents`, `useStats`, `useTimers`, `useRawEntries`, mutations) move from SWR in `mini-app/src/api` into typed hooks in `libs/baby-bot/data-access` over one `QueryClientProvider` (staleTime 30s / gcTime 5min per AGENTS.md). Ephemeral UI state (sheets, toasts, active-timer display, offline queue) → Zustand stores. Reusable presentational components (EventCard, Timer, BottomSheet, Spinner, TabBar, etc.) → `libs/baby-bot/ui` with CSS Modules. Screens (Dashboard, AddEvent, Journal, Stats, Pattern, GrowthChart, Profile) compose in `libs/baby-bot/feature-main`; the app shell + router + providers stay in `apps/baby-bot/mini-app`. Tailwind utility classes are translated to CSS Modules.
- *Alternatives*: Keep SWR/Tailwind behind ADRs (rejected — user chose full conformance). Put hooks in the app (rejected — violates data-access boundary; not reusable).

### 5. Telegram/Alice/Whisper/SOCKS5/AI carried over behind interfaces, config-driven
Ingestion logic (intent detection, query responder, voice transcription, storage→raw_entries, notifications) ports nearly verbatim into Nest services, but hardcoded externals become config: SOCKS5 proxy URL, Whisper key, ZAI base/key/model, JWT secret, access code, data dirs — all via Nest `ConfigModule` env. The markdown-diary side-effect (`storage.ts` writing `YYYY-MM-DD.md`) is retained as an optional, config-gated writer (DB `raw_entries` is the source of truth). The Realm reader is heavy and native; it's isolated to a one-shot import path (Nx target/script), not a runtime app dependency, to avoid pulling `realm` into the served bundle.
- *Alternatives*: Drop Telegram polling for webhooks (rejected — scope creep; polling+SOCKS5 is how it reaches Telegram in this environment). Drop markdown diary (deferred — cheap to keep, avoids behavior loss).

### 6. Tests split by runner per AGENTS.md
Backend (NestJS) → **Jest** with throwaway Postgres for DB-touching specs; service/unit logic mocked where possible. Libs + mini-app → **Vitest + RTL + MSW** (MSW replaces hand-rolled fetch mocks; Zod-schema and mapper unit tests stay pure). Existing test intent is preserved (events CRUD, auth, timers, stats, ai-processor, csv-import, notifications, formatters) and reauthored against the new APIs.

## Risks / Trade-offs

- **Scope is large (~100 source files, 20 tables, 30 endpoints)** → Sequence by layer (domain/Prisma → backend modules → data-access → ui/feature → mini-app shell), each independently lint/test/buildable, so progress is verifiable incrementally and the change can be applied in slices.
- **Timestamp/enum semantics drift in SQLite→Prisma rewrite** (epoch ints, free-text enum values, nullable detail columns) → Derive Prisma enums and nullability directly from the audited schema map; add migration/round-trip tests; Zod-validate all reads.
- **Stats parity is subtle** (wake windows are age-aware, milk balance compares pumped vs fed) → Port the exact formulas, cover with unit tests mirroring the existing `stats.test.ts` cases before deleting the originals.
- **AI parser correctness is prompt-sensitive** → Keep the existing system prompt and operation schema (`create_event`/`update_details`) intact; Zod-validate LLM output; preserve transient-vs-permanent error handling and the `needs_review` path; mock the LLM in tests.
- **Native `realm` dep in an Nx/pnpm build** → Isolate behind a script/target with the dep marked external; never import it from served code.
- **Telegram via SOCKS5 + external LLM/Whisper need secrets and network** → All via env/ConfigModule; `GitHub Actions spending limit: $0` means CI runs lint/test/build only, never live integrations; integration calls are mocked in tests.
- **No live data migration** → Acceptable per Non-Goals; CSV/Realm importers backfill history. Document that the production cutover needs a separate one-shot export/import if required.

## Migration Plan

1. **Foundation**: Prisma schema + initial migration + generate client; docker-compose Postgres; `domain` lib with Zod contracts. Verify `prisma generate` + lib build.
2. **Backend core**: NestJS app bootstrap (Fastify adapter), Prisma module, auth guard + exception filter; `events`, `stats`, `timers`, `auth`, `photos`, `settings`, `raw-entries` modules with TypedSQL stats. Jest specs green; app boots.
3. **Ingestion + AI**: `telegram`, `alice`, `ai-processor`, `notifications`, `data-import` modules + scheduled jobs; secrets via ConfigModule; importers behind targets.
4. **Frontend**: `data-access` (TanStack Query hooks), `ui` (CSS Module components), `feature-main` (screens), `mini-app` shell (router + providers + Zustand). Vitest/RTL/MSW specs green.
5. **Verify & wire**: `pnpm nx run-many -t lint test build`; boot `backend-bot` against local Postgres, serve `mini-app`, smoke-test the core flows; update `AGENTS.md`/root docs; record ADRs only if any unavoidable off-allowlist dep remains.

**Rollback**: The standalone `baby-ai` repo is untouched and remains the running system until cutover; abandoning the change leaves ts-mono's `baby-bot` scaffolds empty as before. Each phase is an isolated set of Nx projects that can be reverted without affecting `sample` or `shared`.

## Open Questions

- Does the existing SQLite dataset need a live cutover, or is CSV/Realm backfill sufficient for go-live? (Assumed sufficient per Non-Goals.)
- Is `node-telegram-bot-api` acceptable as a runtime dep, or should the bot move to `grammy`/native HTTP given `@telegram-apps/sdk-react` is already the approved Telegram dep? (Proposing to keep `node-telegram-bot-api` for behavior parity; flag for review.)
- Should the markdown diary writer survive long-term, or be dropped once DB is canonical? (Kept config-gated for now.)
- Where should photo blobs live — Postgres, local volume, or object storage? (Assumed local volume/`UPLOADS_DIR` for parity; revisit if deploying.)
