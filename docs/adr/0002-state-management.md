# ADR 0002: State Management — TanStack Query + Zustand

## Status: Accepted

## Context

We need a clear strategy for managing server state (data from backends) and client state (UI toggles, ephemeral flags) in React apps.

## Decision

- **Server state:** TanStack Query — all backend data fetched/cached/mutated through typed hooks in `data-access` libs.
- **Client state:** Zustand — small global/UI state only. Never mirror server data into Zustand.
- **Fetch layer:** native `fetch` (thin wrapper). No axios.

## Consequences

- All backend data goes through TanStack Query hooks (never ad hoc in components).
- Zustand stores hold only genuine client state.
- Fetchers validate responses against shared Zod contracts at the boundary.
