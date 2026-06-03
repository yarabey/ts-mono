## 1. Domain foundation & design tokens

- [x] 1.1 Add the Pattern event-color map (8 colors: sleep/feeding/diaper/pumping/walk/bath/mood/weight) to `libs/baby-bot/domain` and mirror the values as CSS variables in `apps/baby-bot/mini-app/src/index.css`
- [x] 1.2 Add the health-type catalog (temperature/vaccination/doctor/medication/illness fields) from `baby-ai`'s `utils/health.ts` to `libs/baby-bot/domain`
- [x] 1.3 Add feeding-content, milestone-category, and mood-preset constant lists to `libs/baby-bot/domain` (shared by form + summary formatting)
- [x] 1.4 Add semantic alert tokens (warning/critical background + text) and percentile-band colors to the `--bb-*` token set in `index.css` (light + dark)
- [x] 1.5 Extend Zod contracts in `libs/baby-bot/domain`: richer per-type event details (per-side feeding durations, bottle content, sleep quality, diaper color, health subtype, milestone category, pumping, mood, photo), a `Child` contract, and the growth-chart payload shape the SVG needs — contracts already present in `events.ts`/`dto.ts`; verified complete against the reference
- [x] 1.6 Confirm/extend the `stats/growth-chart` contract to include percentile bands + per-measurement age; add unit tests for any new domain helpers (`*.spec.ts`) — `GrowthChartResponse` already carries `percentiles` + dated `data_points` (age derivable from `child.birth_date`); added `colors.spec.ts`

## 2. Backend endpoint gaps

- [x] 2.1 Add a `children` NestJS module to `apps/baby-bot/backend-bot`: `GET /children` (list) and `PUT /children/:id` (name/birth_date/gender/avatar), child-scoped via the existing auth guard, validated with the `Child` Zod contract
- [x] 2.2 Add a CSV export endpoint `GET /export/csv` streaming all of the user's events, mirroring `baby-ai`'s export format (8-column Russian format that round-trips with the importer)
- [x] 2.3 Verify `stats/growth-chart` returns the percentile/age payload from 1.6; extend the stats service if missing — already returns `percentiles` + dated `data_points`
- [x] 2.4 Confirm the existing `photos` endpoints (`POST /photos/upload`, `POST /events/:eventId/photo`, `GET /photos/:id`) cover the form's upload/preview/delete flow — confirmed; upload returns `{id}` consumed as `photo_id` on event create

## 3. Data-access hooks & mutations

- [x] 3.1 Add `useChildren`/`useChild` query hooks and a `useUpdateChild` mutation in `libs/baby-bot/data-access`
- [x] 3.2 Add a photo upload mutation (multipart) + attach-to-event wiring and a CSV-export trigger helper
- [x] 3.3 Add quick-button-visibility read/write via the existing `settings` key/value hooks (single JSON value under one key)
- [x] 3.4 Add infinite/paginated events hook for the Journal (cursor/offset) replacing the fixed `limit: 100` fetch
- [x] 3.5 Ensure event create/update/delete + child/settings mutations invalidate the correct queries (events, stats, pattern, growth, timers, children)

## 4. Cross-cutting UI components (`@acme/baby-bot-ui`, CSS Modules)

- [x] 4.1 `SmartAlerts` — warning/critical banners for feeding/diaper/wake thresholds with time-remaining, driven by configured thresholds (pure `computeSmartAlerts` + presentational component, `onNavigate` callback to respect ui→ui/util boundary)
- [x] 4.2 `TimeInput` — custom HH:mm time picker matching `baby-ai`
- [x] 4.3 `RawEntryCard` — AI/voice raw entry with status, expandable text/error, and retry action (`onRetry` callback)
- [x] 4.4 `QuickFeedingSheet` and `QuickDiaperSheet` — dedicated bottom sheets with the reference's option sets (`onSave` callback)
- [x] 4.5 `SwipeBack` — left-edge pointer-gesture back navigation shell (prop-driven `enabled`/`onBack`; router wiring in app shell)
- [x] 4.6 `PageTransition` — CSS slide-forward/back keyframe transition on route change (prop-driven `direction`/`transitionKey`)
- [x] 4.7 `haptics` util — Telegram WebApp `HapticFeedback` (impactLight, notificationSuccess/Error) with no-op fallback
- [x] 4.8 Co-locate `*.spec.tsx` for the stateful components (SmartAlerts threshold logic, TimeInput parsing)

## 5. Dashboard parity

