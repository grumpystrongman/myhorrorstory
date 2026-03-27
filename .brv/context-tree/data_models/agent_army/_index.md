---
children_hash: c0c7b937fb4077ceba48e6c7a9a94700fe51695b443100c6e9c68a0ddc4ddaf8
compression_ratio: 0.6695938529088913
condensation_order: 1
covers: [agent_army_schema.md, artwork_data_structures.md, context.md, technical_constants_and_interfaces.md]
covers_token_total: 911
summary_level: d1
token_count: 610
type: summary
---
# Agent Army Data Models and Technical Constants

This domain defines the structural schemas, prioritization logic, and technical constants governing the Agent Army asset pipeline and broader system configuration.

### 1. Asset and Story Schemas
The system utilizes a hierarchical data flow: **AssetEntry -> StoryManifest -> Catalog**.
*   **AgentArmyAssetEntry**: Defines the core metadata for generated content, including `asset_id`, `asset_type`, `modality`, `public_path`, `public_thumbnail_path`, and `tool_used`.
*   **AgentArmyStoryManifest**: Tracks a collection of assets associated with a specific `storyId`, including success/failure states and titles.
*   **Storage Path**: Production assets are centralized in `assets/production/agent-army/`.

*For detailed interface definitions, see:* `agent_army_schema.md` and `artwork_data_structures.md`.

### 2. Artwork Selection and Prioritization
Logic for selecting hero and cover images is driven by a strict priority hierarchy to ensure the highest quality available asset is displayed.
*   **Selection Priority**: `story_key_art` > `arc_key_art` > `beat_scene_art` > `ending_card` > `page_banner`.
*   **Asset Categorization**:
    *   **Scene Types**: Includes key art, scene art, banners, and `background_texture`.
    *   **Evidence Types**: `evidence_still`, `puzzle_board`, and `puzzle_shard_card`.
    *   **Portrait Types**: `character_portrait` and `villain_portrait`.
*   **StoryArtworkSelection**: An interface that aggregates hero, cover, scenes, evidence, and portraits, while tracking `issueCount` and `verifiedImageCount`.

*For selection rules and category lists, see:* `artwork_data_structures.md`.

### 3. Technical Constants and System Interfaces
Core configurations for the UI, messaging, and campaign lifecycle.
*   **Messaging Channels**: Supported providers include SMS, WhatsApp, Telegram, and Signal.
*   **UI/UX Constants**: Message delays are bounded between 1,200ms and 45,000ms.
*   **Campaign Lifecycle**: Default target duration is 28 days (max 45 days).
*   **Technical Identifiers**: 
    *   `AUDIO_CIPHER_CODE`: "440".
    *   **Storage Keys**: `myhorrorstory.channel.caseId` and `myhorrorstory.channel.playerId`.
*   **System Dependencies**: Integrates with `SoundDirectorTelemetry` for audio evaluation and `SetupStatusChannel` for provider configuration.

*For full constant lists and UI delays, see:* `technical_constants_and_interfaces.md`.