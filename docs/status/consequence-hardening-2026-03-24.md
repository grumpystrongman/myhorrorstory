# Consequence Hardening Report (2026-03-24)

## Completed
- Added hard fail-state runtime logic to Play Session:
  - Possession takeover (villain advantage saturation)
  - Terminal casualty outcome (danger and aggression overload)
  - Case collapse (timeline expiry without sufficient proof)
  - Framed corruption (trust collapse + deception spike)
- Added explicit failure presentation in UI with mission-failed state and restart call-to-action.
- Updated response consequence math so high-risk intents increase villain leverage, danger, and progress penalties.
- Added inaction penalties during stalled play windows (danger, villain proximity, villain advantage all rise).
- Expanded all story drama packages with stronger consequence language and fail-forward stakes:
  - Added/normalized tragic ending content
  - Strengthened corruption and unresolved consequences
  - Expanded case-file failure consequence lists
  - Enforced replay-driven hooks tied to hard loss outcomes
- Enriched beat narrative depth across the catalog with stage-aware consequence framing.
- Updated ARG adapter endings/case-file defaults for runtime consistency.
- Added resolver unit tests for Justice/Tragic/Corruption/Pyrrhic/Unresolved classifications.

## Validation Evidence
- `corepack pnpm --filter @myhorrorstory/web typecheck` passed.
- `corepack pnpm --filter @myhorrorstory/web lint` passed.
- `corepack pnpm --filter @myhorrorstory/web test` passed (16 tests).
- `corepack pnpm qa:simulate-stories` passed.
- Quality outputs regenerated:
  - `apps/web/public/reports/quality/index.json`
  - `apps/web/public/reports/quality/*.json`
  - `docs/qa/quality-agent/*.md`
- Current quality index shows:
  - 11/11 stories at 100% beat coverage
  - 11/11 stories at 100% choice coverage
  - 11/11 stories at 100% core ending coverage
  - production-readiness range: 93-97

## Remaining
- Optional ending-tone paths (pyrrhic/unresolved rarity) can be tuned further per story if desired for broader tonal spread.
- Voice-design metadata can be enriched further in source media manifests for stricter audio-naturalness auditing.

## Notes
- Linear bot autorun script currently fails with a Linear API authentication context error in local script runtime.
- OpenClaw job-dispatch flow is available and currently dry-run validated.
