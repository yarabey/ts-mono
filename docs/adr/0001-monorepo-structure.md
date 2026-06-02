# ADR 0001: Monorepo Structure — Nx + pnpm, Domain-First Layout

## Status: Accepted

## Context

We need a monorepo for multiple TypeScript products (React web sites, Telegram mini-apps, Node.js backend services) backed by PostgreSQL.

## Decision

- **Monorepo tool:** Nx (task graph, caching, generators, module boundaries).
- **Package manager:** pnpm (strict node_modules, fast installs).
- **Layout:** domain-first by business product using `apps/` + `libs/`, with scope/type tags and `@nx/enforce-module-boundaries`.
- **Products:** `sample` (walking skeleton), `baby-bot` (web + mini-app + backend-bot + backend-orders).
- **Org scope:** `@acme`.

## Consequences

- All apps/libs use `@acme/<scope>-<name>` path aliases.
- Nx module boundaries enforce scope isolation (products can only depend on their own libs + shared).
- Single-version policy for shared dependencies where practical.
