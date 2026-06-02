# ai-entry-parsing Specification

## Purpose
Asynchronously parse pending `raw_entries` into structured event operations via an LLM, validate the output against a Zod operation contract, apply operations transactionally, and manage the parse-status lifecycle with transient/permanent error handling and retry.

## Requirements

### Requirement: Asynchronous raw-entry parsing
The system SHALL periodically (on a schedule) process `raw_entries` with status `pending` by calling an LLM with a system prompt and recent-event context, and parse the response into a list of structured operations. The LLM output MUST be validated against a Zod operation contract before any operation is applied.

#### Scenario: Pending entry parsed into a create operation
- **WHEN** the scheduled parser runs and a pending raw entry describes a feeding
- **THEN** the system calls the LLM, validates the returned operations, and creates the corresponding feeding event

#### Scenario: Invalid LLM output is rejected
- **WHEN** the LLM returns output that fails the operation contract
- **THEN** no event is created and the entry is not marked processed

### Requirement: Structured parse operations applied transactionally
The system SHALL support `create_event` (insert an event plus its typed detail) and `update_details` (update an existing detail, e.g. set the end of an open feeding) operations, apply all operations for an entry in a single transaction, and link created/updated events back to the source raw entry.

#### Scenario: Operations applied atomically
- **WHEN** an entry yields multiple operations and one fails mid-apply
- **THEN** none of the operations for that entry are committed

#### Scenario: Created event linked to its raw entry
- **WHEN** a `create_event` operation succeeds
- **THEN** the new event is linked to the originating raw entry

### Requirement: Parse status lifecycle and error handling
The system SHALL transition raw entries through `pending` → `processing` → `processed`/`error`/`needs_review`, distinguish transient errors (timeouts, connection failures — retried as `pending`) from permanent errors (marked `error` with a message), flag entries that mention events but cannot be confidently parsed as `needs_review`, and expose a retry action for failed entries.

#### Scenario: Transient error is retried
- **WHEN** the LLM call times out
- **THEN** the entry is left/returned to `pending` for a later retry rather than marked permanently failed

#### Scenario: Permanent error recorded
- **WHEN** parsing fails with a non-retryable error
- **THEN** the entry is marked `error` with an error message

#### Scenario: Ambiguous entry flagged for review
- **WHEN** an entry references an event but cannot be confidently parsed
- **THEN** the entry is marked `needs_review` and a notification is sent

#### Scenario: Manual retry
- **WHEN** a client triggers retry on a failed raw entry
- **THEN** the entry returns to `pending` for reprocessing
