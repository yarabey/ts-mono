## ADDED Requirements

### Requirement: Aggregated statistics by period
The system SHALL compute aggregated statistics for a selectable period (today, week, month, or custom range) covering feedings (totals, per-type breakdown, intervals, milk amounts), sleep (total duration, by type, quality), diapers (by type), pumping, and walks. Aggregation results MUST be validated against the shared Zod contract before being returned.

#### Scenario: Stats for a period
- **WHEN** a client requests stats for the `week` period
- **THEN** the system returns feeding, sleep, diaper, pumping, and walk aggregates computed over the last 7 days

#### Scenario: Custom date range
- **WHEN** a client requests stats with an explicit date_from/date_to range
- **THEN** the aggregates cover exactly that range

### Requirement: Wake windows and milk balance
The system SHALL compute age-aware wake windows (time awake between sleeps, compared against an age-appropriate recommended maximum) and a milk balance comparing milk pumped against milk fed.

#### Scenario: Wake window flagged against age maximum
- **WHEN** stats are computed for a child and a wake window exceeds the recommended maximum for the child's age
- **THEN** the response indicates that window exceeds the recommended maximum

#### Scenario: Milk balance reflects pumped vs fed
- **WHEN** stats are computed and the child has both pumping and bottle-feeding events
- **THEN** the response reports total milk pumped and total milk fed for the period

### Requirement: Daily pattern timeline
The system SHALL return a chronological timeline of a child's events for a given date.

#### Scenario: Pattern for a date
- **WHEN** a client requests the pattern for a specific date
- **THEN** the system returns that day's events in chronological order

### Requirement: Growth chart with WHO percentiles
The system SHALL return growth measurements (weight, height, head circumference) together with WHO percentile lookups for the child's age and gender.

#### Scenario: Growth chart with percentile
- **WHEN** a client requests the growth chart for a child
- **THEN** each measurement is returned alongside its WHO percentile for the child's age and gender
