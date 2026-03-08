# Service Boundaries

## API Responsibilities
- AuthN/AuthZ and role enforcement.
- Story/package discovery and progression APIs.
- Party orchestration and realtime signaling.
- Billing/entitlement orchestration.
- Admin and support operations APIs.

## Worker Responsibilities
- Timed chapter/clue unlocks.
- Voice and media generation orchestration.
- Lifecycle email delivery.
- Retry/backoff and dead-letter handling.

## Shared Package Responsibilities
- `contracts`: runtime schema validation and typed contracts.
- `story-engine`: deterministic progression logic.
- `auth`, `payments`, `email`, `analytics`, `voice`, `storage`: provider adapters.

## External Boundary Rule
All external vendors must be integrated behind package-level interfaces. App and API layers depend on interfaces, not provider-specific SDK calls.
