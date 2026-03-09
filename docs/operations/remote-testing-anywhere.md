# Remote Testing Anywhere

## Goal
Run MyHorrorStory on a machine you control and expose secure public URLs so you can test web, admin, and API flows from anywhere in the world.

## Architecture
- Local runtime processes:
- `@myhorrorstory/api` on `REMOTE_TEST_API_PORT` (default `8787`)
- `@myhorrorstory/web` on `REMOTE_TEST_WEB_PORT` (default `3100`)
- `@myhorrorstory/admin` on `REMOTE_TEST_ADMIN_PORT` (default `3101`)
- Local infrastructure:
- Docker Compose stack from `infra/docker/compose.yaml` (`postgres`, `redis`, `minio`)
- Public ingress:
- Tunnel provider adapter (`cloudflared`, `ngrok`, or `local`)
- Session metadata:
- `.run-logs/remote-test/session.json`

## Prerequisites
1. Install Node.js 22+, Corepack, and project dependencies.
2. Install Docker Desktop / Docker Engine.
3. Install one tunnel provider:
   - Recommended: Cloudflare Tunnel (`cloudflared`)
   - Alternative: ngrok (`ngrok`)

## Start A Remote Test Session
1. Optional provider selection:
   - `REMOTE_TEST_PROVIDER=cloudflared` (default)
   - `REMOTE_TEST_PROVIDER=ngrok`
   - `REMOTE_TEST_PROVIDER=local` (no public tunnel)
2. Start:
   - `corepack pnpm remote:test:start`
3. Capture generated URLs from terminal output.
4. Share URLs with test devices or teammates.

The start command keeps running while tunnels are active. If the process exits, public URLs are no longer valid.

## Inspect Session URLs
- `corepack pnpm remote:test:status`

## Dry Run (No Processes Started)
- `REMOTE_TEST_DRY_RUN=true corepack pnpm remote:test:start`

## Stop Session
- `corepack pnpm remote:test:stop`

## Safety Defaults
- `REMOTE_TEST_KEEP_INFRA=false` by default to tear down Docker infra when the launcher exits.
- Use test accounts and synthetic data only.
- Do not use production secrets in remote testing.
- For persistent external QA, run this on a dedicated VM instead of your primary workstation.

## Useful Environment Overrides
- `REMOTE_TEST_WEB_PORT`
- `REMOTE_TEST_ADMIN_PORT`
- `REMOTE_TEST_API_PORT`
- `REMOTE_TEST_SKIP_INFRA=true` (if infra already running)
- `REMOTE_TEST_KEEP_INFRA=true` (keep Docker infra after launcher exit)

## Recommended Operational Pattern
1. Run remote test mode on a small cloud VM or always-on machine.
2. Keep this process under `tmux`, `screen`, or systemd.
3. Use the exported public URLs for road testing from mobile and laptop.
4. Stop and rotate sessions after each test cycle.
