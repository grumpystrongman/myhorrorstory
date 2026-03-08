# Deployment Guide

## Environment Targets
- Local: Docker Compose + `.env`.
- Staging: managed Postgres/Redis/S3 with non-production credentials.
- Production: HA managed services, CDN fronting web/admin assets, autoscaled API and worker.

## Build and Release Steps
1. `pnpm install`
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
3. Build container images for `apps/api`, `apps/worker`, `apps/web`, `apps/admin`.
4. Apply infrastructure changes via Terraform.
5. Run DB migrations and smoke tests.
6. Switch traffic using rolling/canary strategy.

## Rollback
- Revert application image tags.
- Apply reverse migration only when safe; otherwise use forward-fix strategy.
- Disable risky feature flags immediately during incident mitigation.
