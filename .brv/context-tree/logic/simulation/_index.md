---
children_hash: 3229e41b586112c03927fdf0d9f8743cd14288c50fe058fab223eb14a628b89f
compression_ratio: 0.7452153110047847
condensation_order: 1
covers: [context.md, messenger_and_environment_logic.md, qa_simulation_and_ending_resolvers.md, response_inference_and_audio_logic.md]
covers_token_total: 836
summary_level: d1
token_count: 623
type: summary
---
# Simulation Domain Summary (Level d1)

The **simulation** domain encompasses thematic logic, messenger interactions, and automated quality assurance systems for story progression and resolution. It provides the architectural framework for mapping player inputs to narrative outcomes and environmental contexts.

### 1. Interaction and Environment Logic
Logic for simulating character interactions and environmental classification is centralized in **messenger_and_environment_logic.md**.
*   **Response Inference Flow**: Processes inputs through Normalization, Scoring, and Response Inference.
*   **Environment Classification**: Themes are identified via keyword clusters:
    *   **Rail**: rail, station, platform, subway, signal.
    *   **Others**: Hospital, Chapel, Forest, Apartment, Maritime, Industrial.
*   **Speech Synthesis (TTS) Presets**: Defines role-based audio parameters:
    *   **Antagonist**: Rate 0.88, Pitch 0.68.
    *   **Roles**: Antagonist, witness, operator.

### 2. Response Inference and Audio Systems
Documented in **response_inference_and_audio_logic.md**, these systems handle the technical mapping of player actions to game responses and dynamic soundscapes.
*   **Scoring Mechanism**: Normalizes and tokenizes drafts, applying scoring weights (+8 for full match, +1 per token) to select the optimal `DramaResponseOption`.
*   **Sound Director**: Dynamically selects audio bands based on session telemetry, including `calm_ambience`, `suspense_drones`, and `heartbeat_percussion`.
*   **Data Normalization**: Specific rules for phone number formatting (e.g., prepending +1 for 10-digit strings).

### 3. QA Simulation and Ending Resolvers
The automated testing and narrative resolution logic is detailed in **qa_simulation_and_ending_resolvers.md** and implemented via `scripts/qa/run-quality-agent-simulations.mjs`.
*   **Simulation Strategies**: Uses weighted selectors including `protocol-conservative`, `justice-maximizer`, `corruption-maximizer`, and `tragic-force`.
*   **Ending Thresholds**: Final story states are determined by tracking Morality, Trust, Deception, and Aggression:
    *   **JUSTICE**: Morality >= 15, Trustworthiness >= 5, Progress >= 80%.
    *   **CORRUPTION**: Deception >= 18 OR Morality <= -18.
    *   **TRAGIC**: Aggression >= 22, Progress >= 65%.
    *   **Additional States**: UNRESOLVED, PYRRHIC.

### 4. Core Concepts
For a high-level overview of messenger simulation and thematic classification, refer to **context.md**.