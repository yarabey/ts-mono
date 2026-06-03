# ts-mono

A domain-first **Nx + TypeScript monorepo**. Apps are deployable units (`apps/`),
libs are reusable code (`libs/`). Apps compose libs; apps never import other apps.
Module boundaries (scope + type tags) are enforced by ESLint via
`@nx/enforce-module-boundaries`.

For the full contributor guide — boundary rules, state-management policy, testing
strategy, raw-SQL policy, and the technology allowlist — see [`AGENTS.md`](AGENTS.md).

## Products

### `sample`
A walking skeleton demonstrating the monorepo conventions end to end:

- `apps/sample/web` — React + Vite frontend.
- `apps/sample/backend` — NestJS (Fastify) API.
- `apps/sample/web-e2e` — Playwright smoke tests.
- `libs/sample/{domain,data-access}` — Zod contracts and TanStack Query hooks.

### `baby-bot`
A baby-development tracker built as a Telegram Mini App + Telegram bot + Alice
webhook, with AI-assisted parsing of raw entries:

- `apps/baby-bot/backend-bot` — NestJS (Fastify) API with `auth`, `events`,
  `timers`, `photos`, `settings`, `stats`, `raw-entries`, plus `telegram`,
  `alice`, `notifications`, `ai-processor`, and `data-import` modules.
  Postgres via Prisma (TypedSQL for raw SQL).
- `apps/baby-bot/mini-app` — React/Vite Telegram Mini App (HashRouter, CSS Modules).
- `libs/baby-bot/{domain,data-access,ui,feature-main}` — Zod contracts/formatters/WHO
  data, TanStack Query hooks, CSS-Module components + a Zustand UI store, and screens.
- `apps/baby-bot/{web,backend-orders}` — intentionally unpopulated stubs (out of scope).

### Shared
- `libs/shared/{types,ui,util}` — cross-product reusable code (`scope:shared`,
  depends only on `scope:shared`).

## Tech Stack

- **Language / runtime:** TypeScript (strict), Node.js LTS (v22), pnpm.
- **Monorepo:** Nx.
- **Web:** React 19, Vite, React Router, Telegram Mini Apps SDK.
- **State:** TanStack Query (server state) + Zustand (client state).
- **Backend:** NestJS with the Fastify adapter.
- **Database:** PostgreSQL + Prisma (TypedSQL escape hatch).
- **Validation:** Zod. **Styling:** CSS Modules.
- **Testing:** Vitest, React Testing Library, MSW, Jest (NestJS), Playwright (E2E).
- **Quality:** ESLint (`@nx/enforce-module-boundaries`) + Prettier.
- **Containers / CI:** Docker, docker-compose, GitHub Actions (`nx affected`).

## Repository Layout

```
apps/<product>/<app>/      # scope:<product>, type:app
libs/<product>/<lib>/      # scope:<product>, type:{feature|ui|data-access|util}
libs/shared/<lib>/         # scope:shared,   type:{ui|util}
```

## Getting Started

```bash
pnpm install                           # install all deps
pnpm nx serve sample-web               # serve the sample frontend
pnpm nx serve sample-backend           # serve the sample backend
```

For baby-bot, start local Postgres first:

```bash
docker compose up baby-bot-postgres    # Postgres on port 5433
cp apps/baby-bot/backend-bot/.env.example apps/baby-bot/backend-bot/.env
pnpm nx serve baby-bot-mini-app        # proxies /api + /webhook → :3100
```

## Common Commands

```bash
pnpm nx build <project>                # build a project
pnpm nx test <project>                 # run tests
pnpm nx lint <project>                 # lint a project
pnpm nx run-many -t lint test build    # run all targets
pnpm nx affected -t lint test build    # run only affected targets
pnpm nx graph                          # visualise the dependency graph
```

## Deployment

Products ship via **tag-driven CI/CD** to a single self-hosted server. Pushing a
`<product>-v*` tag (e.g. `baby-bot-v1.2.3`) builds Docker images, pushes them to
GHCR, and redeploys a `docker compose` stack over SSH. Caddy terminates TLS on
`:8443`. See [`infra/README.md`](infra/README.md) and
[ADR 0008](docs/adr/0008-deployment-tag-driven-cicd.md).

## Documentation

- [`AGENTS.md`](AGENTS.md) — contributor guide and conventions.
- [`docs/adr/`](docs/adr/) — architecture decision records.
- [`openspec/`](openspec/) — OpenSpec change proposals and specs.
</content>
</invoke>
