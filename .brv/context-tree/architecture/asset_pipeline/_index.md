---
children_hash: 79b9d75ac1bfda2ac84ae9199a2c25ab434cac5a63eba2f260191595a0df2f4f
compression_ratio: 0.2537625418060201
condensation_order: 1
covers: [asset_validation_and_prompting.md, commercial_agent_army_pipeline.md, context.md, voice_post_processing.md, voice_post_processing_fix.md, website_teaser_pipeline.md]
covers_token_total: 2392
summary_level: d1
token_count: 607
type: summary
---
# Asset Pipeline Structural Summary

The asset pipeline manages the generation, validation, and post-processing of media assets for commercial stories, including the Agent-Army and website teaser projects.

### Asset Validation and Prompting (asset_validation_and_prompting.md)
Establishes core technical standards for media:
*   **Validation**: Enforces minimum file sizes (e.g., 6KB for images, 48KB for audio) and specific format extensions.
*   **Prompt Engineering**: Directs OpenAI image generation (1536x1024, 1024x1536, 1024x1024) toward grounded, photorealistic horror.
*   **Prohibitions**: Strictly forbids title treatments, watermarks, and UI overlays in generated visuals.
*   **Environment Detection**: Uses regex patterns to categorize assets into specific thematic buckets (e.g., `rail`, `hospital`, `chapel`, `forest`, `maritime`).

### Commercial Agent-Army Pipeline (commercial_agent_army_pipeline.md)
Defines the distribution and generation strategy for commercial stories:
*   **Generation Strategy**: Implements a fallback chain: OpenAI (`openai-gpt-image-1`) -> Pollinations (`pollinations-free`) -> local-playwright.
*   **Commercial Policy**: Degraded local-playwright assets are excluded from commercial galleries to prioritize high-quality manifest-verified content.
*   **Configuration**: Relies on `assets/manifests/commercial-agent-army-plan.json` for orchestration and ensures CLI scripts correctly load environment variables (`.env.local`).

### Voice Post-Processing (voice_post_processing.md, voice_post_processing_fix.md)
Addresses audio quality issues:
*   **Fix**: Resolved "chipmunk" speed/pitch artifacts by implementing source sample rate probing via `ffprobe` before processing.
*   **Constraints**: Enforces strict bounds on `apiSpeed` (0.9-1.08), `pitchSemitone` (-3.2-2.0), and `textureAmount` (0.25-0.9).
*   **Pipeline**: Utilizes a comprehensive FFmpeg filter chain including `asetrate`, `atempo`, `acompressor`, and `dynaudnorm` to ensure natural output.

### Website Teaser Pipeline (website_teaser_pipeline.md)
Refines video generation for web-facing assets:
*   **Asset Selection**: Implements a prioritized frame source selection logic; the pipeline checks for dedicated website page assets first, with an automatic fallback to story-based assets if web assets are missing.
*   **Status**: Successfully regenerated 7 website teaser videos using this updated selection logic.