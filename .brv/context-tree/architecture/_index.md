---
children_hash: 11ad3344b755b9d33784023fc8b6c2fcfd1347b04a22afa5b0a06dd5678dcc6d
compression_ratio: 0.2252730109204368
condensation_order: 2
covers: [artwork_pipeline/_index.md, asset_pipeline/_index.md, audio_pipeline/_index.md, context.md, hint_system/_index.md, media_pipeline/_index.md, play_runtime/_index.md, story_pipeline/_index.md]
covers_token_total: 3205
summary_level: d2
token_count: 722
type: summary
---
# Architecture Structural Summary: Asset and Media Pipelines

## Asset & Artwork Pipeline
The asset pipeline governs the generation, validation, and post-processing of media for commercial stories (e.g., Agent-Army, website teasers).
*   **Generation Strategy**: Employs a fallback chain: OpenAI GPT-Image → Pollinations → local-playwright. Commercial galleries strictly exclude local-playwright fallbacks.
*   **Validation**: Enforces minimum sizes (Images: 6KB, Audio: 48KB) and photorealistic horror standards without watermarks.
*   **Voice Processing**: Resolves artifacts (speed/pitch) via `ffprobe` and a strict FFmpeg chain (`asetrate`, `atempo`, `dynaudnorm`). Configured via `assets/manifests/commercial-agent-army-plan.json`.
*   **Drill-down**: *commercial_artwork_pipeline.md*, *asset_validation_and_prompting.md*, *voice_post_processing.md*

## Media Generation & QA
Automates high-quality asset production and cataloging.
*   **Cinematic Walkthroughs**: Uses Playwright (1512x980) to capture 27-step interaction sequences, synthesized with OpenAI TTS (0.97 speed).
*   **QA Pipeline**: Uses Tesseract.js (58 confidence threshold) for OCR-based artifact detection. Assets are registered in *apps/web/public/agent-army/catalog.json*.
*   **Drill-down**: *cinematic_walkthrough_pipeline.md*, *media_generation_and_qa.md*

## Dynamic Audio Architecture
The **AISoundDirector** manages real-time soundtracks based on game telemetry.
*   **Logic**: Transition between `calm_ambience`, `suspense_drones`, and `heartbeat_percussion` based on proximity, danger, and mood.
*   **Implementation**: Handled by `soundtrack-player.tsx`, routing audio dynamically via `/stories/${storyId}/audio/arc_ambience/`.
*   **Drill-down**: *dynamic_scoring_and_soundtrack.md*

## Hint & Penalty System
A three-tier guidance system (Approach, Thinking, Solve) with server-authoritative enforcement.
*   **Integration**: API-based (`/api/hints`) with LLM (`gpt-4o-mini`) structured output.
*   **Penalty Logic**: Increases reputation and villain advantage risks; server-side enforcement prevents client-side bypass.
*   **Constants**: Audio cipher code is `440`.
*   **Drill-down**: *hint_system_architecture.md*

## Play Runtime & Channel Relay
Manages live sessions and external messaging.
*   **UI Logic**: Operates in `play/page.tsx` with defined constraints (1.2s–45s message delays, 50%–200% zoom).
*   **Channel Relay**: Bridges in-game messages to SMS/WhatsApp/Telegram via `/api/channels/send`. US numbers normalized to `+1`; WhatsApp requires `whatsapp:` prefix.
*   **Drill-down**: *channel_relay_and_ui_logic.md*, *play_runtime_and_channel_relay.md*

## Story Pipeline
Standardized to the **director-cut-v3-catalog-authored** specification.
*   **Infrastructure**: Unified catalog authoring via the `stories:author-catalog` command.
*   **Drill-down**: *story_catalog_director_pass.md*