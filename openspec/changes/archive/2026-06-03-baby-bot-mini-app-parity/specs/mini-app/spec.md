## MODIFIED Requirements

### Requirement: Mini App screens
The system SHALL provide a React Telegram Mini App with Dashboard, Add Event, Journal, Stats, Pattern, Growth Chart, and Profile screens that match the `baby-ai` reference app in interface and feature set. Screen composition lives in `@acme/baby-bot-feature-main`, reusable presentational components in `@acme/baby-bot-ui` (styled with CSS Modules), and the app shell, routing, and providers in `apps/baby-bot/mini-app`. Visual and behavioral parity is achieved using the approved stack (CSS Modules, TanStack Query) — the original Tailwind/SWR implementation is the reference, not the source to copy.

#### Scenario: Dashboard shows quick actions and recent activity
- **WHEN** the user opens the Dashboard
- **THEN** quick feeding/diaper actions, active timers, and a recent-event summary are shown

#### Scenario: Add Event adapts fields to type
- **WHEN** the user selects an event type on the Add Event screen
- **THEN** the form shows the detail fields appropriate to that type

#### Scenario: Journal lists and filters events
- **WHEN** the user opens the Journal and applies a filter or search
- **THEN** the matching events are listed with edit and delete actions

#### Scenario: Pattern and Growth Chart render visualizations
- **WHEN** the user opens Pattern or Growth Chart
- **THEN** Pattern renders a 24-hour color-coded timeline and Growth Chart renders a WHO percentile-band chart, matching the `baby-ai` reference

## ADDED Requirements

### Requirement: Dashboard parity
The Dashboard SHALL match the `baby-ai` home screen: a header with the child's name and age and a settings (gear) button, inline editable weight/height cards, a live sleep status (elapsed timer when sleeping) with a color-coded wake-window monitor, smart overdue alerts, an active-events list with inline close actions, a quick-action button grid positioned below active events, and a "today" summary (feedings / sleep duration / diapers).

#### Scenario: Header shows child identity and settings access
- **WHEN** the Dashboard loads with a selected child
- **THEN** the child's name and computed age are shown and a settings button navigates to Profile

#### Scenario: Inline weight/height editing
- **WHEN** the user taps the weight or height card
- **THEN** it switches to an editable number input with save/cancel, and saving records a growth/weight measurement

#### Scenario: Live sleep and wake-window status
- **WHEN** the child has an open sleep event
- **THEN** an elapsed sleep timer is shown; otherwise the time since last wake is shown, color-coded by urgency against the wake-window threshold

#### Scenario: Today summary
- **WHEN** the Dashboard loads
- **THEN** a summary shows today's feeding count, total sleep duration, and diaper count

### Requirement: Smart alerts
The Mini App SHALL surface smart alert banners on the Dashboard when feeding, diaper, or wake-window thresholds are approaching or exceeded, using the configured notification thresholds, with warning and critical severities.

#### Scenario: Overdue feeding alert
- **WHEN** the time since the last feeding exceeds the feeding threshold
- **THEN** a critical alert banner is shown; as it approaches the threshold a warning banner is shown

#### Scenario: Wake-window alert
- **WHEN** the time awake exceeds the wake-window threshold
- **THEN** a wake-window alert banner is shown

### Requirement: Full per-type event forms
The Add/Edit Event screen SHALL provide detail fields for all twelve event types matching `baby-ai`: feeding (breast with per-side durations, bottle with content selector and volume, solid with food name, water), sleep (type and quality), diaper (type and color), growth (height, head circumference), weight, health (temperature, vaccination, doctor, medication, illness subtypes with catalog-driven fields), milestone (motor/speech/social/cognitive categories), pumping (side, volume, duration), walk, bath, mood (preset moods plus custom), and note. Time-tracked types SHALL offer an ongoing/in-progress toggle, and the screen SHALL support photo upload with preview/delete and delete-with-confirmation for existing events.

#### Scenario: Type-specific fields render
- **WHEN** the user selects any of the twelve event types
- **THEN** the form shows that type's full set of detail fields as in the reference app

#### Scenario: Ongoing event toggle
- **WHEN** the user enables the ongoing toggle on a time-tracked event
- **THEN** the event is saved without an end time and appears as an active event

#### Scenario: Photo attachment
- **WHEN** the user attaches a photo to an event
- **THEN** a preview is shown with a delete control and the photo is uploaded and associated with the event

