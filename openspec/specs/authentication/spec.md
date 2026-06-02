# authentication Specification

## Purpose
Authenticate clients via Telegram Mini App `initData` (HMAC-verified) or a configured access code, issue signed JWTs, protect all `/api/*` endpoints, and store per-user settings.

## Requirements

### Requirement: Telegram Mini App verification
The system SHALL verify Telegram Mini App `initData` by validating its HMAC signature against the bot token and, on success, issue a signed JWT for subsequent API calls.

#### Scenario: Valid initData yields a token
- **WHEN** a client POSTs valid Telegram `initData` to the verify endpoint
- **THEN** the system validates the HMAC and returns a signed JWT

#### Scenario: Tampered initData rejected
- **WHEN** the `initData` HMAC does not match
- **THEN** the system responds with HTTP 401 and issues no token

### Requirement: Access-code login
The system SHALL allow login via a configured access code, returning a signed JWT on a correct code.

#### Scenario: Correct access code
- **WHEN** a client submits the correct access code
- **THEN** the system returns a signed JWT

#### Scenario: Wrong access code
- **WHEN** a client submits an incorrect access code
- **THEN** the system responds with HTTP 401 and issues no token

### Requirement: JWT-protected API
The system SHALL require a valid JWT for all `/api/*` endpoints except the auth endpoints, rejecting missing or invalid tokens with HTTP 401.

#### Scenario: Protected endpoint without token
- **WHEN** a client calls a protected `/api/*` endpoint without a valid JWT
- **THEN** the system responds with HTTP 401

#### Scenario: Protected endpoint with valid token
- **WHEN** a client calls a protected endpoint with a valid JWT
- **THEN** the request is authorized and processed

### Requirement: User settings
The system SHALL store and retrieve per-user key/value settings (e.g. notification thresholds, chat id) for the authenticated user.

#### Scenario: Set and get a setting
- **WHEN** an authenticated user writes a setting value for a key and later reads that key
- **THEN** the stored value is returned
