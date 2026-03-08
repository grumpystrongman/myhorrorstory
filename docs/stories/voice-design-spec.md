# Voice Design Spec

## Objective
Deliver region-aware, sex-aware, character-unique voices with emotional and situational variation for every launch story character.

## Runtime Architecture
- Orchestrator: `packages/voice/src/orchestrator.ts`
- Casting registry + launch profiles: `packages/voice/src/casting.ts`
- Providers/adapters: `packages/voice/src/providers.ts`
- Contracts: `packages/contracts/src/index.ts` (`storyVoiceCastingSchema`)

## Provider Strategy (Adapter Chain)
1. Piper (`PiperVoiceProvider`) for local/private synthesis and deterministic cost control.
2. ElevenLabs (`ElevenLabsVoiceProvider`) for premium narrative delivery.
3. OpenAI TTS (`OpenAIVoiceProvider`) for robust global fallback.
4. Polly (`PollyVoiceProvider`) via injected AWS adapter abstraction.
5. Deterministic provider as last-resort continuity fallback.

## Character Voice Profile Model
Each character profile includes:
- `storyId`, `characterId`, `region`, `locale`, `sex`
- Personality attributes (`cadence`, `vocabularyTone`, `emotionalRange`)
- `defaultEmotion` and emotion-specific synthesis expressions (`rate`, `pitch`, `stability`, `style`, `gainDb`)
- Per-character variation jitter controls for natural delivery
- Ordered provider preferences with per-provider voice IDs/models/speaker IDs

## Emotional Variation Rules
Emotion is selected in this order:
1. Explicit `emotion` on request.
2. Legacy style mapping (`calm|urgent|ominous`).
3. Story event mapping (`final_reveal -> ominous`, `debrief -> relief`, etc.)
4. Context-driven urgency fallback.

Expression rendering then applies deterministic micro-variation by seed:
- `rateJitter`, `pitchJitter`, `styleJitter`
- Tension/urgency amplification from story context
- Deterministic cache key generation with text hash + profile + provider + emotion + context

## Launch Casting Guarantees (v1)
- 10 stories x 4 characters each = 40 voice profiles.
- Unique profile ID per `storyId + characterId`.
- Unique primary provider voice assignment per profile.
- Region and sex metadata included for each profile.
- Validated by tests in `packages/voice/src/index.test.ts`.

## Piper Configuration
Set in environment for worker/runtime:
- `PIPER_ENDPOINT` for HTTP mode (recommended for service deployment).
- `PIPER_BINARY_PATH` + `PIPER_MODEL_DIR` for direct CLI mode.
- `PIPER_API_KEY` optional for secured Piper gateway.

## Commercial QA Hooks
- Voice-casting uniqueness validation: `validateUniqueVoiceAssignments(...)`
- Story/character profile resolution via registry.
- Provider fallback behavior tested end-to-end in package tests.
