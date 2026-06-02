## Why

`baby-ai` (a baby-development tracker driven by a Telegram Mini App, Telegram bot, and Alice voice skill) lives in a standalone repo on an off-allowlist stack (raw Fastify, SQLite/better-sqlite3, SWR, Tailwind). The ts-mono monorepo already reserves a `baby-bot` product scope with empty scaffolding. Adopting baby-ai into ts-mono — rewritten onto the approved stack — gives it the monorepo's boundaries, shared libs, CI, and a single coherent toolchain, and replaces the bespoke deployment with the standard Docker/Nx flow.

## What Changes

- Rewrite the baby-ai backend from raw Fastify onto **NestJS + Fastify adapter** at `apps/baby-bot/backend-bot`, preserving the full REST surface (events, stats, timers, auth, photos, import, raw-entries, settings) and the Telegram/Alice ingestion paths.
- **BREAKING**: Replace SQLite/better-sqlite3 + hand-written SQL migrations with **PostgreSQL + Prisma**. The 20-table schema (children, events, 11 typed detail tables, raw_entries, photos, import/system tables) is reauthored as a Prisma schema; raw-SQL hot paths (stats aggregation) use TypedSQL where Prisma is suboptimal. Existing SQLite data is not auto-migrated.
- Rewrite the React Mini App at `apps/baby-bot/mini-app`: **SWR → TanStack Query**, **Tailwind → CSS Modules**, server-state hooks moved into `libs/baby-bot/data-access`, with client/UI state in **Zustand**.
- Extract shared domain into `libs/baby-bot/domain` (Zod contracts + types for events, sources, statuses), reusable UI into `libs/baby-bot/ui`, and screen-level composition into `libs/baby-bot/feature-main`.
- Validate every API boundary (requests, responses, AI/CSV/Realm inputs) against **Zod** contracts shared between backend and mini-app.
- Port the AI raw-entry parser (ZAI/GLM LLM call → structured event operations), Telegram bot (commands, intent detection, voice via Whisper, SOCKS5 proxy), Alice webhook, threshold notifications, and CSV/Realm importers.
- Port the test suites onto the monorepo's runners: **Vitest + RTL + MSW** for libs/mini-app, **Jest** for the NestJS backend.
- Retire the off-allowlist standalone repo's bespoke pieces (Let's Encrypt HTTPS in-process, single-process static serving) in favor of monorepo deploy conventions.
- Decommission the unused `web` and `backend-orders` scaffold stubs for baby-bot (out of scope for this change; only `backend-bot` + `mini-app` are populated).

## Capabilities

### New Capabilities
- `event-tracking`: Core baby-event log — typed events (feeding, sleep, diaper, growth, weight, health, milestone, pumping, walk, bath, note, mood) with CRUD, quick actions, active/close lifecycle, in-progress timers, and photo attachments.
- `statistics`: Aggregated reporting — feeding/sleep/diaper/pumping totals, intervals, wake windows, milk balance, daily patterns, and growth charts with WHO percentiles.
- `message-ingestion`: Inbound capture from Telegram (commands, free-text intent detection, voice transcription) and the Alice webhook into `raw_entries`, plus query responses and threshold notifications.
- `ai-entry-parsing`: Asynchronous parsing of pending `raw_entries` via an LLM into structured event operations applied transactionally.
- `authentication`: Telegram Mini App initData verification, access-code login, and JWT-protected API access.
- `data-import`: Batch import of historical events from CSV exports and Realm mobile DB files with deduplication.
- `mini-app`: React Telegram Mini App UI — Dashboard, Add Event, Journal, Stats, Pattern, Growth Chart, Profile — on TanStack Query + Zustand + CSS Modules.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/. -->

## Impact

- **New apps**: `apps/baby-bot/backend-bot` (NestJS), `apps/baby-bot/mini-app` (React/Vite).
- **New libs**: `libs/baby-bot/domain`, `libs/baby-bot/data-access`, `libs/baby-bot/ui`, `libs/baby-bot/feature-main` (populating existing scaffolds).
- **Database**: New PostgreSQL schema via Prisma at `apps/baby-bot/backend-bot/prisma`; Nx `prisma-*` targets; throwaway Postgres for tests (per AGENTS.md), local Postgres via docker-compose.
- **Dependencies (already on allowlist/root)**: NestJS, Prisma, TanStack Query, Zustand, Zod, `@telegram-apps/sdk-react`. **New deps requiring review**: `node-telegram-bot-api`, `socks-proxy-agent`, `jsonwebtoken`, `dayjs`, plus the Realm reader for one-shot import (candidate for isolation behind a script rather than app dep).
- **External integrations carried over**: OpenAI Whisper (transcription), ZAI/GLM (parsing), Telegram via SOCKS5 proxy, Alice webhook.
- **Boundaries/tags**: All projects tagged `scope:baby-bot`; enforced via `@nx/enforce-module-boundaries`. Path aliases (`@acme/baby-bot-*`) already present in `tsconfig.base.json`.
- **CI**: Picked up by `nx affected` for lint/test/build.
- **Out of scope**: live data migration from the existing SQLite DB; the `web` and `backend-orders` apps; production TLS/ingress wiring.
