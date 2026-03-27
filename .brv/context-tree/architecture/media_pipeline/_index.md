---
children_hash: 5ea0b3acbf9cfced711f08c7894bfce7858fa84c9168d21632115c0d8491fd75
compression_ratio: 0.5322916666666667
condensation_order: 1
covers: [cinematic_walkthrough_pipeline.md, context.md, media_generation_and_qa.md]
covers_token_total: 960
summary_level: d1
token_count: 511
type: summary
---
# Media Pipeline Overview

The media pipeline is an end-to-end architecture designed for automated, high-quality generation of image, audio, and video assets, incorporating rigorous quality assurance (QA) and cataloging.

## Core Architectural Components

- **Cinematic Walkthrough Pipeline** (`cinematic_walkthrough_pipeline.md`)
  - **Function**: Automates story walkthrough generation using Playwright session capture (fixed 1512x980 viewport).
  - **Process**: Captures interaction beats, synthesizes narration via OpenAI TTS (0.97 speed), and mixes audio/themes using FFmpeg.
  - **Capabilities**: Supports 27-step decision sequences and rich interaction simulation (hints, ciphers).

- **Media Generation and QA** (`media_generation_and_qa.md`)
  - **Function**: Manages asset generation backends, OCR-based artifact detection, and status tracking.
  - **Flow**: Asset Request → Generation → OCR QA (Images) → Post-processing (Audio) → Catalog Update.
  - **Key Logic**: Automated QA flags images with excessive tokens (>= 2) or text artifacts. Modality constraints enforce minimum file sizes (Image ≥ 6KB, Audio ≥ 48KB, Video ≥ 24KB).

## Technical Specifications & Standards

- **QA & Inference**: 
  - OCR QA uses Tesseract.js with a confidence threshold of 58.
  - Environment inference supports specialized settings (e.g., rail, hospital, chapel).
- **Generation Backends**:
  - **Images**: OpenAI GPT-Image, Pollinations, and local Playwright Art Director.
  - **Voice**: OpenAI GPT-4o-mini-tts with FFmpeg post-processing.
  - **Non-Voice Audio**: FFmpeg-cinematic-horror-score.
  - **Video**: FFmpeg-cinematic-montage.
- **Voice Profiling**:
  - Antagonist: Shimmer (F) / Onyx (M).
  - Witness: Nova (F) / Echo (M).

## Key Relationships
- **Cataloging**: All generated artifacts are registered in `apps/web/public/agent-army/catalog.json` and monitored via `generation-status.json`.
- **Decision Logic**: Walkthroughs map interaction choices via a `reasonForChoice()` function, ensuring consistency with project narrative rules.