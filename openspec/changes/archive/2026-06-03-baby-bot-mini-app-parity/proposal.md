## Why

The `baby-bot` mini-app was ported from the original `baby-ai` app but landed at roughly 50% UI/feature parity: the data layer is solid, yet the experience diverged heavily. Core visual features are missing entirely (Pattern's 24h color-coded timeline, GrowthChart's WHO percentile SVG charts, Dashboard SmartAlerts and inline weight/height editor), event forms are collapsed (6 of 12 types fully supported, no photo upload, no ongoing-event toggle), and several screens (Stats, Journal, Profile) are simplified to the point of feeling like a different product. The user needs the port to present the **same interface and the same features** as `baby-ai`.

## What Changes

Bring every mini-app screen and interaction to parity with `baby-ai`, reimplemented in this monorepo's stack (**CSS Modules, not Tailwind**; **TanStack Query, not SWR**; CSS Module animations, not raw class strings). Parity targets the *behavior and visual design*, not the original markup.

- **Dashboard**: add child name/age header, settings (gear) button, inline weight/height editor cards, live sleep timer + wake-window monitor with color-coded urgency, **SmartAlerts** (feeding/diaper/wake overdue banners), and the "today" emoji stats summary; reposition quick buttons below active events.
- **Add/Edit Event**: full per-type forms for all 12 event types (breast per-side durations, bottle content selector, sleep quality, diaper color, health subtype catalog, milestone categories, mood presets, pumping detail), **photo upload** with preview/delete, **ongoing/in-progress toggle** for time-tracked events, `TimeInput` component, and **delete-with-confirm**.
- **Journal**: all 13 filter pills, date grouping with headers, total counter, infinite scroll (IntersectionObserver), show/hide-processed toggle, clear-all action, inline close/delete actions, and `RawEntryCard` for AI/voice entries.
- **Stats**: restore full sections — feeding (by type, intervals, totals, ml-by-type), pumping, milk balance, sleep (night/nap split, avg), walks, diapers (by type), growth measurements, and a "Графики роста (ВОЗ)" link; default period **today**.
- **Pattern**: implement the **24-hour horizontal color-coded bar chart** (per-hour positioning of overlapping events, 8 event colors), legend, and ← / Сегодня / → date navigation above the chronological list.
- **GrowthChart**: implement the **SVG percentile-band line chart** (P3/P15/P50/P85/P97 bands + child line/points, grid, axes), weight/height/head metric tabs, legend, data table, and child gender/birth-date header.
- **Profile**: child info display + edit (name/birth_date/gender), quick-button visibility/ordering config (all 12 types), polished notification thresholds with Telegram status + `/notify` hint, **CSV export**, and version footer.
- **Cross-cutting components**: add `SmartAlerts`, `SwipeBack` (edge-swipe back), `PageTransition` (slide animations), dedicated `QuickFeedingSheet`/`QuickDiaperSheet`, `RawEntryCard`, `TimeInput`, and a haptics utility; align the toast experience.
- **Backend support where missing**: add/confirm endpoints the above UI requires (CSV export, photo upload, child update, quick-button-visibility setting, growth-chart percentile payload) to match `baby-ai`'s contract.

## Capabilities

### New Capabilities
- _None_ — all work extends the existing mini-app surface and its supporting backend endpoints.

### Modified Capabilities
- `mini-app`: the seven mini-app screens and their cross-cutting components must reach feature/interaction parity with `baby-ai` — adding the missing visualizations (Pattern timeline, GrowthChart percentile chart), full event-type forms with photo + ongoing toggle, SmartAlerts, Journal/Stats/Profile richness, and the gesture/transition/haptics layer.

## Impact

- **Frontend**: `libs/baby-bot/{feature-main,ui,domain}` (most screens + new components + formatting/color/health-catalog helpers), `libs/baby-bot/data-access` (new hooks/mutations for child update, photo upload, CSV export, settings), `apps/baby-bot/mini-app` (routing for sub-screens, page transitions, swipe-back shell).
- **Backend**: `apps/baby-bot/backend-bot` — confirm/add endpoints for CSV export, photo upload, child update, quick-button-visibility setting, and the growth-chart percentile response shape used by the chart.
- **Contracts**: extend shared Zod schemas in `libs/baby-bot/domain` for the richer per-type event details, settings keys, and growth-chart payload.
- **Constraint**: original uses Tailwind + SWR; this port stays on the approved allowlist (CSS Modules + TanStack Query). No new dependencies expected; if any are needed they require an ADR.
- **No data migration**; additive API/contract changes only.
