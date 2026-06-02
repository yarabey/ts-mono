# AGENTS.md — ts-mono

## Project Overview

Nx + TypeScript monorepo (domain-first). Products: `sample` (walking skeleton), `baby-bot`.
`apps/` = deployable units. `libs/` = reusable code. Apps compose libs; apps never import other apps.

Server state (backend data) is managed by **TanStack Query** in `data-access` libs. Client state (UI toggles, ephemeral) is managed by **Zustand**. Never duplicate server data into Zustand.

### baby-bot product

A baby-development tracker (Telegram Mini App + Telegram bot + Alice webhook + AI raw-entry parsing). Populated apps/libs:

- `apps/baby-bot/backend-bot` — NestJS (Fastify) API: `auth`, `events`, `timers`, `photos`, `settings`, `stats` (TypedSQL `.sql` in `prisma/sql/`, executed via `$queryRaw` until a DB is provisioned — see `prisma/sql/README.md`), `raw-entries`, plus `telegram`, `alice`, `notifications`, `ai-processor`, `data-import`. Prisma/Postgres (22 models). Run local Postgres via `docker compose up baby-bot-postgres` (port 5433); copy `.env.example` → `.env`.
- `apps/baby-bot/mini-app` — React/Vite Telegram Mini App (HashRouter, `BabyBotQueryProvider`, CSS Modules). Dev: `pnpm nx serve baby-bot-mini-app` (proxies `/api`+`/webhook` → :3100). Serving strategy: `apps/baby-bot/backend-bot/SERVING.md`.
- `libs/baby-bot/{domain,data-access,ui,feature-main}` — Zod contracts/formatters/WHO data (`domain`, `type:util`), TanStack Query hooks (`data-access`), CSS-Module components + Zustand UI store (`ui`), screens (`feature-main`).
- `apps/baby-bot/{web,backend-orders}` are **intentionally unpopulated stubs** (out of scope; see each dir's `README.md`).
- Off-allowlist deps (`node-telegram-bot-api`, `socks-proxy-agent`, `realm`) are approved in [ADR 0007](docs/adr/0007-baby-bot-off-allowlist-deps.md); `realm` is isolated behind the `realm-import` Nx target.

## Commands (pnpm + Nx)

```bash
pnpm install                           # install all deps
pnpm nx serve <app>                    # serve an app (e.g. sample-web, sample-backend)
pnpm nx build <project>                # build a project
pnpm nx test <project>                 # run tests
pnpm nx lint <project>                 # lint a project
pnpm nx run-many -t lint test build    # run all targets
pnpm nx affected -t lint test build    # run only affected targets
pnpm nx graph                          # visualise the dependency graph
```

## Repository Layout & Tag/Boundary Rules

```
apps/<product>/<app>/      # scope:<product>, type:app
libs/<product>/<lib>/      # scope:<product>, type:{feature|ui|data-access|util}
libs/shared/<lib>/         # scope:shared,   type:{ui|util}
```

**Scope constraints:**
- `scope:sample` → may depend on `scope:sample`, `scope:shared`
- `scope:baby-bot` → may depend on `scope:baby-bot`, `scope:shared`
- `scope:shared` → `scope:shared` only

**Type constraints:**
- `type:app` → `feature, ui, data-access, util`
- `type:feature` → `feature, ui, data-access, util`
- `type:ui` → `ui, util`
- `type:data-access` → `data-access, util`
- `type:util` → `util`

Apps cannot depend on apps. `@nx/enforce-module-boundaries` enforces these rules via ESLint.

## Code Style & Conventions

- Strict TypeScript everywhere.
- ESLint + Prettier (single quotes).
- Conventional Commits (`type(scope): description`).
- CSS Modules for styling (no Tailwind/MUI without ADR).

## State Management Rules

1. All backend data goes through TanStack Query in `data-access` libs (typed hooks).
2. Zustand stores hold only client state. Never mirror server data.
3. Fetchers validate responses against shared Zod contracts at the boundary.
4. One `QueryClientProvider` per app; default staleTime: 30s, gcTime: 5min.

## Testing Strategy

- **Unit (logic):** Vitest — pure functions, Zod schemas, mappers. Co-located as `*.spec.ts`.
- **Component/integration:** Vitest + React Testing Library + MSW. No browser launch.
- **Backend:** Jest (NestJS default). DB tests against throwaway Postgres.
- **E2E:** Playwright only — small smoke suite. NOT for component tests.
- Do NOT use Playwright experimental component testing.

## Raw-SQL Policy

1. Default to the **Prisma Client API** for normal queries.
2. For raw SQL, prefer **TypedSQL** — write `.sql` in `prisma/sql/`, run `prisma generate`, call via `$queryRawTyped(...)`.
3. If TypedSQL can't express it, use parameterized `$queryRaw` (tagged template). Never string-concatenate user input.
4. `$queryRawUnsafe`/`$executeRawUnsafe` are a last resort and must be justified in review.
5. Reach for raw SQL for: complex joins, window functions, CTEs, or hot queries where Prisma's SQL is suboptimal — not ordinary CRUD.
6. Always validate/parse raw-query results against the shared Zod contract.

## Technology Allowlist

Only the following are approved. Adding anything else requires an approved ADR:

- **Language:** TypeScript (strict). **Runtime:** Node.js (LTS), pnpm.
- **Monorepo:** Nx. **Web:** React, Vite, React Router, Telegram Mini Apps SDK.
- **State:** Zustand (client), TanStack Query (server). **Backend:** NestJS + Fastify adapter.
- **Database:** PostgreSQL + Prisma (TypedSQL escape hatch). **Validation:** Zod.
- **Styling:** CSS Modules. **Testing:** Vitest, RTL, MSW, Jest (NestJS), Playwright (E2E).
- **Quality:** ESLint + `@nx/enforce-module-boundaries`, Prettier.
- **Containers:** Docker, docker-compose. **CI:** GitHub Actions + `nx affected`.

## Security & Secrets

- Never commit secrets, API keys, or `.env` files.
- `.gitignore` covers `.env`, `.env.*`, `node_modules`, `.nx/cache`, `dist`.
- GitHub Actions spending limit: $0.

## Boundaries

### Always
- Use Nx generators for new apps/libs to get correct tags/paths.
- Validate API responses against Zod schemas.
- Co-locate tests with source (`*.spec.ts`).
- Run `pnpm nx run-many -t lint test build` before considering work done.

### Ask First
- Adding a new product scope.
- Adding a new shared lib.
- Changing default cache/stale times.
- Modifying `tsconfig.base.json` path aliases.

### Never
- Never commit secrets or `.env` files.
- Never add a dependency, framework, language, or tool not on the Allowlist without an approved ADR.
- Never import across scope or type boundaries (ESLint will reject it).
- Never let UI/feature libs import the DB client (Prisma).
- Never duplicate server state into Zustand.
- Never edit inside OpenSpec-managed AGENTS.md markers.
- Never use `$queryRawUnsafe` / `$executeRawUnsafe` without justification.

## Deployment

Products ship via **tag-driven CI/CD** to a single self-hosted server. Pushing a
`<product>-v*` tag (e.g. `baby-bot-v1.2.3`) builds Docker images, pushes them to
**GHCR**, and redeploys a `docker compose` stack over SSH. The pipeline is
reusable: `.github/workflows/deploy.yml` (`workflow_call`) is product-agnostic;
each product adds a caller workflow + an `infra/<product>/` dir + Dockerfiles +
a `<PRODUCT>_ENV` secret.

- **Edge:** Caddy terminates TLS on **:8443** (Let's Encrypt; :80 open for ACME),
  serves the mini-app under `/mini-app`, and proxies `/api` + `/webhook` to the
  backend. URL shape: `https://<host>:8443/api/...` and `.../mini-app/`.
- **Secrets** live as GitHub Actions secrets; CI writes the server `.env`.
- See [`infra/README.md`](infra/README.md) for server bootstrap, the deploy
  ritual, and onboarding a new product. Decisions: [ADR 0008](docs/adr/0008-deployment-tag-driven-cicd.md).
