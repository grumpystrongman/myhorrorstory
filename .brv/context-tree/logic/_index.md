---
children_hash: 9712c2130402bb964fb2d5cd93a612ab9c7d48fa78013d123d51d0b501ed9918
compression_ratio: 0.8310880829015544
condensation_order: 2
covers: [context.md, mechanics/_index.md, simulation/_index.md]
covers_token_total: 965
summary_level: d2
token_count: 802
type: summary
---
# Domain: Logic (Level d2 Summary)

The **logic** domain defines the business rules, simulation algorithms, and progression mechanics of the system. It is structured into two primary functional areas: **mechanics**, which handles player-facing systems like reputation and hints, and **simulation**, which manages the underlying narrative engine and automated quality assurance.

## 1. Gameplay Mechanics and Reputation
The mechanics sub-domain ([mechanics/_index.md](mechanics/_index.md)) governs how player assistance affects game state and progression.

*   **Hint and Penalty System**: Tracks progress and danger gain across three tiers: **Approach**, **Thinking**, and **Solve**.
*   **State Impact**: High-tier "Solve" hints trigger significant penalties, including a **2-day time advance** and a **danger increase of 5-6 points** (subject to multipliers).
*   **Detailed Logic**: Specific penalty profiles and reputation multipliers are documented in [penalty_and_reputation_logic.md](mechanics/penalty_and_reputation_logic.md).

## 2. Narrative Simulation and Environmental Logic
The simulation sub-domain ([simulation/_index.md](simulation/_index.md)) provides the architectural framework for mapping player inputs to narrative and environmental outcomes.

### Environmental Classification and Interaction
*   **Classification Engine**: Categorizes game environments (e.g., Rail, Hospital, Chapel, Maritime) using keyword clusters.
*   **Response Inference Flow**: Processes inputs through a sequence of **Normalization -> Scoring -> Response Inference**.
*   **Speech Synthesis (TTS)**: Role-based parameters (Antagonist, Witness, Operator) define audio characteristics such as rate and pitch (e.g., Antagonist: Rate 0.88, Pitch 0.68).
*   **Reference**: See [messenger_and_environment_logic.md](simulation/messenger_and_environment_logic.md) and [context.md](simulation/context.md).

### Response Inference and Audio Systems
*   **Scoring Mechanism**: Selects `DramaResponseOption` by tokenizing drafts and applying weights (+8 for full matches, +1 per token).
*   **Sound Director**: Dynamically manages the session soundscape using telemetry-driven audio bands like `calm_ambience`, `suspense_drones`, and `heartbeat_percussion`.
*   **Data Normalization**: Includes specific formatting rules, such as prepending `+1` to 10-digit phone strings.
*   **Reference**: See [response_inference_and_audio_logic.md](simulation/response_inference_and_audio_logic.md).

## 3. QA Simulation and Narrative Resolution
Automated testing and ending logic are centralized in [qa_simulation_and_ending_resolvers.md](simulation/qa_simulation_and_ending_resolvers.md).

*   **Simulation Strategies**: Utilizes `scripts/qa/run-quality-agent-simulations.mjs` to execute weighted selectors: `protocol-conservative`, `justice-maximizer`, `corruption-maximizer`, and `tragic-force`.
*   **Ending Thresholds**: Narrative resolution is determined by tracking four key metrics:
    *   **JUSTICE**: Morality ≥ 15, Trustworthiness ≥ 5, Progress ≥ 80%.
    *   **CORRUPTION**: Deception ≥ 18 OR Morality ≤ -18.
    *   **TRAGIC**: Aggression ≥ 22, Progress ≥ 65%.
    *   **States**: Includes UNRESOLVED and PYRRHIC outcomes.