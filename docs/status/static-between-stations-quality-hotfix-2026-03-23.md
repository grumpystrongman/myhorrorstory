# Static Between Stations Quality Hotfix (2026-03-23)

## Completed
- Rewrote `static-between-stations` drama package to `director-cut-v3-hand-authored` with bespoke day-by-day narrative and dialogue for Days 1-28.
- Upgraded mission briefing and case file framing so players see a clear investigation objective, primary question, and consequence model before branching.
- Fixed play-session iPhone interaction lock by removing `isSimulatingBeat` from composer gating and enabling mission bootstrap via chat send/quick reply.
- Added runtime channel relay from play-session messages to `/api/channels/send` for `SMS`, `WHATSAPP`, and `TELEGRAM` using mapped `playerId`.
- Added persistent channel routing context between setup and play via local storage keys:
  - `myhorrorstory.channel.caseId`
  - `myhorrorstory.channel.playerId`
- Added a direct testing link in channel setup: `Open Play Session With This Mapping`.
- Replaced low-fidelity dynamic play soundtrack synthesis path with directed, pre-rendered story stems:
  - calm -> story theme loop
  - medium tension -> disruption ambience stem
  - high tension -> endgame ambience stem
- Added fallback-to-track behavior if a directed stem fails to load.
- Added command for repeatable authored pass generation:
  - `pnpm stories:author-static-between-stations`
- Updated Linear OAuth/autorun scripts to load `.env` / `.env.local` before resolving credentials.

## Validation Evidence
- `pnpm --filter @myhorrorstory/web test` -> passed (7 files, 14 tests).
- `pnpm --filter @myhorrorstory/music test` -> passed (1 file, 15 tests).
- `pnpm --filter @myhorrorstory/web build` -> passed.
- `pnpm --filter @myhorrorstory/web typecheck` -> passed (after build-generated `.next/types` present).
- `pnpm stories:author-static-between-stations` -> completed and rewrote drama package.
- Runtime data check:
  - `/content/drama/static-between-stations.json` returns `version: director-cut-v3-hand-authored`.

## Remaining
- Linear bot autorun could not execute project orchestration due authentication failure (`401` / missing active token in environment).
- Live end-to-end external relay confirmation still depends on a valid mapped player route in API store and a currently valid Linear token for automation workflows.

## Risks
- `apps/web` `typecheck` requires generated `.next/types`; running typecheck before build can fail when those generated files are absent.
- Existing large uncommitted generated asset set in repository can obscure incremental diffs and QA triage if not periodically baseline-committed.

## Signoff
- Scope for this hotfix is implementation-complete for:
  - story depth (Static Between Stations),
  - mobile/iPhone input usability,
  - message relay path from play runtime,
  - higher-fidelity soundtrack routing on play path.
