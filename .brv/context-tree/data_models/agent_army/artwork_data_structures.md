---
title: Artwork Data Structures
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:00:09.495Z'
updatedAt: '2026-03-22T19:00:09.495Z'
---
## Raw Concept
**Task:**
Document Agent-Army Artwork Data Models

**Flow:**
Asset Entry -> Story Manifest -> Artwork Selection (Prioritization)

**Timestamp:** 2026-03-22

## Narrative
### Structure
Defines the object schema for assets, story manifests, and the logic used to select hero images and scenes based on priority types.

### Highlights
Hero/Cover priority: story_key_art > arc_key_art > beat_scene_art > ending_card > page_banner.

### Rules
Priority 1: Always prefer story_key_art for hero images if available.

## Facts
- **AgentArmyAssetEntry**: AgentArmyAssetEntry interface defines asset_id, asset_type, modality, title, public_path, public_thumbnail_path, and tool_used.
- **AgentArmyStoryManifest**: AgentArmyStoryManifest interface defines storyId, title, assets, and failures.
- **StoryArtworkSelection**: StoryArtworkSelection interface defines hero, cover, scenes, evidence, portraits, gallery, issueCount, and verifiedImageCount.
- **Selection Priorities**: Hero/Cover selection priority: story_key_art > arc_key_art > beat_scene_art > ending_card > page_banner.
- **Scene Types**: Scene types include story_key_art, arc_key_art, beat_scene_art, page_banner, and background_texture.
- **Evidence Types**: Evidence types include evidence_still, puzzle_board, and puzzle_shard_card.
- **Portrait Types**: Portrait types include character_portrait and villain_portrait.
