# Messaging Setup Runbook (SMS, WhatsApp, Telegram)

Use this runbook to configure outbound and inbound player messaging channels.

## 1) Configure Environment

Set these variables in `.env`:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM`
- `TWILIO_WHATSAPP_FROM`
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

## 2) Provider Dashboard Setup

### Twilio (SMS + WhatsApp)

- Incoming webhook URL:
  - `https://<api-origin>/api/v1/webhooks/twilio`
- Use `HTTP POST`.
- If signature validation is enabled, keep Twilio request signing enabled.

### Telegram Bot

- Set webhook URL:
  - `https://<api-origin>/api/v1/webhooks/telegram`
- Set secret token equal to `TELEGRAM_WEBHOOK_SECRET`.

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
