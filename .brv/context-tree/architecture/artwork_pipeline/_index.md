---
children_hash: a0343a72d6c4e1cf036f6694631f1999dc7d1ba610fca5eb94ae0b0b018e8170
compression_ratio: 0.6863207547169812
condensation_order: 1
covers: [commercial_artwork_pipeline.md, context.md]
covers_token_total: 424
summary_level: d1
token_count: 291
type: summary
---
### Artwork Pipeline Overview

The **artwork_pipeline** manages asset generation for commercial galleries, focusing on high-quality output and strict fallback logic. Detailed implementation is found in **commercial_artwork_pipeline.md**.

#### Architectural Decisions & Flow
*   **Primary Flow**: OpenAI (DALL-E 3) → Pollinations (Free) → Local Playwright (Restricted).
*   **Commercial Restriction**: Local-playwright fallbacks are excluded from galleries unless `ALLOW_LOCAL_ARTWORK_FALLBACK=true` is set.
*   **Environment**: CLI scripts utilize `.env` or `.env.local`, ignoring comments and empty lines.

#### Technical Specifications & Constraints
*   **Image Dimensions**: Supports Landscape (1536x1024), Portrait (1024x1536), and Square (1024x1024).
*   **Modality Constraints**:
    *   **Images**: Minimum size of 6,000 bytes.
    *   **Audio**: Minimum size of 48,000 bytes.
*   **Quality Mapping**: "High" quality setting specifically targets key art and portraits.

#### Key Resources
*   **Manifests**: `assets/manifests/commercial-agent-army-plan.json`
*   **Status/Catalog**: `apps/web/public/agent-army/status/generation-status.json`, `catalog.json`