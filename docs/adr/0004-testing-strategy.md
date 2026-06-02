# ADR 0004: Testing Strategy — Vitest + RTL + MSW / Jest / Playwright

## Status: Accepted

## Context

We need a layered testing approach: fast unit/component tests, and slower E2E tests.

## Decision

- **Unit tests (logic):** Vitest — pure functions, Zod schemas, mappers, query/key builders. Co-located as `*.spec.ts`.
- **Component/integration tests:** Vitest + React Testing Library + MSW — render components in jsdom, intercept HTTP with MSW handlers, assert success/error/loading states. No browser launch.
- **Backend tests:** Jest (NestJS default). DB tests against throwaway Postgres (docker-compose/Testcontainers).
- **E2E tests:** Playwright only — small suite driving the real app in a real browser. Not for component testing.

## Consequences

- Playwright experimental component testing (`@playwright/experimental-ct-*`) is NOT used.
- MSW handlers shared between component tests and E2E where practical.
- Tests aim for behavioral coverage, not percentage targets.
