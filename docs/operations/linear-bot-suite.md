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
- Build full commercial asset plan manifest:
  - `corepack pnpm creative:build-plan`

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
- `assets/manifests/commercial-creative-plan.json`

## Quality Gates
- Brand compliance
- Accessibility contrast compliance
- Narrative coherence checks
- Provenance and rights verification
