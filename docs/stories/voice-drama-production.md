# Voice Drama Production System

## Goal
Ship full-story voice performance coverage so every playable beat can be rendered with character-specific delivery and fallback provider safety.

## Pipeline Outputs
- Voice line sheets: `assets/voice-drama/<story-id>/*.txt`
- Story synthesis plans: `assets/voice-drama/<story-id>/synthesis-plan.json`
- Global manifest: `assets/manifests/voice-drama-manifest.json`

## Build Command
- `corepack pnpm voice:build-drama`

## Provider Chain
Each generated clip plan carries an adapter-first provider chain:
1. `PIPER` (primary local/offline)
2. `ELEVENLABS` (premium)
3. `OPENAI` (cloud fallback)
4. `POLLY` (enterprise fallback)

## Runtime Experience
- Web `/play` now supports in-app voice drama playback using character role presets.
- Incoming channel messages (SMS/WhatsApp/Telegram/email simulation) can be replayed as spoken lines.
- Story event cadence and villain stage pressure influence message pace and voice tone expectations.

## Commercial Quality Gates
- Every story has character-specific line sheets and synthesis-ready output mappings.
- Every line has beat metadata, channel source, and destination clip target path.
- Manifest includes revision tracking and generation timestamp for operations audit.

## Future Integration Path
- Replace simulation playback with direct generated clips from synthesis plan.
- Route outbound clips to channel providers once user notification preferences are enabled.
- Add actor/human-overdub replacement by keeping profile IDs and clip targets stable.
