---
children_hash: 61050efd86ee7fc1e02a64b6cd183934d10b1a6e14291cf736b86b4addbb1a27
compression_ratio: 0.2119951040391677
condensation_order: 3
covers: [architecture/_index.md, data_models/_index.md, gameplay/_index.md, infrastructure/_index.md, logic/_index.md, project_management/_index.md]
covers_token_total: 4085
summary_level: d3
token_count: 866
type: summary
---
# Structural Overview: System Architecture and Operations (Level d3)

This domain architecture coordinates the production, runtime, and management of interactive narrative horror experiences.

### 1. Architecture and Media Pipelines
The architecture domain manages high-fidelity asset generation and real-time interaction logic.
*   **Asset Pipeline**: Governs media generation using a fallback chain (OpenAI GPT-Image → Pollinations → local-playwright). Commercial assets require strict photorealistic standards and artifact resolution via FFmpeg chains (`asetrate`, `atempo`, `dynaudnorm`). (Ref: *architecture/asset_pipeline/*)
*   **Media & QA**: Cinematic sequences are captured via Playwright (1512x980) and validated using Tesseract.js (58 confidence threshold). (Ref: *architecture/media_pipeline/*)
*   **Audio & Play Runtime**: The `AISoundDirector` manages dynamic soundscapes (`calm_ambience`, `suspense_drones`) via `soundtrack-player.tsx`. The play runtime handles UI constraints (1.2s–45s delays, 50%–200% zoom) and channel relay for external messaging (SMS/WhatsApp). (Ref: *architecture/play_runtime/*, *architecture/audio_pipeline/*)
*   **Guidance System**: A three-tier hint system (Approach, Thinking, Solve) enforces server-authoritative penalties, including time advances and reputation/danger shifts. (Ref: *architecture/hint_system/*)

### 2. Data Models and Narrative Schemas
Centralized repository for schemas governing system state and narrative configuration.
*   **Asset Management**: Implements `AssetEntry -> StoryManifest -> Catalog` flow. Assets are categorized by modality (Scene, Evidence, Portrait) and prioritized by quality tiers (Hero > Beat). (Ref: *data_models/agent_army/*)
*   **Narrative Payloads**: Standardized via `STORY_STYLE_KITS` and enforced by `ensureMessageShape`, requiring specific fields (id, senderName, role, channel, text, intensity). (Ref: *data_models/story_drama/*)
*   **Global Constants**: Defines runtime bounds for campaign duration (max 45 days), UI delays, and system-wide identifiers like `AUDIO_CIPHER_CODE` ("440"). (Ref: *data_models/technical_constants_and_interfaces.md*)

### 3. Gameplay Mechanics and Simulation
Defines the engine logic for active sessions and narrative progression.
*   **Campaign Structure**: Operates on a 4-phase, 28-day model (Intake → Contradictions → Escalation → Endgame), extendable to 45 days for complex stories. (Ref: *gameplay/campaign/*)
*   **Interaction Logic**: Scoring weights are applied based on match accuracy (Full: +8, Token: +1). Voice drama synthesis is role-specific (Antagonist: 0.88/0.68 Rate/Pitch). (Ref: *gameplay/mechanics/*)
*   **Simulation & QA**: Environments are classified via keyword clustering. Ending resolution is determined by threshold tracking (JUSTICE, CORRUPTION, TRAGIC) based on morality, trust, and progress metrics. (Ref: *logic/simulation/*, *logic/mechanics/*)

### 4. Infrastructure and Project Management
Operational frameworks for service delivery and workflow.
*   **Messaging Infrastructure**: Self-hosted stack utilizes Docker/Compose, Mailpit, and WAHA for multi-channel communication (SMS, WhatsApp, Signal). Gateway services are managed via `scripts/messaging/`. (Ref: *infrastructure/communications/*)
*   **Workflow Management**: Standardizes campaign lifecycles and sprint retrospectives, focusing on maintaining narrative continuity across the 4-phase progression. (Ref: *project_management/campaigns/*)