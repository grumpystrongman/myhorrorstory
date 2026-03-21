# Linear Bot Suite Control Plane

## Purpose

Run a full bot suite for commercial creative delivery with Linear as the control plane.

The suite handles:

- website design direction
- story artwork production planning
- campaign/social creative packs
- QA/security/compliance review tasks
- commercialization and launch sequencing

## Runtime Commands

- Generate dry-run plan (no Linear writes):
  - `corepack pnpm linear:bots:plan`
- Apply mode (create missing issues in Linear):
  - `corepack pnpm linear:bots:apply`
  - Also enforces bot-owner labels across all open team issues using planner routing.
- Continuous auto-kickoff for assigned issues:
  - `corepack pnpm linear:bots:autorun`
  - Polls `assignee = me`, executes mapped bot pipelines, comments result, updates local state/report.
- Single auto-kickoff cycle:
  - `corepack pnpm linear:bots:autorun:once`
- Auto-kickoff dry-run:
  - `corepack pnpm linear:bots:autorun:dry`
- Dispatch a concrete production package backlog across bots:
  - `corepack pnpm linear:bots:dispatch-package`
  - Uses `docs/operations/linear-production-package-backlog.json` as the source of truth.
- Dispatch full multimodal agent-army backlog across bots:
  - `corepack pnpm linear:bots:dispatch-agent-army`
  - Uses `docs/operations/linear-agent-army-backlog.json` as the source of truth.
- Build full commercial asset plan manifest:
  - `corepack pnpm creative:build-plan`
- Build full backstory/arc-aware agent-army plan and OpenClaw jobs:
  - `corepack pnpm creative:build-agent-army`
- Materialize all agent-army outputs to disk:
  - `corepack pnpm creative:materialize-agent-army`
- Verify agent-army output completeness:
  - `corepack pnpm creative:verify-agent-army`
- Dry-run OpenClaw dispatch queue:
  - `corepack pnpm creative:dispatch-openclaw-agent-army:dry`

## Required Environment

- `LINEAR_TEAM_KEY`

One of:

- `LINEAR_API_KEY` (legacy personal token flow)
- `LINEAR_ACCESS_TOKEN` (OAuth-issued bearer token)
- OAuth client credentials (`LINEAR_OAUTH_CLIENT_ID`, `LINEAR_OAUTH_CLIENT_SECRET`, `LINEAR_OAUTH_USE_CLIENT_CREDENTIALS=true`)

Optional OAuth helper values:

- `LINEAR_OAUTH_REDIRECT_URI`
- `LINEAR_OAUTH_SCOPE`
- `LINEAR_OAUTH_STATE`
- `LINEAR_OAUTH_ACTOR`

Optional but recommended:

- `OPENAI_API_KEY`
- `STABILITY_API_KEY`

## Bot Assignment Model

- Bot catalog is defined in `scripts/linear-bots/lib/bot-catalog.mjs`.
- Routing planner is defined in `scripts/linear-bots/lib/planner.mjs`.
- Planner uses:
  - explicit bot labels where present (`AI-*`)
  - keyword fallback routing by issue domain
- default orchestrator routing when no domain signal is present

## OAuth Tooling

- Reference: https://linear.app/developers/oauth-2-0-authentication
- Open local click-through auth page:
  - `corepack pnpm linear:oauth:connect`
- Print authorize URL:
  - `corepack pnpm linear:oauth:url`
- Exchange auth code:
  - `corepack pnpm linear:oauth:exchange -- --code <authorization_code>`
- Refresh token:
  - `corepack pnpm linear:oauth:refresh -- --refresh-token <refresh_token>`
- Client credentials token:
  - `corepack pnpm linear:oauth:client-credentials`

## Creative Blueprint Injection

- Commercial issue blueprints are generated from:
  - `scripts/linear-bots/lib/creative-blueprints.mjs`
- Includes:
  - core website art direction issues
  - campaign creative issues
  - per-story asset suite issues

## Outputs

- `docs/operations/linear-bot-suite-plan.json`
- `docs/operations/linear-bot-suite-report.md`
- `docs/operations/linear-autorun-state.json`
- `docs/operations/linear-autorun-report.md`
- `docs/operations/linear-production-package-backlog.json`
- `docs/operations/linear-production-package-report.json`
- `docs/operations/linear-production-package-report.md`
- `assets/manifests/commercial-creative-plan.json`
- `docs/operations/linear-agent-army-backlog.json`
- `docs/operations/linear-agent-army-backlog-report.json`
- `docs/operations/linear-agent-army-backlog-report.md`
- `docs/operations/openclaw-agent-army-jobs.json`
- `docs/operations/openclaw-agent-army-dispatch-report.json`
- `docs/operations/openclaw-agent-army-dispatch-report.md`
- `docs/operations/openclaw-agent-army-strict-aggregate-report.json`
- `docs/operations/openclaw-agent-army-strict-aggregate-report.md`
- `docs/operations/openclaw-agent-army-output-verification.json`
- `docs/operations/openclaw-agent-army-output-verification.md`
- `docs/operations/agent-army-materialization-report.json`
- `docs/operations/agent-army-materialization-report.md`
- `assets/manifests/commercial-agent-army-plan.json`
- `logs/linear-autorun/*.log`

## Quality Gates

- Brand compliance
- Accessibility contrast compliance
- Narrative coherence checks
- Provenance and rights verification
