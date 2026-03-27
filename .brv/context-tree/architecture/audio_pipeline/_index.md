---
children_hash: c01b013db51c93277b22cf4088b852f396790d1ad8e46d3fb27dab710efe093a
compression_ratio: 0.9523809523809523
condensation_order: 1
covers: [dynamic_scoring_and_soundtrack.md]
covers_token_total: 294
summary_level: d1
token_count: 280
type: summary
---
### Dynamic Scoring and Soundtrack Architecture

The dynamic audio system centers on the **AISoundDirector**, which manages real-time soundtrack adjustments based on game telemetry.

#### Key Components and Logic
*   **AISoundDirector**: Evaluates `SoundDirectorTelemetry` (tracking progress, proximity, danger, mood, and location) to dynamically select and transition between audio bands.
*   **Audio Bands**: Soundscapes are categorized into functional tiers:
    *   `calm_ambience`: Baseline environmental audio.
    *   `suspense_drones`: Tension-building atmospheric layers.
    *   `heartbeat_percussion`: High-intensity rhythmic elements.
*   **Implementation**: Managed via the `SoundtrackPlayer` component (`apps/web/src/app/components/soundtrack-player.tsx`).

#### Asset Integration
*   **Story-Specific Routing**: Audio paths are dynamically constructed based on the active story ID.
*   **File Pattern**: `/agent-army/stories/${storyId}/audio/arc_ambience/[file].mp3`

For implementation details on telemetry processing and specific audio loop definitions, refer to **dynamic_scoring_and_soundtrack.md**.