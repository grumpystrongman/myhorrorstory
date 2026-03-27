---
title: Cinematic Walkthrough Pipeline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-24T18:46:10.074Z'
updatedAt: '2026-03-24T18:46:10.074Z'
---
## Raw Concept
**Task:**
Automate cinematic story walkthrough generation

**Files:**
- scripts/creative/render-story-walkthrough-video.mjs

**Flow:**
Playwright session (/play) -> Choice application -> Day-fade overlays -> Raw video capture -> OpenAI TTS narration -> FFmpeg mixing (theme + voices) -> Final output (.mp4)

**Timestamp:** 2026-03-24

**Author:** ByteRover

## Narrative
### Structure
The pipeline uses Playwright to drive a virtual iPhone session, capturing interaction beats. Narration is synthesized via OpenAI TTS, and audio is mixed with theme loops and character voices using FFmpeg.

### Dependencies
Playwright (session capture), OpenAI TTS (narration), FFmpeg (mixing), Tesseract.js

### Highlights
Supports rich interaction simulation (hints, analysis, ciphers), automated choice application, and multi-track audio mixing.

### Rules
Interaction choices are driven by reasonForChoice() mapping to decision labels; viewport is fixed at 1512x980.

### Examples
Choices include: verify/audit/cross-check, stabilize/witness/interview, shadow/covert/silent, force/immediate, public/publish.

## Facts
- **viewport_resolution**: Playwright captures sessions at 1512x980 viewport [project]
- **tts_speed**: Narration uses OpenAI TTS at 0.97 speed [project]
- **walkthrough_depth**: Pipeline supports 27-step decision sequences [project]
