# Story Quality Agent Pipeline

This pipeline simulates human-style playthroughs for every story and writes production-readiness reports for owner review.

## Command

- `corepack pnpm qa:simulate-stories`

## Outputs

- Public report index: `apps/web/public/reports/quality/index.json`
- Per-story report JSON: `apps/web/public/reports/quality/<storyId>.json`
- Markdown summaries: `docs/qa/quality-agent/<storyId>.md`

## What Is Simulated

Each story runs multiple strategies:

- Conservative novice path
- Assertive audit path
- Deceptive path
- Rotating branch sampler
- Justice target
- Corruption target
- Pyrrhic target
- Ending-target searches
- Forced branch probes for any uncovered choice

## Scoring

Each report includes:

- Production readiness score (1-100)
- Difficulty level (1-3)
- Coverage scores for beats, branch options, and endings
- Score breakdown (structural, narrative, interaction, novice clarity, reliability)
- Full decision traces with agent thinking and result output per step

## Owner Dashboard

The web dashboard exposes reports through owner-gated routes:

- `/dashboard?ownerKey=<OWNER_DASHBOARD_KEY>`
- `/dashboard/quality?ownerKey=<OWNER_DASHBOARD_KEY>`
- `/dashboard/quality/<storyId>?ownerKey=<OWNER_DASHBOARD_KEY>`

If `OWNER_DASHBOARD_KEY` is not set, owner QA views remain disabled.
