# ARG Reframe Execution Plan (Linear + OpenClaw)

## Objective
Operationalize the 28-day ARG system across narrative, artifact production, interaction delivery, and QA.

## Linear Workstreams
1. `ARG-ARCH`
- Deliverable: stable campaign/day schema, runtime helpers, and compatibility adapter.
- Acceptance: all stories compile to `campaign + 28 day files` and load in `/play`.

2. `ARG-STORY`
- Deliverable: thread consistency and daily narrative continuity across all 28 days.
- Acceptance: no dead-end day and no disconnected branch anchor.

3. `ARG-ARTIFACT`
- Deliverable: evidence packs with clue-bearing and misleading artifacts per cadence rules.
- Acceptance: each day has at least one artifact and prompts for both image + audio generation.

4. `ARG-NPC`
- Deliverable: behavior prompts and role logic for detective/witness/journalist/antagonist/unknown contact.
- Acceptance: dialogue prompt pack present and references prior choices plausibly.

5. `ARG-WEB`
- Deliverable: message/evidence/timeline/files surfaces integrated into play runtime.
- Acceptance: `/play` loads ARG-generated content first and supports 28-day progression.

6. `ARG-QA`
- Deliverable: full-month simulation and branch-path verification.
- Acceptance: all day files parse, unlock chains succeed, and playthrough reaches valid endings.

## OpenClaw Agent Lanes
1. `AI-Story-Engine-Agent`
- Task: verify day-to-day narrative continuity, clue threading, and branch logic.

2. `AI-Media-Pipeline-Agent`
- Task: execute image/audio prompt lanes for artifact visuals and ambience cues.

3. `AI-Web-App-Agent`
- Task: validate ARG presentation surfaces and interaction pacing in web simulation.

4. `AI-Quality-Agent`
- Task: run schema/lint/smoke checks and report day-level blockers.

## Release Cadence
1. Generate campaigns:
- `pnpm stories:build-arg`

2. Validate content:
- JSON schema/shape checks and sample 7-day spot reviews.

3. Run web tests:
- `pnpm --filter @myhorrorstory/web test`

4. Build simulations:
- `pnpm simulations:build-playthrough`

5. Dispatch OpenClaw execution (optional live):
- `pnpm creative:dispatch-openclaw-agent-army -- --limit 12 --start 0 --execute`

## Guardrails
- Preserve immersion and grounded realism.
- Do not bypass unlock conditions.
- Keep player-aware moments plausible and non-meta.
- Keep misleading artifacts solvable through cross-day deduction.
