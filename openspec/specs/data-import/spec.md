# data-import Specification

## Purpose
Import historical events from CSV exports and Realm mobile database files, mapping source records to the system's event types and details, deduplicating to keep re-imports idempotent, and exposing an authenticated upload endpoint that reports the import outcome.

## Requirements

### Requirement: CSV import with deduplication
The system SHALL import historical events from CSV exports, mapping source event labels to the system's event types and detail fields, and SHALL deduplicate rows so re-importing the same file does not create duplicate events. Imported events SHALL be tagged with source `csv_import` and all parsed rows validated against the shared Zod contracts.

#### Scenario: Import a CSV file
- **WHEN** a CSV export is imported
- **THEN** each recognized row is mapped to an event with its details and tagged source `csv_import`

#### Scenario: Re-import is idempotent
- **WHEN** the same CSV file is imported a second time
- **THEN** no duplicate events are created for already-imported rows

#### Scenario: Changed row is updated
- **WHEN** a previously imported row's content changes and the file is re-imported
- **THEN** the corresponding event is updated rather than duplicated

### Requirement: Realm import
The system SHALL support a one-shot import of events from a Realm mobile database file, mapping Realm records to events and details and tracking imported records to avoid duplicates on re-run.

#### Scenario: Import a Realm file
- **WHEN** a Realm database file is imported
- **THEN** its records are mapped to events with details and tracked so a re-run does not duplicate them

### Requirement: Import upload endpoint
The system SHALL accept CSV or Realm files via an authenticated upload endpoint and report the import outcome.

#### Scenario: Upload triggers import
- **WHEN** an authenticated client uploads a CSV or Realm file to the import endpoint
- **THEN** the system imports it and returns a summary of created/updated/skipped records
