# Messaging Setup Runbook (SMS, WhatsApp, Telegram)

Use this runbook to configure outbound and inbound player messaging channels.

## Quick Start (Owner Local Test)

For your local owner test account (phone `8127810028`) with Telegram credentials imported from MyAika:

```bash
corepack pnpm messaging:connect:owner -- --public-url https://<your-public-api-url>
```

What this does:

- Loads `.env` from repo root.
- Imports Telegram bot token/chat ID from MyAika `.env` when local values are missing.
- Registers SMS/WhatsApp/Telegram contacts for `caseId=static-between-stations`, `playerId=owner-local`.
- Sends setup validation messages on configured channels.
- Prints delivery receipts and failures.

If you want imported Telegram values persisted to `.env`, add `--write-env`.

## 1) Configure Environment

Set these variables in `.env` or `.secrets/communications.env`:

- Twilio path:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_SMS_FROM`
  - `TWILIO_WHATSAPP_FROM`
- Self-hosted SMS path:
  - `SMS_GATEWAY_URL`
  - `SMS_GATEWAY_API_KEY` or `SMS_GATEWAY_BEARER_TOKEN` (optional)
- Self-hosted WhatsApp path (WAHA):
  - `WHATSAPP_WAHA_URL`
  - `WHATSAPP_WAHA_SESSION`
  - `WHATSAPP_WAHA_API_KEY` (optional)
  - `WHATSAPP_WAHA_BEARER_TOKEN` (optional)
  - `WHATSAPP_WAHA_WEBHOOK_SECRET`
- `TWILIO_VALIDATE_SIGNATURES=true` (recommended)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `MESSAGING_PUBLIC_BASE_URL` (public API origin, for webhook URL generation)

Optional:

- `TWILIO_STATUS_CALLBACK_URL`
- `TELEGRAM_PARSE_MODE`
- `TELEGRAM_DISABLE_NOTIFICATION`

Run:

```bash
corepack pnpm messaging:setup -- --public-url https://your-public-api.example.com
```

This prints required webhook URLs and missing env vars.

Important: placeholder values (e.g. `replace_me`, `your_token`, `example`) are treated as missing.

## 2) Provider Dashboard Setup

### Twilio (SMS + WhatsApp)

- Incoming webhook URL:
  - `https://<api-origin>/api/v1/webhooks/twilio`
- Use `HTTP POST`.
- If signature validation is enabled, keep Twilio request signing enabled.
- For WhatsApp sandbox testing, enroll the destination number in the Twilio sandbox first (Twilio console provides the join code).

### WAHA (Self-hosted WhatsApp)

- Incoming webhook URL:
  - `https://<api-origin>/api/v1/webhooks/whatsapp/waha`
- Set WAHA webhook secret header to `WHATSAPP_WAHA_WEBHOOK_SECRET` (`x-waha-webhook-secret`).
- Ensure WAHA session is paired (QR scan) before sending.

### Telegram Bot

- Set webhook URL:
  - `https://<api-origin>/api/v1/webhooks/telegram`
- Set secret token equal to `TELEGRAM_WEBHOOK_SECRET`.
- Bot must have an active chat with the player before sends to that chat ID will succeed.

## 3) Map Player Contacts To Case Runtime

Register contacts so inbound provider messages can route to the correct `caseId` and `playerId`.

```bash
curl -X POST "https://<api-origin>/api/v1/channels/setup/user" \
  -H "content-type: application/json" \
  -d '{
    "caseId":"midnight-lockbox",
    "playerId":"player-1",
    "contacts":[
      {"channel":"SMS","address":"+15550001111","optIn":true},
      {"channel":"WHATSAPP","address":"whatsapp:+15550002222","optIn":true},
      {"channel":"TELEGRAM","address":"123456789","optIn":true}
    ]
  }'
```

Alternative (single command):

```bash
corepack pnpm messaging:connect -- \
  --case-id midnight-lockbox \
  --player-id player-1 \
  --phone +18127810028 \
  --telegram-chat-id 123456789 \
  --public-url https://<api-origin>
```

## 4) Send Setup Validation Messages

```bash
curl -X POST "https://<api-origin>/api/v1/channels/setup/test" \
  -H "content-type: application/json" \
  -d '{"caseId":"midnight-lockbox","playerId":"player-1"}'
```

Expected result:

- `sentCount > 0`
- per-channel delivery receipts with provider name and external message IDs.

## 5) Send Live Case Messages

Use backend dispatch for in-story outbound sends:

```bash
curl -X POST "https://<api-origin>/api/v1/channels/send" \
  -H "content-type: application/json" \
  -d '{
    "caseId":"midnight-lockbox",
    "playerId":"player-1",
    "channels":["SMS","TELEGRAM"],
    "message":"Evidence drop now available. Check Unit 331."
  }'
```

## 6) Verify Runtime Inbound Processing

- Reply to SMS/WhatsApp/Telegram test messages from registered contacts.
- Webhooks normalize payloads and feed runtime ingestion.
- Check API response/logs for:
  - `accepted: true`
  - routed `caseId`, `playerId`
  - `recognizedIntent`

## 7) Security Notes

- Keep `TWILIO_VALIDATE_SIGNATURES=true` in staging/production.
- Always set `TELEGRAM_WEBHOOK_SECRET` and enforce HTTPS webhook URLs.
- Rotate provider keys on a schedule and after suspected exposure.

## Troubleshooting

- `No channels are ready for setup`: required provider env vars are missing or still placeholders.
- Telegram webhook skipped: Telegram requires HTTPS webhook URLs.
- SMS skipped: configure either Twilio or `SMS_GATEWAY_URL`.
- WhatsApp skipped: configure either Twilio or WAHA (`WHATSAPP_WAHA_URL`).
- `contact_not_registered` on inbound webhook: run `POST /channels/setup/user` again for that `caseId` + `playerId`.
