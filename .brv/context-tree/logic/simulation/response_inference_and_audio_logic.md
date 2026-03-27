---
title: Response Inference and Audio Logic
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T20:24:19.444Z'
updatedAt: '2026-03-23T20:24:19.444Z'
---
## Raw Concept
**Task:**
Document response inference scoring and sound director evaluation logic

**Flow:**
Normalize draft -> Tokenize -> Score matches (+8 full, +1 token) -> Return highest DramaResponseOption

**Timestamp:** 2026-03-23

## Narrative
### Structure
Logic for inferring player responses and dynamically selecting audio assets based on telemetry.

### Highlights
Sound Director selects bands: calm_ambience, suspense_drones, heartbeat_percussion.

### Rules
Phone normalization: Prepend +1 for 10 digits, + for 11 digits starting with 1.
