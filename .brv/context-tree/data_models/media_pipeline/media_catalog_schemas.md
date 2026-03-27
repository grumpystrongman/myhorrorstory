---
title: Media Catalog Schemas
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T22:07:46.882Z'
updatedAt: '2026-03-22T22:07:46.882Z'
---
## Raw Concept
**Task:**
Document Media Catalog and Failure Schemas

**Files:**
- apps/web/public/agent-army/catalog.json

**Timestamp:** 2026-03-22

## Narrative
### Structure
Defines TypeScript interfaces for CatalogAsset and CatalogFailure used in the media pipeline.

### Highlights
CatalogAsset tracks successful generations with checksums. CatalogFailure tracks missing, invalid, or failed assets with error details.

## Facts
- **catalog_schema**: Catalog assets include story_id, asset_id, modality, status, path, checksum, and size [project]
