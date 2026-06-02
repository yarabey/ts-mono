# ADR 0003: Backend — NestJS on Fastify Adapter + Prisma

## Status: Accepted

## Context

We need a Node.js backend framework with DI/modules for consistency, and a PostgreSQL access layer.

## Decision

- **Framework:** NestJS with the Fastify adapter (`@nestjs/platform-fastify`) — NestJS conventions/DI, Fastify throughput.
- **Database access:** Prisma (Prisma Migrate for migrations). Raw SQL via TypedSQL for complex queries; parameterized `$queryRaw` as fallback. Never string-concatenate user input.
- **Testing:** Jest (NestJS default) for backend unit/e2e tests.

## Consequences

- Fastify is used only as NestJS's adapter — not directly.
- All DB migrations managed through Prisma Migrate.
- Raw SQL escape hatch documented in AGENTS.md.
