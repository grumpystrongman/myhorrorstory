---
title: Voice Post Processing
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T22:16:09.020Z'
updatedAt: '2026-03-23T22:16:09.020Z'
---
## Raw Concept
**Task:**
Implement voice post-processing for asset pipeline

**Changes:**
- Fixed chipmunk speed/pitch artifacts by probing source sample rate

**Files:**
- scripts/creative/lib/agent-army-real-assets.mjs

**Flow:**
ffprobe source -> calculate pitch factor -> adjust rate -> atempo compensation -> filter chain

**Timestamp:** 2026-03-23

## Narrative
### Structure
Voice post-processing procedure involves extracting source Hz via ffprobe, calculating pitch factor based on semitones, and applying tempo compensation.

### Highlights
Naturalness checks ensure assets meet specific numeric bounds for apiSpeed, pitch, and frequency ranges.

### Rules
Rule 1: Probe source Hz using ffprobe.
Rule 2: atempo chain values must be between 0.5 and 2.0.

## Facts
- **voice_pipeline_fix**: Fixed chipmunk speed/pitch artifacts by probing source audio sample rate instead of using static 48k [project]
- **voice_design_constraints**: Voice design constraints: apiSpeed (0.9-1.08), pitchSemitone (-3.2-2.0), textureAmount (0.25-0.9) [convention]
- **voice_filter_chain**: FFmpeg filter chain for voice: asetrate -> aresample -> atempo -> highpass -> lowpass -> acompressor -> dynaudnorm -> equalizer -> aecho -> alimiter [project]
