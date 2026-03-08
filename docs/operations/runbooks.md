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
