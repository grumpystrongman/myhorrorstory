# Music Score Design Spec

## Objective
Deliver commercial-grade adaptive horror scoring for:
- landing and onboarding surfaces (global overture)
- story intros (story-specific handoff)
- gameplay sessions (AI Sound Director adaptive scoring)

## Runtime Components
- Score and generation engine: `packages/music/src/index.ts`
- Web soundtrack controller: `apps/web/src/app/components/soundtrack-player.tsx`
- Gameplay telemetry emitter: `apps/web/src/app/play/page.tsx`
- Static commercial loops: `apps/web/public/audio/scores/*.wav`
- Manifest: `assets/manifests/score-manifest.json`

## Commercial Score Pass (v2)
- Render script: `scripts/generate-score-placeholders.mjs`
- Sample rate: `16kHz`
- Typical loop duration: `40-44s`
- Layering model: drone + choir texture + piano stabs + percussion + ambient noise bed
- Loop integrity: harmonic cycles are quantized to loop duration to avoid seam pops

## Selection Rules
1. Route `/stories/{storyId}/intro` -> story score.
2. Route query `/play?storyId=...` -> story score.
3. Fallback -> `platform-overture`.

## AI Sound Director
- Engine: `AISoundDirector` + `createSoundDirectorLoop`
- Inputs:
  - `playerProgress`
  - `timeOfNightHour`
  - `villainProximity`
  - `dangerLevel`
  - `storyMood`
  - `location`
- Output bands:
  - `Calm Ambience`
  - `Suspense Drones`
  - `Rapid Heartbeat Percussion`

## Dynamic Loop Generation Requirements
- Required style palette:
  - dark ambient drones
  - eerie piano melodies
  - whispering choir textures
  - industrial metallic echoes
  - suspense percussion
  - ritualistic chanting
- Input bounds:
  - duration `10-120s`
  - tension `0-100`
  - location texture keyed to scene context
- Output:
  - deterministic loop ID
  - randomized tonal and tempo profile
  - loop boundary delta for seam-risk checks

## Quality Gates
- Unit tests: `packages/music/src/index.test.ts`
  - manifest integrity
  - route-to-score resolution
  - dynamic loop generation and anti-repetition
  - sound director banding logic
- E2E tests: `tests/e2e/web-commercial.spec.ts`
  - global-to-story score switching
  - play-session telemetry to soundtrack behavior
  - user audio controls and playback visibility

