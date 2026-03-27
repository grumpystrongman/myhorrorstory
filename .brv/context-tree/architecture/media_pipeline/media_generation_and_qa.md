---
title: Media Generation and QA
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T22:07:46.875Z'
updatedAt: '2026-03-22T22:07:46.875Z'
---
## Raw Concept
**Task:**
Document Media Pipeline Architecture and QA Logic

**Changes:**
- Implemented OCR-based text artifact detection
- Standardized audio/video generation backends
- Updated status handling for missing/proxy videos

**Files:**
- apps/web/public/agent-army/status/generation-status.json
- apps/web/public/agent-army/catalog.json
- assets/manifests/commercial-agent-army-plan.json
- docs/operations/agent-army-image-text-qa-report.json

**Flow:**
Asset Request -> Backend Generation -> OCR QA (Images) -> Post-processing (Audio) -> Catalog Update

**Timestamp:** 2026-03-22

## Narrative
### Structure
The pipeline handles image, audio, and video generation for the Agent Army project. Results are recorded in a central catalog and status ledger.

### Dependencies
Requires Tesseract.js for OCR, FFmpeg for audio/video processing, and OpenAI API for TTS.

### Highlights
Includes automated OCR QA to prevent text artifacts in generated images. Supports environment inference from prompts (rail, hospital, chapel, etc.).

### Rules
Rule 1: Images flagged if distinct tokens >= 2 and total letters >= 8.
Rule 2: looksReadableToken excludes tokens < 3 or > 20 chars.
Rule 3: Modality constraints: Image >= 6KB, Audio >= 48KB, Video >= 24KB.

### Examples
Voice mapping: Antagonist uses shimmer (F) or onyx (M). Witness uses nova (F) or echo (M).

## Facts
- **ocr_qa_threshold**: OCR-Based Image QA uses Tesseract.js with a confidence threshold of 58 [project]
- **audio_engine_non_voice**: Non-voice audio uses ffmpeg-cinematic-horror-score [project]
- **audio_engine_voice**: Voice audio uses openai:gpt-4o-mini-tts with ffmpeg post-processing [project]
- **video_engine**: Video generation uses ffmpeg-cinematic-montage [project]
- **image_backends**: Image backends include openai-gpt-image-1, pollinations-free, and local-playwright-art-director [project]
