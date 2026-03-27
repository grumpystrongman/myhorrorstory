---
title: Dynamic Scoring and Soundtrack
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T20:23:42.309Z'
updatedAt: '2026-03-23T20:23:42.309Z'
---
## Raw Concept
**Task:**
Document AISoundDirector and dynamic scoring mechanism

**Changes:**
- Implemented AISoundDirector for dynamic audio band selection based on telemetry

**Files:**
- apps/web/src/app/components/soundtrack-player.tsx

**Flow:**
Telemetry (progress, danger, mood) -> AISoundDirector -> Select Audio Band (calm, suspense, heartbeat)

**Timestamp:** 2026-03-23

## Narrative
### Structure
The SoundtrackPlayer uses AISoundDirector to evaluate game state and play corresponding audio loops.

### Highlights
Audio bands include calm_ambience, suspense_drones, and heartbeat_percussion. Paths are story-specific.

### Examples
Ambience paths: /agent-army/stories/${storyId}/audio/arc_ambience/contact.mp3

## Facts
- **ai_sound_director**: AISoundDirector evaluates SoundDirectorTelemetry (progress, proximity, danger, mood, location) to select audio bands [project]
- **audio_bands**: Audio bands include calm_ambience, suspense_drones, and heartbeat_percussion [project]
