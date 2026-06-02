# ADR 0006: Project Configuration Defaults

## Status: Accepted

## Context

Standard project configuration choices.

## Decision

- **License:** UNLICENSED (proprietary).
- **Default branch:** `main`.
- **Commit convention:** Conventional Commits.
- **Node version:** Current LTS (v22), pinned in `.nvmrc`.
- **Rendering:** All websites are React SPAs via Vite. No SSR.
- **Styling:** CSS Modules (default). Other frameworks require an ADR.
- **Validation:** Zod for shared contracts between backend and web.

## Consequences

- Commit messages follow `type(scope): description` format.
- Node version is pinned for consistency across environments.
