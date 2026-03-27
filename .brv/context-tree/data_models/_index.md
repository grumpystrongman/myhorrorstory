---
children_hash: 0cd0bcce5f334803b45e0045f3d4f796df90ff3198965073f429852338d9f3c9
compression_ratio: 0.6212244897959184
condensation_order: 2
covers: [agent_army/_index.md, context.md, media_pipeline/_index.md, story_drama/_index.md]
covers_token_total: 1225
summary_level: d2
token_count: 761
type: summary
---
# Data Models Structural Overview (Level d2)

This domain serves as the central repository for structural schemas, technical constants, and narrative configurations governing the Agent-Army system, media pipelines, and story delivery.

### 1. Agent Army & Asset Management
Defines the hierarchical flow and selection logic for generated content.
*   **Data Pipeline**: Implements a `AssetEntry -> StoryManifest -> Catalog` flow. `AgentArmyAssetEntry` tracks core metadata (`asset_id`, `modality`, `public_path`) while `AgentArmyStoryManifest` aggregates assets by `storyId`.
*   **Selection Hierarchy**: Logic prioritizes high-quality hero/cover assets using a strict priority: `story_key_art` > `arc_key_art` > `beat_scene_art` > `ending_card` > `page_banner`.
*   **Asset Categorization**: Organized into Scene Types (backgrounds, banners), Evidence Types (stills, shards), and Portrait Types (characters, villains).
*   **Storage**: Centralized production assets reside in `assets/production/agent-army/`.

*For schema definitions and priority rules, see:* `agent_army/_index.md`, `agent_army_schema.md`, and `artwork_data_structures.md`.

### 2. Media Pipeline & Cataloging
Structural tracking for asset generation success and failure states.
*   **Catalog Schemas**: `CatalogAsset` tracks successful generations (path, checksum, size), while `CatalogFailure` captures error details for invalid or missing assets.
*   **Registry**: The primary catalog is maintained at `apps/web/public/agent-army/catalog.json`.
*   **Modality Tracking**: Standardized categorization for diverse media formats within the pipeline.

*For interface details, see:* `media_pipeline/_index.md` and `media_catalog_schemas.md`.

### 3. Story Drama & Narrative Schemas
Standardized configurations for story-specific content and message validation.
*   **STORY_STYLE_KITS**: Defines narrative threads (Incident, Objective, Risk, Setting) for 10 core stories, including *black-chapel-ledger* and *dead-channel-protocol*.
*   **Payload Structures**: Narrative data is encapsulated in `playerBriefing` and `caseFile` objects.
*   **Message Validation**: The `ensureMessageShape` utility enforces strict schemas for message objects, requiring `id`, `senderName`, `role`, `channel`, `text`, `delaySeconds`, and `intensity`.

*For style kit configurations and validation rules, see:* `story_drama/_index.md` and `story_style_kits_and_schemas.md`.

### 4. Technical Constants & System Interfaces
Global configuration for UI, messaging, and campaign lifecycles.
*   **Messaging Infrastructure**: Support for SMS, WhatsApp, Telegram, and Signal.
*   **Runtime Constants**:
    *   **UI Delays**: Bound between 1,200ms and 45,000ms.
    *   **Campaign Duration**: Default 28 days; 45-day maximum.
    *   **Identifiers**: `AUDIO_CIPHER_CODE` ("440") and storage keys for `caseId`/`playerId`.
*   **Integration Points**: Dependencies include `SoundDirectorTelemetry` and `SetupStatusChannel`.

*For the complete list of constants, see:* `technical_constants_and_interfaces.md`.