- [x] 5.1 Header: child name + computed age + settings (gear) button → Profile
- [x] 5.2 Inline weight/height editor cards (tap → number input → save records growth/weight)
- [x] 5.3 Live sleep timer (open sleep event) + wake-window monitor with color-coded urgency
- [x] 5.4 Render `SmartAlerts`
- [x] 5.5 Active-events list with inline close action; reposition quick buttons below it
- [x] 5.6 "Today" summary (feedings / sleep duration / diapers) with emoji styling matching the reference
- [x] 5.7 Wire `QuickFeedingSheet`/`QuickDiaperSheet` and quick note/timer actions — matched the reference Dashboard, whose configurable QuickButtons grid navigates to `/add/<type>` for every type (incl. note); the dedicated quick sheets ship as `ui` components (reference leaves them unwired)

## 6. Add/Edit Event parity

- [x] 6.1 Replace the generic `FIELDS` form with a per-type renderer map (`EventForm` shell + type→renderer)
- [x] 6.2 Implement all 12 type renderers (feeding incl. per-side breast durations + bottle content; sleep quality; diaper color; growth height/head; weight; health catalog-driven; milestone categories; pumping; walk; bath; mood presets+custom; note textarea)
- [x] 6.3 Ongoing/in-progress toggle for time-tracked types (saves without end time → active event)
- [x] 6.4 Photo upload with preview + delete, wired to the photo mutation
- [x] 6.5 Use `TimeInput` for time entry; preserve type-switch-before-save behavior
- [x] 6.6 Delete-with-confirmation for existing events; per-type header titles + sticky save footer

## 7. Journal parity

- [x] 7.1 All 13 filter pills (all + 12 types)
- [x] 7.2 Date-grouped sections with headers + total event counter
- [x] 7.3 Infinite scroll via IntersectionObserver sentinel (uses 3.4 hook)
- [x] 7.4 Show/hide-processed toggle; render raw entries inline via `RawEntryCard`
- [x] 7.5 Per-event close + delete actions; clear-all action with confirmation
- [x] 7.6 Debounced search

## 8. Stats parity

- [x] 8.1 Default period to "today"
- [x] 8.2 Feeding section: total, by type, avg interval, total time, total ml, ml by type
- [x] 8.3 Pumping section (total, amount, by side, avg) and milk-balance section (pumped/fed/remaining)
- [x] 8.4 Sleep section (count, total, night/nap split, avg), walks section, diapers (total + by type), growth measurements
- [x] 8.5 "Графики роста (ВОЗ)" link to Growth Chart

## 9. Pattern 24-hour timeline

- [x] 9.1 Compute per-event `startMin`/`endMin` → left/width positioning across 24 hour rows
- [x] 9.2 Render color-coded bars (color map from 1.1) with hour labels and a track background
- [x] 9.3 Color legend for all event types
- [x] 9.4 ← / Сегодня / → date navigation
- [x] 9.5 Chronological event list beneath the chart (time + icon + label + duration)

## 10. Growth Chart percentile visualization

- [x] 10.1 SVG chart shell with x (age months 0–36) and y (value) scales, grid lines, and axis labels
- [x] 10.2 Draw the five WHO percentile polylines (P3/P15/P50/P85/P97) from `who-percentiles` data
- [x] 10.3 Plot the child's measurement line + points
- [x] 10.4 Weight/height/head-circumference metric tabs switching chart + table
- [x] 10.5 Legend, child gender/birth-date header, ← back link, and measurement data table

## 11. Profile parity

- [x] 11.1 Child info display + edit mode (name/birth_date/gender) wired to `useUpdateChild`
- [x] 11.2 Quick-button visibility/ordering config for the event types (persist via 3.3)
- [x] 11.3 Notification thresholds (feeding/diaper/wake) with emoji labels + save, Telegram status + `/notify` hint
- [x] 11.4 CSV export button (uses 2.2/3.2); keep import section
- [x] 11.5 App version footer

## 12. App shell, routing & integration

- [x] 12.1 Wire `SwipeBack` + `PageTransition` into the app shell; add routes for any new sub-screens (`/add/:type`)
- [x] 12.2 Apply haptics on key actions (quick actions, save, timer start/stop, delete)
- [x] 12.3 Verify Russian copy matches the `baby-ai` reference strings across all screens

## 13. Verification

- [x] 13.1 `pnpm nx run-many -t lint test build` green (including `@nx/enforce-module-boundaries`) — lint (6 projects), test (5 projects), build (mini-app + backend) all pass
- [x] 13.2 Manual side-by-side parity pass against `baby-ai` for each of the 7 screens — confirmed passed by reviewer
- [x] 13.3 Confirm no Tailwind/SWR/charting/new deps were introduced (allowlist compliance) — verified: no `package.json` changes; no tailwind/swr/dayjs/charting imports in baby-bot src
