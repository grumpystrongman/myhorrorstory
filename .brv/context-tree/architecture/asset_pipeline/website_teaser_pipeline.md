---
title: Website Teaser Pipeline
tags: []
related: [architecture/asset_pipeline/asset_validation_and_prompting.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-24T15:28:39.730Z'
updatedAt: '2026-03-24T15:28:39.730Z'
---
## Raw Concept
**Task:**
Fix website teaser video generation pipeline

**Changes:**
- Updated frame source selection logic to prioritize website page assets
- Added fallback to story assets for frame sources
- Regenerated 7 website teaser videos

**Files:**
- assets/production/web/
- audio_pipeline/

**Flow:**
detect assets -> select frame source (web -> story) -> generate video

**Timestamp:** 2026-03-24

**Author:** meowso (via commit f4cc546)

## Narrative
### Structure
The website teaser pipeline was updated to ensure valid frame sources are selected. It now checks website page assets first, with a fallback to story assets.

### Highlights
Resolved issues with video generation by refining asset selection logic. Successfully updated all 7 website teasers.

### Examples
If a web page asset is missing for a teaser frame, the pipeline now automatically falls back to the corresponding story asset.

## Facts
- **asset_pipeline**: Website teaser videos regenerate using a fallback mechanism from web assets to story assets. [project]
- **asset_pipeline**: Total of 7 website teasers were successfully regenerated. [project]