#### Scenario: Delete existing event
- **WHEN** the user deletes an existing event and confirms
- **THEN** the event is removed and the user returns to the prior screen

### Requirement: Journal parity
The Journal SHALL provide filter pills for all thirteen options (all + twelve event types), search, a total event counter, date-grouped sections with headers, infinite scroll via an intersection sentinel, a show/hide-processed toggle for AI/voice raw entries rendered as raw-entry cards, a clear-all action with confirmation, and per-event close and delete actions.

#### Scenario: All filter types available
- **WHEN** the user opens the Journal filter row
- **THEN** all thirteen filters (all + every event type) are selectable

#### Scenario: Date grouping and infinite scroll
- **WHEN** the user scrolls the Journal
- **THEN** events are grouped under date headers and additional pages load as the sentinel becomes visible

#### Scenario: Raw entry visibility toggle
- **WHEN** the user toggles "show processed"
- **THEN** processed raw entries are shown or hidden; pending/failed raw entries render as cards with a retry action

### Requirement: Stats parity
The Stats screen SHALL default to the "today" period and present full sections matching `baby-ai`: feeding (total, by type, average interval, total time, total ml, ml by type), pumping (total, total amount, by side, average), milk balance (pumped / fed / remaining when applicable), sleep (count, total duration, night/nap split, average), walks, diapers (total and by type), and growth measurements, plus a link to the WHO growth charts.

#### Scenario: Period selection
- **WHEN** the user selects today, week, or month
- **THEN** all sections recompute for that period, defaulting to today on load

#### Scenario: Detailed feeding and sleep breakdowns
- **WHEN** the Stats screen renders
- **THEN** feeding shows by-type and interval/volume breakdowns and sleep shows night/nap split and averages

### Requirement: Pattern 24-hour timeline
The Pattern screen SHALL render a 24-hour horizontal timeline that places each event in its hour row(s) with left/width positioning derived from start/end minutes, color-coded per event type, with hour labels, a color legend, ← / Сегодня / → date navigation, and a chronological event list beneath the chart.

#### Scenario: Timeline visualization
- **WHEN** the user opens Pattern for a date
- **THEN** events render as color-coded bars positioned by time across a 24-hour grid with a legend

#### Scenario: Date navigation
- **WHEN** the user taps the previous/next/today controls
- **THEN** the timeline and list update to the selected date

### Requirement: Growth Chart percentile visualization
The Growth Chart screen SHALL render an SVG line chart with WHO percentile bands (P3, P15, P50, P85, P97) and the child's plotted measurements (line + points) over an age axis, with weight/height/head-circumference metric tabs, axis grid and labels, a legend, the child's gender and birth date, and a data table of measurements.

#### Scenario: Percentile chart renders
- **WHEN** the user opens Growth Chart
- **THEN** an SVG chart shows the five WHO percentile bands and the child's measurements plotted against age

#### Scenario: Metric tabs
- **WHEN** the user selects the weight, height, or head-circumference tab
- **THEN** the chart and table switch to that metric

### Requirement: Profile parity
The Profile screen SHALL display and allow editing of child info (name, birth date, gender), provide quick-button visibility/ordering configuration for the event types, present notification thresholds (feeding, diaper, wake) with a save action and Telegram notification status plus `/notify` guidance, offer CSV export of all data, and show an app version footer.

#### Scenario: Edit child info
- **WHEN** the user edits the child's name, birth date, or gender and saves
- **THEN** the child record is updated and reflected across screens

#### Scenario: Configure quick buttons
- **WHEN** the user toggles which event types appear as quick buttons
- **THEN** the Dashboard quick-button grid reflects the selection

#### Scenario: CSV export
- **WHEN** the user taps "Экспорт в CSV"
- **THEN** the app downloads a CSV export of the user's data

### Requirement: Mobile interaction layer
The Mini App SHALL provide the `baby-ai` mobile interaction layer: edge-swipe back navigation, slide page transitions between routes, haptic feedback on key actions, dedicated quick feeding and quick diaper bottom sheets, and a custom time input control — implemented with the approved stack.

#### Scenario: Swipe back
- **WHEN** the user swipes from the left edge on a sub-screen
- **THEN** the app navigates back

#### Scenario: Page transition
- **WHEN** the user navigates between routes
- **THEN** a slide transition animates the route change

#### Scenario: Quick action sheets
- **WHEN** the user triggers quick feeding or quick diaper from the Dashboard
- **THEN** a dedicated bottom sheet with the relevant options is presented
