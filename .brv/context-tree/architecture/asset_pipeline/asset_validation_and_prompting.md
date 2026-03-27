---
title: Asset Validation and Prompting
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:00:09.491Z'
updatedAt: '2026-03-22T19:00:09.491Z'
---
## Raw Concept
**Task:**
Document Asset Validation and Prompt Engineering

**Flow:**
Generation -> Size/Extension Validation -> Prompt Directive Application

**Timestamp:** 2026-03-22

**Patterns:**
- `rail|station|platform|track|subway|signal mast` - Regex for rail environment detection
- `hospital|ward|medical|clinic|surgical|asylum` - Regex for hospital environment detection

## Narrative
### Structure
Defines strict validation constants for images, audio, and video, alongside specific prompt engineering directives for OpenAI image generation.

### Highlights
Min size requirements: Image (6KB), Audio (48KB), Video (24KB). OpenAI sizes: 1536x1024, 1024x1536, 1024x1024.

### Rules
Prohibition 1: No title treatment, UI overlays, labels, watermarks, or typography in generated images.
Directive 1: Grounded cinematic horror, photoreal detail, rich atmosphere, practical lighting, analog grain.

### Examples
Environment detection: "chapel" matches "ledger", "occult", "ritual", "hymn", "sanctuary".

## Facts
- **Image Modality**: Images must be at least 6,000 bytes with extensions .png, .jpg, .jpeg, or .webp.
- **Audio Modality**: Audio files must be at least 48,000 bytes with extensions .wav, .mp3, .ogg, or .m4a.
- **Video Modality**: Video files must be at least 24,000 bytes with extensions .mp4 or .webm.
- **Artifact Modality**: Artifact files must be at least 300 bytes.
- **Web Modality**: Web files must be at least 700 bytes.
- **OpenAI Sizes**: OpenAI image sizes are 1536x1024 (Wide), 1024x1536 (Tall), and 1024x1024 (Square).
- **Quality Logic**: Quality logic is set to 'high' for key art, portraits, banners, and ending cards; 'medium' for others.
- **Directives**: Image directives include grounded cinematic horror, photoreal detail, rich atmosphere, practical lighting, and analog grain.
- **Prohibitions**: Image prohibitions include title treatment, UI overlays, labels, watermarks, or typography.
- **rail environment**: Environment regex for 'rail' includes rail, station, platform, track, subway, and signal mast.
- **hospital environment**: Environment regex for 'hospital' includes hospital, ward, medical, clinic, surgical, and asylum.
- **chapel environment**: Environment regex for 'chapel' includes chapel, ledger, occult, ritual, hymn, and sanctuary.
- **forest environment**: Environment regex for 'forest' includes forest, watch station, ranger, pine, harvest, and creek.
- **maritime environment**: Environment regex for 'maritime' includes salt, harbor, pier, ocean, marsh, tide, and trawler.
