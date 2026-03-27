---
title: Commercial Artwork Pipeline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:01:26.232Z'
updatedAt: '2026-03-22T19:01:26.232Z'
---
## Raw Concept
**Task:**
Document commercial artwork pipeline and image generation settings

**Files:**
- assets/manifests/commercial-agent-army-plan.json
- apps/web/public/agent-army/status/generation-status.json
- apps/web/public/agent-army/catalog.json

**Flow:**
OpenAI (DALL-E 3) -> Pollinations (fallback) -> Local Playwright (restricted fallback)

**Timestamp:** 2026-03-22

## Narrative
### Structure
Pipeline manages asset generation for commercial galleries, excluding degraded local fallbacks by default.

### Dependencies
Requires OpenAI and Pollinations backends. CLI scripts load .env/.env.local if needed.

### Highlights
Landscape (1536x1024), Portrait (1024x1536), and Square (1024x1024) sizes supported. Quality logic maps "High" to key art and portraits.

### Rules
Rule 1: Exclude degraded local-playwright fallbacks from galleries unless ALLOW_LOCAL_ARTWORK_FALLBACK=true.
Rule 2: Minimum image size is 6,000 bytes.
Rule 3: Skip comments and empty lines in .env files.

## Facts
- **image_backends**: Image generation backends include openai-gpt-image-1, pollinations-free, and local-playwright-art-director. [project]
- **modality_constraint_image**: Minimum size for images is 6,000 bytes. [project]
- **modality_constraint_audio**: Minimum size for audio is 48,000 bytes. [project]
