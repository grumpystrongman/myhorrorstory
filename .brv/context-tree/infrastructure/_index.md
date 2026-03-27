---
children_hash: 5902d21560f83d37e3e35caa3e2d7bac09cab57d6660fb6f4bfe8b0c9f52d64d
compression_ratio: 0.9525222551928784
condensation_order: 2
covers: [communications/_index.md]
covers_token_total: 337
summary_level: d2
token_count: 321
type: summary
---
# Self-Hosted Messaging Infrastructure

The self-hosted communications stack manages diagnostic tools, SMS gateway services, and core channel routing.

## Infrastructure and Gateway Services
- **Management Scripts**: Setup and diagnostics are handled by `scripts/messaging/init-selfhosted.mjs` and `scripts/messaging/doctor.mjs`.
- **Gateway Services**: SMS handling is managed via `scripts/messaging/sms-gateway-server.mjs`, with routing logic centralized in `apps/api/src/channels/channels.service.ts`.
- **Dependencies**: Relies on Docker/Compose, Mailpit (SMTP), WAHA (WhatsApp), and Twilio/Webhook integrations.

## Technical Configuration and Operations
- **Network**: SMS gateway operates on port 3010; WAHA is reachable at `http://127.0.0.1:3005`.
- **Environment**: Secrets are centralized in `.secrets/communications.env`.
- **Maintenance**: QR code regeneration is performed using `corepack pnpm messaging:waha:qr`.

## Routing and Consent Logic
- **Opt-in Keywords**: y, yes, start, continue, resume, unstop.
- **Opt-out Keywords**: stop, unsubscribe, cancel, quit, optout.
- **Lifecycle Flow**: Initialization → Infrastructure startup → Gateway configuration → Diagnostic verification.

Refer to `communications/self_hosted_messaging.md` for full implementation details.