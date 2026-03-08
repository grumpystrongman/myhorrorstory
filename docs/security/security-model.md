# Security Model

## Baseline Controls
- Password auth with strong policy and hash storage requirements.
- Rotating refresh token session model.
- Role-based access control on all admin and privileged endpoints.
- Input validation with Zod schemas.
- Audit log writes for sensitive operations.
- Consent and legal acceptance timestamps persisted per user.
- Age gate and content warning acknowledgement.
- Queue and webhook endpoints with signature verification.

## Data Protection
- PII classification documented at field level.
- Encryption in transit mandatory.
- Secrets sourced from environment manager only.
- Asset storage uses scoped object paths and signed URLs.

## Abuse Controls
- Request rate limiting, invite abuse throttling, and login lockout policy.
- Moderation controls for user-generated notes/chat content.
