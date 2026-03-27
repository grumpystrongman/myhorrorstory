---
title: Agent Army Schema
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:01:26.237Z'
updatedAt: '2026-03-22T19:01:26.237Z'
---
## Raw Concept
**Task:**
Define Agent Army asset and story manifest schemas

**Flow:**
AssetEntry -> StoryManifest -> Catalog

**Timestamp:** 2026-03-22

## Narrative
### Structure
Schemas for AgentArmyAssetEntry and AgentArmyStoryManifest define the data structure for generated content.

### Highlights
Includes asset_id, modality, public_path, and tool_used. Story manifests track assets and failures.

### Examples
Hero Priority: story_key_art, arc_key_art, beat_scene_art, ending_card, page_banner.

## Facts
- **hero_priority**: Hero Priority includes story_key_art, arc_key_art, beat_scene_art, ending_card, and page_banner. [project]
- **production_assets_path**: Agent Army production assets are stored in assets/production/agent-army/. [project]
