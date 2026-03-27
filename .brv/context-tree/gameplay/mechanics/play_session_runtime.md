---
title: Play Session Runtime
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:00:09.499Z'
updatedAt: '2026-03-22T19:00:09.499Z'
---
## Raw Concept
**Task:**
Document Play Session Runtime Mechanics

**Flow:**
User Interaction -> Token Scoring -> Response Selection -> Metric Update

**Timestamp:** 2026-03-22

## Narrative
### Structure
Manages the runtime experience including audio decryption, interaction scoring, and voice synthesis presets for different characters.

### Highlights
Audio cipher: 440. Interaction scoring: Exact match (+8), Token match (+1).

### Rules
Rule 1: Response selection modifies investigationProgress and reputationDelta.aggression.
Rule 2: Target zoom limits are 50% to 200%.

### Examples
Voice Presets: Antagonist (Rate 0.88, Pitch 0.68), Witness (Rate 1.07, Pitch 1.05).

## Facts
- **Audio Cipher**: The audio cipher code required to unlock hidden reels is 440.
- **Campaign Duration**: The default campaign duration is 28 days.
- **Zoom Limits**: Zoom limits are set from 50% to 200%.
- **Channels**: Supported communication channels are SMS, WHATSAPP, TELEGRAM, and SIGNAL.
- **Response Inference**: Response inference uses token scoring: Exact match = +8, Token match = +1.
- **Voice Drama: antagonist**: Voice drama antagonist preset: Rate 0.88, Pitch 0.68.
- **Voice Drama: witness**: Voice drama witness preset: Rate 1.07, Pitch 1.05.
- **Voice Drama: operator**: Voice drama operator preset: Rate 1.01, Pitch 0.82.
- **Metric Updates**: Choosing responses modifies investigationProgress, reputationDelta.aggression, and increments campaignDay.
- **Field Action: analyze_audio**: The analyze_audio field action detects modulation drift.
- **Field Action: interview_witness**: The interview_witness field action identifies contradictions in logs.
- **Field Action: review_evidence**: The review_evidence field action recovers frame markers in stills.
- **Field Action: trace_number**: The trace_number field action tracks routing through dead infrastructure.
