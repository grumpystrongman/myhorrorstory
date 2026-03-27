---
title: Self-Hosted Messaging
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-25T15:31:26.512Z'
updatedAt: '2026-03-25T15:31:26.512Z'
---
## Raw Concept
**Task:**
Document self-hosted communications infrastructure

**Files:**
- scripts/messaging/doctor.mjs
- scripts/messaging/sms-gateway-server.mjs
- apps/api/src/channels/channels.service.ts
- scripts/messaging/init-selfhosted.mjs

**Flow:**
Initialize setup -> Start infra -> Configure gateways -> Run diagnostics

**Timestamp:** 2026-03-25

## Narrative
### Structure
Infrastructure includes diagnostics, SMS gateway, and core channels service.

### Dependencies
Requires Docker/Compose, SMTP (Mailpit), WhatsApp (WAHA), Twilio/Webhook for SMS.

### Highlights
Supports WhatsApp QR regeneration, SMS gateway with Twilio/Webhook support, and robust channel routing with inbound consent handling.

### Rules
Consent keywords: opt-in (y, yes, start, continue, resume, unstop), opt-out (stop, unsubscribe, cancel, quit, optout).

### Examples
Regenerate WAHA QR: corepack pnpm messaging:waha:qr

## Facts
- **sms_gateway_port**: Default SMS gateway port is 3010 [project]
- **waha_url**: Default WAHA URL is http://127.0.0.1:3005 [project]
- **secrets_file**: Self-hosted secrets are generated in .secrets/communications.env [project]
