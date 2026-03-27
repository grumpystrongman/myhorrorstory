---
children_hash: 3cb8806aa4bec72192ace2337c735a59fd5e86d9a0447333514bce52be0acf40
compression_ratio: 0.7719298245614035
condensation_order: 1
covers: [context.md, media_catalog_schemas.md]
covers_token_total: 228
summary_level: d1
token_count: 176
type: summary
---
# Media Pipeline Data Models

Structural overview of data structures for tracking asset generation and pipeline failures.

### Core Schemas
- **CatalogAsset**: Tracks successful generations. Fields include `story_id`, `asset_id`, `modality`, `status`, `path`, `checksum`, and `size`.
- **CatalogFailure**: Records missing, invalid, or failed assets with specific error details.
- **Modality Types**: Categorization for different media formats within the pipeline.

### Key References
- **File**: `apps/web/public/agent-army/catalog.json`
- **Details**: See [media_catalog_schemas.md](media_catalog_schemas.md) for TypeScript interface definitions and [context.md](context.md) for modality tracking logic.