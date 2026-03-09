# Linear Auto-Run

## Purpose
Automatically kick off bot workflows for any open Linear issue assigned to the authenticated viewer.

This runner:
- polls Linear on an interval
- filters `assignee = viewer`
- infers bot owner from labels/keywords
- executes mapped repo commands
- writes run state and reports locally
- comments completion/failure back to the issue
- optionally moves issue state to `started` and `completed`

## Commands
- Start continuous daemon:
  - `corepack pnpm linear:bots:autorun`
- Run one cycle and exit:
  - `corepack pnpm linear:bots:autorun:once`
- Dry-run one cycle (no commands, no Linear writes):
  - `corepack pnpm linear:bots:autorun:dry`

## Required Environment
- `LINEAR_TEAM_KEY`
- one of:
  - `LINEAR_ACCESS_TOKEN`
  - `LINEAR_API_KEY`
  - OAuth client credentials

Optional tuning:
- `LINEAR_AUTORUN_INTERVAL_SECONDS` (default `60`)
- `LINEAR_AUTORUN_MAX_PER_CYCLE` (default `2`)
- `LINEAR_AUTORUN_MANAGE_STATES` (`true`/`false`)
- `LINEAR_AUTORUN_COMPLETE_ON_SUCCESS` (`true`/`false`)
- `LINEAR_AUTORUN_RETRY_FAILED` (`true`/`false`)

## Bot Command Mapping
- `AI-Media-Pipeline-Agent`
  - `creative:build-plan`, `creative:generate-visuals`, `creative:materialize-assets`, `creative:validate-visuals`
- `AI-Story-Engine-Agent`
  - `stories:build-compendium`, `stories:build-drama`
- `AI-Voice-Audio-Agent`
  - `voice:build-drama`, `scripts/generate-score-placeholders.mjs`
- `AI-Web-App-Agent`
  - `@myhorrorstory/web build`
- `AI-Mobile-App-Agent`
  - `@myhorrorstory/mobile build`
- `AI-Backend-Agent`
  - `@myhorrorstory/api build`, `@myhorrorstory/worker build`
- `AI-UX-UI-Agent`
  - `@myhorrorstory/design-tokens build`, `@myhorrorstory/ui build`
- `AI-Admin-Ops-Agent`
  - `@myhorrorstory/admin build`
- `AI-Growth-CRM-Agent`
  - `@myhorrorstory/email build`, `@myhorrorstory/crm build`
- `AI-QA-Test-Agent`
  - `test:commercial`
- `AI-Security-Compliance-Agent`
  - `scripts/validate-baseline.mjs`
- `AI-DevOps-Release-Agent`
  - `build`, `test`
- `AI-Commercial-Success-Agent`
  - `linear:bots:dispatch-package`
- `AI-Executive-Orchestrator`, `AI-Product-Agent`, fallback
  - `linear:bots:apply`

## Output Artifacts
- State:
  - `docs/operations/linear-autorun-state.json`
- Cycle report:
  - `docs/operations/linear-autorun-report.md`
- Command logs:
  - `logs/linear-autorun/*.log`

## Unattended Operation
Run `linear:bots:autorun` in a persistent terminal/session manager on the machine that has your repo and env configured.  
If you assign a new issue to yourself in Linear, it will be detected on the next poll cycle and kicked off automatically.
