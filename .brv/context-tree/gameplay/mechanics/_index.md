---
children_hash: a11b54f12d2b8692f9f7684a6ced1a62d988b1c7094f0946c9869915eb8228a8
compression_ratio: 0.8018018018018018
condensation_order: 1
covers: [context.md, play_session_runtime.md]
covers_token_total: 555
summary_level: d1
token_count: 445
type: summary
---
# Domain: Gameplay | Topic: Mechanics

The **Mechanics** domain governs the logic, runtime behavior, and interaction systems for active play sessions. It primarily defines how user interactions translate into narrative progress and environmental manipulation.

## Play Session Runtime
The core execution engine manages the live experience, focusing on interaction scoring, audio processing, and character synthesis. Detailed specifications are found in `play_session_runtime.md`.

### Interaction & Scoring Logic (Response Inference)
*   **Workflow**: User Interaction → Token Scoring → Response Selection → Metric Update.
*   **Scoring Weights**: Exact matches grant **+8 points**, while token-level matches grant **+1 point**.
*   **State Impact**: Response selection directly modifies `investigationProgress` and `reputationDelta.aggression`, while incrementing the `campaignDay`.
*   **Communication Channels**: Systems support SMS, WhatsApp, Telegram, and Signal.

### Field Actions
Specific investigative actions trigger unique detection logic:
*   **analyze_audio**: Detects modulation drift.
*   **interview_witness**: Identifies log contradictions.
*   **review_evidence**: Recovers frame markers in still images.
*   **trace_number**: Tracks routing through "dead infrastructure."

### Audio & Visual Constraints
*   **Security**: The system utilizes **Audio Cipher 440** for unlocking hidden reels.
*   **Optics**: Target zoom limits are strictly enforced between **50% and 200%**.
*   **Temporal**: The default campaign duration is set to **28 days**.

### Voice Drama Presets
Character synthesis is governed by specific Rate and Pitch presets:
*   **Antagonist**: Rate 0.88, Pitch 0.68.
*   **Witness**: Rate 1.07, Pitch 1.05.
*   **Operator**: Rate 1.01, Pitch 0.82.