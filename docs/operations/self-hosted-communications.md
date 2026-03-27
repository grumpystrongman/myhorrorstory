# Self-Hosted Communications Stack

This project now supports self-hosted communications providers without hard dependency on Twilio/Resend.

## What is included

- Email over SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`)
- WhatsApp over WAHA (`WHATSAPP_WAHA_URL`, `WHATSAPP_WAHA_*`)
- SMS over generic HTTP gateway (`SMS_GATEWAY_URL`, optional bearer/api key)
- Existing Telegram and Signal adapters remain supported.
- Optional strict mode: `MESSAGING_ENABLE_CONSOLE_FALLBACK=false` to prevent fake "console" sends.

## Secrets file (gitignored)

All local credentials are stored in:

- `.secrets/communications.env`

This path is ignored by git and is loaded by API runtime on startup.

Initialize secrets:

```bash
corepack pnpm comm:selfhosted:init
```

## Start local stack (Mailpit + WAHA)

```bash
corepack pnpm comm:selfhosted:up
```

Services:

- Mailpit SMTP: `127.0.0.1:1025`
- Mailpit UI: `http://127.0.0.1:8025`
- WAHA API: `http://127.0.0.1:3005`
- Optional local SMS gateway (Node service): `http://127.0.0.1:3010`

Stop:

```bash
corepack pnpm comm:selfhosted:down
```

Status:

```bash
corepack pnpm comm:selfhosted:status
```

Run diagnostics (includes WAHA session state + SMS gateway health):

```bash
corepack pnpm messaging:doctor
```

If WhatsApp is waiting for pairing, fetch/open the QR code:

```bash
corepack pnpm messaging:waha:qr
```

## WhatsApp setup

1. Start API and WAHA.
2. Pair WAHA session (scan QR from WAHA management endpoint).
3. Ensure `.secrets/communications.env` contains:
   - `WHATSAPP_WAHA_URL=http://127.0.0.1:3005`
   - `WHATSAPP_WAHA_SESSION=default`
   - `WHATSAPP_WAHA_API_KEY=...`
   - `WHATSAPP_WAHA_WEBHOOK_SECRET=...`
4. Run:

```bash
corepack pnpm messaging:connect -- --case-id static-between-stations --player-id owner-local --phone 8127810028 --channels WHATSAPP,TELEGRAM
```

## SMS setup (open-source gateway)

SMS requires a carrier-connected gateway (for example Android modem bridge, Gammu/Kannel, or any HTTP gateway you operate).

You can run the included local gateway service:

```bash
corepack pnpm comm:selfhosted:sms:start
```

Gateway transport modes are controlled in `.secrets/communications.env`:

- `SMS_GATEWAY_TRANSPORT=disabled` (default, returns explicit 503)
- `SMS_GATEWAY_TRANSPORT=twilio` (uses `TWILIO_*` credentials)
- `SMS_GATEWAY_TRANSPORT=webhook` (forwards to `SMS_GATEWAY_FORWARD_URL`)

Set:

- `SMS_GATEWAY_URL` (POST endpoint that accepts `{ to, text, mediaUrls, metadata }`)
- `SMS_GATEWAY_API_KEY` or `SMS_GATEWAY_BEARER_TOKEN` (optional)

Health endpoint expectation:

- If `SMS_GATEWAY_URL` is `http://host:3010/send`, doctor checks `http://host:3010/health`.

Then map/send using existing API endpoints:

- `POST /api/v1/channels/setup/user`
- `POST /api/v1/admin/broadcasts/channels`

## Consent handling (Y/STOP)

Consent logic is implemented centrally in channel runtime:

- Opt-in: `Y`, `YES`, `START`, `CONTINUE`, `RESUME`, `UNSTOP`
- Opt-out: `STOP`, `UNSUBSCRIBE`, `CANCEL`, `QUIT`, `OPTOUT`

For WhatsApp WAHA inbound, use webhook:

- `POST /api/v1/webhooks/whatsapp/waha`

with header:

- `x-waha-webhook-secret: <WHATSAPP_WAHA_WEBHOOK_SECRET>`
