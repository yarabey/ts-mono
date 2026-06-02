## ADDED Requirements

### Requirement: Mini App screens
The system SHALL provide a React Telegram Mini App with Dashboard, Add Event, Journal, Stats, Pattern, Growth Chart, and Profile screens. Screen composition lives in `@acme/baby-bot-feature-main`, reusable presentational components in `@acme/baby-bot-ui` (styled with CSS Modules), and the app shell, routing, and providers in `apps/baby-bot/mini-app`.

#### Scenario: Dashboard shows quick actions and recent activity
- **WHEN** the user opens the Dashboard
- **THEN** quick feeding/diaper actions, active timers, and a recent-event summary are shown

#### Scenario: Add Event adapts fields to type
- **WHEN** the user selects an event type on the Add Event screen
- **THEN** the form shows the detail fields appropriate to that type

#### Scenario: Journal lists and filters events
- **WHEN** the user opens the Journal and applies a filter or search
- **THEN** the matching events are listed with edit and delete actions

### Requirement: Server state via TanStack Query
The Mini App SHALL manage all backend data through TanStack Query hooks in `@acme/baby-bot-data-access` under a single `QueryClientProvider` (default staleTime 30s, gcTime 5min), and SHALL NOT duplicate server data into client state. Responses MUST be validated against the shared Zod contracts at the fetch boundary.

#### Scenario: Data fetched via query hooks
- **WHEN** a screen needs events, stats, or timers
- **THEN** it consumes a typed TanStack Query hook from the data-access lib rather than fetching directly

#### Scenario: Mutation refreshes affected queries
- **WHEN** the user creates or deletes an event
- **THEN** the affected queries are invalidated/updated so the UI reflects the change

### Requirement: Client state via Zustand
The Mini App SHALL hold ephemeral UI/client state (open sheets, toasts, active-timer display, offline queue) in Zustand stores, never mirroring server data.

#### Scenario: UI toggle uses Zustand
- **WHEN** the user opens a bottom sheet or shows a toast
- **THEN** that ephemeral state is managed by a Zustand store, not server state

### Requirement: Authenticated API access
The Mini App SHALL authenticate via Telegram `initData` (or access code) to obtain a JWT, attach it to API requests, and handle 401 responses by re-authenticating or logging out.

#### Scenario: Auto re-auth on 401
- **WHEN** an API request returns HTTP 401
- **THEN** the app clears the stale token and triggers re-authentication
