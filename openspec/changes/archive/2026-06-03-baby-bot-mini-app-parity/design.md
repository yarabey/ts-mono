## Context

`baby-bot` is a domain-first port of `baby-ai` into this Nx monorepo. The data layer (TanStack Query hooks, Zod contracts, NestJS modules, Prisma) is largely in place, but the UI diverged: a focused gap analysis found ~50% parity. Whole visual features are absent (Pattern 24h timeline, GrowthChart percentile SVG, Dashboard SmartAlerts + weight/height editor), event forms are collapsed to ~6 of 12 types with no photo/ongoing support, and Stats/Journal/Profile are simplified.

The reference is `/home/savstavr/baby-ai/mini-app` — React + Vite + **Tailwind** + **SWR**, Russian copy. This monorepo's allowlist mandates **CSS Modules** and **TanStack Query** and forbids new deps without an ADR. So parity means re-expressing the reference's *visual design and behavior* in the approved stack, not transplanting markup.

Backend reality (verified): the port already exposes `photos` (`POST /photos/upload`, `GET /photos/:id`, `POST /events/:eventId/photo`), `settings` (`GET/PUT /settings/:key`), `events`, `timers`, `stats`, `raw-entries`, `import`, `auth`, `alice`. It is **missing** a `children` controller (`GET /children`, `PUT /children/:id`) and a **CSV export** endpoint, both of which `baby-ai` has and several parity features need. Domain helpers already include WHO percentile data and `estimatePercentile`; they lack the Pattern color map, the health-type catalog, and quick-button-visibility helpers.

## Goals / Non-Goals

**Goals:**
- Visual + behavioral parity for all seven screens and the mobile interaction layer (swipe-back, page transitions, haptics, quick-action sheets, time input).
- Reuse the existing data-access layer where possible; add only the missing hooks/mutations/endpoints (children, CSV export, photo wiring, quick-button setting).
- Keep everything on the approved allowlist — CSS Modules for all styling, hand-rolled SVG for charts, no charting/animation libraries.
- Russian copy matching the reference strings exactly.

**Non-Goals:**
- No redesign or "improvement" over `baby-ai` — parity is the bar, not a new design.
- No migration of the backend off NestJS/Prisma or the frontend off TanStack Query.
- No new product scope, shared lib, or dependency (would require ADR / "Ask First").
- Offline-queue behavior beyond what already exists is not expanded.
- Light/dark theming is preserved via existing CSS variables, not reworked.

## Decisions

### Reimplement Tailwind visuals as CSS Modules, screen by screen
The reference's look (spacing, color-coded states, cards, pills, urgency backgrounds) is encoded in Tailwind utility strings. We translate those into per-component `*.module.css` files, extending the existing `--bb-*` design tokens in `apps/baby-bot/mini-app/src/index.css` with any missing semantic colors (warning/critical alert backgrounds, the 8 Pattern event colors, percentile-band colors). **Alternative considered:** adding Tailwind via an ADR — rejected; the allowlist explicitly excludes it and CSS Modules is the house convention, so an ADR would be churn for no benefit.

### Hand-roll SVG for Pattern and GrowthChart (no chart library)
Both visualizations are bespoke in `baby-ai` (raw SVG / positioned divs), so we port them as React components emitting SVG/CSS directly: GrowthChart computes x (age in months 0–36) and y (value) scales, draws the five WHO percentile polylines from existing `who-percentiles` data plus the child's measurement line/points, grid, and axes; Pattern computes per-event `startMin`/`endMin` to position color-coded bars within 24 hour rows. **Alternative considered:** a charting dep (Recharts/visx) — rejected (not on allowlist, ADR overhead, and the reference shapes are simple enough to render directly and match pixel-for-pixel).

### Per-type event form via a type→renderer map in feature-main
Replace the generic `FIELDS` array with a structured form: a shared `EventForm` shell plus a `renderers` map keyed by event type, each returning that type's fields (mirroring `baby-ai`'s `renderFeeding`/`renderSleep`/… ). Type-specific option lists (feeding contents, health catalog, milestone categories, mood presets) live as constants in `libs/baby-bot/domain` so both form and summary formatting share them. **Alternative considered:** one mega-component with conditionals — rejected as unmaintainable for 12 types.

