## ADDED Requirements

### Requirement: Telegram bot ingestion
The system SHALL run a Telegram bot (polling over a configurable SOCKS5 proxy) that accepts text and voice messages from authorized chats. Free-form messages that are not recognized queries SHALL be stored as `raw_entries` with status `pending` for later AI parsing, tagged with the appropriate source (`telegram` or `telegram_voice`). Voice messages SHALL be transcribed via the Whisper API before storage.

#### Scenario: Free-text message becomes a pending raw entry
- **WHEN** an authorized chat sends a free-form text message that is not a query
- **THEN** the system stores a `raw_entry` with source `telegram` and status `pending`

#### Scenario: Voice message is transcribed then stored
- **WHEN** an authorized chat sends a voice message
- **THEN** the system transcribes it via Whisper and stores a `raw_entry` with source `telegram_voice` and status `pending`

#### Scenario: Unauthorized chat is gated
- **WHEN** a message arrives from a chat that has not been authorized
- **THEN** the system does not record an event and prompts for authorization

### Requirement: Bot commands and query responses
The system SHALL support bot commands (e.g. daily stats, weekly stats, enable/disable notifications, help, mini-app launch) and SHALL detect query intents in free text (last feeding, sleep today, latest weight, today's stats, etc.) and answer them directly instead of recording a raw entry.

#### Scenario: Query intent is answered, not recorded
- **WHEN** a user sends a message recognized as a "when was the last feeding" query
- **THEN** the system replies with the last feeding info and does not create a `raw_entry`

#### Scenario: Daily stats command
- **WHEN** a user sends the daily-stats command
- **THEN** the system replies with the day's aggregated stats

### Requirement: Alice webhook ingestion
The system SHALL expose an Alice (Yandex) webhook that stores spoken entries as `raw_entries` with source `alice` and returns a valid Alice response.

#### Scenario: Alice utterance stored
- **WHEN** the Alice webhook receives an utterance
- **THEN** the system stores a `raw_entry` with source `alice` and returns a well-formed Alice response

### Requirement: Threshold notifications
The system SHALL monitor elapsed time since the last relevant event (e.g. feeding, diaper, wake window) against per-user thresholds and send a Telegram alert when a threshold is exceeded, using the user's configured chat id and thresholds.

#### Scenario: Alert when threshold exceeded
- **WHEN** the time since the last feeding exceeds the user's configured threshold and notifications are enabled
- **THEN** the system sends a Telegram alert to the user's configured chat

#### Scenario: No alert when notifications disabled
- **WHEN** a threshold is exceeded but the user has notifications disabled
- **THEN** the system sends no alert
