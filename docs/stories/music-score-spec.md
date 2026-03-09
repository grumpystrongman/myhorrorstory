# Music Score Design Spec

## Objective
Provide continuous premium horror score playback across:
- platform landing and funnel pages (global overture)
- initial story intros (story-specific score handoff)
- gameplay sessions (story-specific score where story context is known)

## Runtime Implementation
- Shared score engine: `packages/music/src/index.ts`
- Web runtime player: `apps/web/src/app/components/soundtrack-player.tsx`
- Story intro route: `apps/web/src/app/stories/[storyId]/intro/page.tsx`
- Score placeholders: `apps/web/public/audio/scores/*.wav`

## Selection Rules
1. If route matches `/stories/{storyId}/intro`, use that story score.
2. Else if query `storyId` exists (for `/play?storyId=...`), use that story score.
3. Otherwise use global theme `platform-overture`.

## Commercial Controls
- User-controlled enable/mute toggle.
- Persistent volume control using local storage.
- Route-aware automatic track switching with loop-safe assets.
- Data-testid instrumentation for automated click + audio UX validation.

## AI Generation Pipeline
- Prompt library: `assets/prompts/score-library.json`
- Output manifest: `assets/manifests/score-manifest.json`
- Provider abstraction in code (`MusicGenerationProvider`) enables Suno/Udio/AIVA/provider adapters without changing game logic.
- Current placeholder assets are deterministic synthetic stand-ins and can be swapped with mastered stems without app code changes.

## Dynamic Horror Loop Engine
- Engine implementation: `packages/music/src/index.ts` (`generateDynamicHorrorLoop`).
- Input model:
- `storyMood`
- `sceneType`
- `villainPresence` (boolean or intensity)
- `playerTensionLevel` (`0-100`)
- `location` (`forest | basement | hospital | alley | ritual_chamber`)
- optional `durationSeconds` (`10-120`) and `seed`.
- Output model:
- unique loop id
- randomized musical parameters (tempo, key, scale, layer gains/pans)
- seamless stereo WAV bytes (`Uint8Array`)
- loop boundary delta for click-risk validation.
- Layer style palette:
- dark ambient drones
- eerie piano melodies
- whispering choir textures
- industrial metallic echoes
- suspense percussion
- ritualistic chanting
- Anti-repetition controls:
- seeded randomization across tempo/key/scale/layer parameters
- procedural event variation (melody/percussion/metal strikes/chant pulses)
- location-driven ambient texture synthesis.

## AI Sound Director
- Director implementation: `AISoundDirector` + `createSoundDirectorLoop` in `packages/music/src/index.ts`.
- Runtime telemetry inputs:
- `playerProgress` (`0-100`)
- `timeOfNightHour` (`0-23`)
- `villainProximity` (`0-100`)
- `dangerLevel` (`0-100`)
- `storyMood`
- `location`
- Output behavior bands:
- low tension -> `Calm Ambience`
- medium tension -> `Suspense Drones`
- high tension -> `Rapid Heartbeat Percussion`
- Web integration:
- `/play` emits telemetry via `window` event `myhorrorstory:sound-director-telemetry`.
- global soundtrack player consumes telemetry and swaps to generated loop-safe WAV blobs in real time.

## Quality Gates
- Unit tests:
  - manifest uniqueness and global track guarantee
  - track resolution by route/query story context
  - generation orchestrator fallback behavior
- E2E tests:
  - global-to-story soundtrack switch on intro pages
  - story context surfaced in play session
  - existing interaction/a11y/visual suites remain green