### Put cross-cutting presentational pieces in `@acme/baby-bot-ui`, screen logic in `feature-main`
New reusable components — `SmartAlerts`, `SwipeBack`, `PageTransition`, `QuickFeedingSheet`, `QuickDiaperSheet`, `RawEntryCard`, `TimeInput`, plus a `haptics` util — go in the `ui` lib (type:ui, CSS Modules); screen composition stays in `feature-main`. This respects the tag/boundary rules (ui → ui/util only) and keeps screens thin.

### Add the missing backend endpoints minimally, mirroring `baby-ai`'s contract
Add a `children` module (`GET /children`, `PUT /children/:id` for name/birth_date/gender/avatar) and a CSV **export** endpoint (`GET /export/csv` streaming all events), validated against Zod contracts in `domain`. Photo upload already exists backend-side and only needs frontend wiring. Quick-button visibility is stored via the existing `settings` key/value endpoint (no schema change). **Alternative considered:** deriving child info from existing endpoints — rejected; the Dashboard/Profile parity needs read+update of the child record as in the reference.

### Animations and gestures with CSS + light DOM, not libraries
`PageTransition` uses CSS keyframes (slide-forward/back) driven by route changes; `SwipeBack` uses pointer events on a left-edge zone; haptics call the Telegram WebApp `HapticFeedback` API with a no-op fallback. All allowlist-safe.

## Risks / Trade-offs

- **Pixel/behavioral drift from the reference** → Work screen-by-screen against `baby-ai` open side-by-side; capture the reference's exact Russian copy, color values, thresholds, and layout order in each task; treat the reference as the acceptance oracle.
- **Hand-rolled SVG charts harder to get right than a library** → Port the reference's scale/positioning math directly and unit-test the scale/percentile helpers in `domain` (`*.spec.ts`); the WHO data already exists and is tested.
- **Boundary violations while moving code** → New components land in the correct lib per tag rules; rely on `@nx/enforce-module-boundaries` (run `nx lint`) to catch ui→data-access/feature leaks early.
- **Backend additions touch auth/child scoping** → Reuse existing auth guard + child-scoping used by events/stats; add Zod validation at the boundary; keep export read-only.
- **Scope is large (7 screens + components + 2 endpoints)** → Sequence so each screen is independently shippable and verifiable; land shared domain constants and design tokens first to avoid rework.
- **Photo upload UX (preview/delete) + multipart** → Backend already supports it; risk is limited to frontend wiring and is covered by the existing `photos` contract.

## Migration Plan

Additive only — no data migration. Land in dependency order so each step is verifiable:
1. Domain foundation: color map, health catalog, milestone/mood/feeding-content constants, growth-chart payload + child Zod contracts, design tokens.
2. Backend gaps: `children` module + CSV export endpoint (+ frontend `children` / export / quick-button-setting hooks).
3. Cross-cutting `ui` components (SmartAlerts, TimeInput, RawEntryCard, sheets, SwipeBack, PageTransition, haptics).
4. Screens in parity order: Dashboard → AddEvent → Journal → Stats → Pattern → GrowthChart → Profile.
5. `pnpm nx run-many -t lint test build` green; manual parity pass against `baby-ai` per screen.

Rollback: revert the change branch; no schema/data changes to undo. New endpoints are additive and unused by old clients.

## Open Questions

- Does the port's `stats/growth-chart` response already carry the percentile bands and per-measurement ages the SVG needs, or must its payload be extended to match `baby-ai`? (Confirm during step 1; extend the Zod contract if not.)
- Are child records already seeded/available in the port DB so `GET /children` returns a usable child, or is there onboarding to add? (Confirm before wiring Dashboard header.)
- Quick-button visibility/order: store as a single JSON setting value, or one boolean per type? (Default: single JSON value under one settings key, matching reference simplicity.)
