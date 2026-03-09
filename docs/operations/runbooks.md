# Operations Runbook

## Environments
- Local: Docker Compose with Postgres, Redis, MinIO.
- Staging: managed cloud equivalents with sanitized data.
- Production: HA Postgres + Redis + object storage + CDN.

## Core Runbooks
- Incident triage and escalation.
- Queue backlog response.
- Provider outage fallback and failover.
- Billing webhook replay.
- Remote testing from anywhere: `docs/operations/remote-testing-anywhere.md`.
- Messaging channel provisioning (SMS/WhatsApp/Telegram): `docs/operations/messaging-setup.md`.
- Linear bot suite orchestration for commercial creative delivery: `docs/operations/linear-bot-suite.md`.
- Linear automatic assigned-issue kickoff daemon: `docs/operations/linear-autorun.md`.
