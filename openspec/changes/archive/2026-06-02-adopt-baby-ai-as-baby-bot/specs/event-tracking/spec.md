## ADDED Requirements

### Requirement: Typed event log
The system SHALL store baby events with a shared `Event` record (child, type, occurred-at timestamp, source, optional author and note) plus a type-specific detail record. Supported event types SHALL be: `feeding`, `sleep`, `diaper`, `growth`, `weight`, `health`, `milestone`, `pumping`, `walk`, `bath`, `note`, `mood`. All persisted events MUST validate against the shared Zod contracts in `@acme/baby-bot-domain`.

#### Scenario: Create a feeding event with details
- **WHEN** a client POSTs an event of type `feeding` with feeding details (feeding_type, optional breast_side, durations, amount_ml)
- **THEN** the system persists one `Event` row and one linked `EventFeeding` detail row and returns the created event with its id

#### Scenario: Reject an unknown event type
- **WHEN** a client POSTs an event whose type is not in the supported set
- **THEN** the system rejects it with HTTP 400 and does not persist any row

#### Scenario: Detail shape must match event type
- **WHEN** a client POSTs an event whose detail payload fails the Zod contract for that type
- **THEN** the system responds with HTTP 400 and persists nothing

### Requirement: Event CRUD and listing
The system SHALL expose list, read, update, and delete operations for events. Listing SHALL support filtering by child, event type, date range, source, and free-text search, with limit/offset pagination. Reading a single event SHALL include its typed details and any attached photos.

#### Scenario: List events with filters
- **WHEN** a client requests events filtered by child_id, event_type, and a date range with a limit
- **THEN** the system returns only matching events ordered by occurred-at, bounded by the limit

#### Scenario: Read an event with enriched details
- **WHEN** a client requests a single event by id
- **THEN** the response includes the base event, its typed detail row, and linked photos

#### Scenario: Delete cascades to details
- **WHEN** a client deletes an event
- **THEN** the event, its typed detail row, and its photo links are removed

#### Scenario: Update modifies base and detail
- **WHEN** a client updates an event and its detail fields
- **THEN** both the `Event` row and its typed detail row reflect the new values

### Requirement: Quick event actions
The system SHALL provide quick-create endpoints for the most common events (feeding and diaper) that accept a minimal payload and apply sensible defaults.

#### Scenario: Quick feeding
- **WHEN** a client calls the quick feeding endpoint with minimal fields
- **THEN** a feeding event is created with defaults applied and returned

#### Scenario: Quick diaper
- **WHEN** a client calls the quick diaper endpoint with a diaper type
- **THEN** a diaper event is created and returned

### Requirement: Open/close event lifecycle and timers
The system SHALL support in-progress (open) events that have a start but no end, list active (open) events, and close an open event by computing its duration. The system SHALL also support named timers (feeding, sleep) that, when stopped, auto-create the corresponding event with a computed duration and report elapsed time while active.

#### Scenario: Start and stop a timer creates an event
- **WHEN** a client starts a feeding timer and later stops it
- **THEN** the system creates a feeding event whose duration equals the elapsed time and removes the active timer

#### Scenario: List active timers with elapsed time
- **WHEN** a client requests active timers
- **THEN** each returned timer includes its elapsed seconds since start

#### Scenario: Close an open event computes duration
- **WHEN** a client closes an open event
- **THEN** the event's end timestamp is set and its duration is computed from start to end

### Requirement: Photo attachments
The system SHALL accept image uploads (JPG/PNG/GIF/WebP/HEIC up to a size limit), serve a stored photo by id, and allow linking an uploaded photo to an event.

#### Scenario: Upload and attach a photo
- **WHEN** a client uploads a valid image and then links it to an event
- **THEN** the photo is stored, retrievable by id, and associated with that event

#### Scenario: Reject oversized or unsupported upload
- **WHEN** a client uploads a file exceeding the size limit or of an unsupported type
- **THEN** the system rejects the upload with HTTP 400
