---
children_hash: e072a677501d66778d6d2e26a8cb5bbf2d667e80103626ab3472a0688ada38fc
compression_ratio: 0.5882352941176471
condensation_order: 2
covers: [campaign/_index.md, context.md, mechanics/_index.md]
covers_token_total: 1156
summary_level: d2
token_count: 680
type: summary
---
# Gameplay Domain: Structural Overview

The **gameplay** domain defines the rules, runtime behaviors, and narrative frameworks governing the active user experience. It is divided into two primary pillars: structural campaign design and the underlying interaction mechanics.

## 1. Campaign Architecture & Narrative Design
The campaign system manages the progression of play through time-bound arcs and thematic escalation. Refer to **campaign/_index.md** for the full d1 summary of these systems.

### Standardized Progression (28-Day Arc)
Documented in **campaign_structure.md** and **context.md**, the standard lifecycle follows a four-week model:
*   **Phase 1 (Intake):** Baseline evidence collection and contact verification.
*   **Phase 2 (Contradictions):** Mapping inconsistencies and pressure-testing witness accounts.
*   **Phase 3 (Escalation):** Live interventions and direct antagonist contact.
*   **Phase 4 (Endgame):** Narrative branching and final evidence loop closure.

### High-Fidelity Implementation
Specific instances like **static_between_stations_story.md** demonstrate the *director-cut-v3* implementation, extending operations to a 45-day window. Key architectural rules include:
*   **Flow:** Breach & Validation → Interference & Exposure → Active Threat → Ultimatum & Judgement.
*   **Success Criteria:** Requires explicit timeline construction, cross-checked testimony, and evidence chain integrity.

## 2. Interaction Mechanics & Runtime Logic
The **mechanics** topic governs the live execution engine and scoring systems. Detailed specifications reside in **mechanics/_index.md**.

### Play Session Runtime
The core engine (detailed in **play_session_runtime.md**) manages the transition from user input to state updates:
*   **Scoring Logic:** Exact matches (+8 pts) and token-level matches (+1 pt) influence `investigationProgress` and `reputationDelta.aggression`.
*   **Communication:** Orchestrates interactions across SMS, WhatsApp, Telegram, and Signal.
*   **Field Actions:** Triggers specialized logic for `analyze_audio` (modulation drift), `interview_witness` (log contradictions), and `trace_number` (dead infrastructure).

### Technical Constraints & Presets
*   **Audio/Visual:** Employs **Audio Cipher 440** for hidden content; enforces optical zoom limits between **50% and 200%**.
*   **Character Synthesis:** Voice drama presets define specific Rate/Pitch ratios:
    *   **Antagonist:** 0.88 / 0.68
    *   **Witness:** 1.07 / 1.05
    *   **Operator:** 1.01 / 0.82

## Domain Scope Summary
*   **Included:** Interaction logic, scoring weights, voice presets, and field actions.
*   **Excluded:** UI styling and server-side infrastructure (handled in separate domains).