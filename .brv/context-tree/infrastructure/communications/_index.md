---
children_hash: 7dcb40c3d2a95d0c711704bd3784dae5ae02510822f4ecfafa8ca35db2057afe
compression_ratio: 0.824773413897281
condensation_order: 1
covers: [self_hosted_messaging.md]
covers_token_total: 331
summary_level: d1
token_count: 273
type: summary
---
# Self-Hosted Messaging Infrastructure

The self-hosted communications stack integrates diagnostic tools, SMS gateway management, and core channel routing.

## Core Components & Files
*   **Infrastructure Management**: `scripts/messaging/init-selfhosted.mjs` (setup), `scripts/messaging/doctor.mjs` (diagnostics).
*   **Gateway Services**: `scripts/messaging/sms-gateway-server.mjs` (SMS), `apps/api/src/channels/channels.service.ts` (routing).
*   **External Dependencies**: Docker/Compose, Mailpit (SMTP), WAHA (WhatsApp), and Twilio/Webhook for SMS integration.

## Technical Configuration
*   **Ports & Endpoints**: SMS gateway (port 3010), WAHA (http://127.0.0.1:3005).
*   **Secrets**: Managed via `.secrets/communications.env`.
*   **Operational Commands**: `corepack pnpm messaging:waha:qr` (QR regeneration).

## Routing & Logic
*   **Consent Keywords**:
    *   **Opt-in**: y, yes, start, continue, resume, unstop.
    *   **Opt-out**: stop, unsubscribe, cancel, quit, optout.
*   **Flow**: Initialization → Infrastructure startup → Gateway configuration → Diagnostic verification.