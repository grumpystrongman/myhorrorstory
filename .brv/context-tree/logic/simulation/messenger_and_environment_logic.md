---
title: Messenger and Environment Logic
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:01:26.245Z'
updatedAt: '2026-03-22T19:01:26.245Z'
---
## Raw Concept
**Task:**
Document messenger simulation and environment classification logic

**Flow:**
Input -> Normalization -> Scoring -> Response Inference

**Timestamp:** 2026-03-22

## Narrative
### Structure
Logic for simulating character interactions and classifying story environments based on keywords.

### Highlights
Role presets for speech synthesis (antagonist, witness, operator). Environment themes include Rail, Hospital, Chapel, Forest, Apartment, Maritime, Industrial.

### Rules
Rule 1: Response inference scores against label, summary, and intent.
Rule 2: Speech synthesis rate and pitch vary by role (e.g., antagonist: Rate 0.88, Pitch 0.68).

## Facts
- **role_preset_antagonist**: Antagonist speech preset: Rate 0.88, Pitch 0.68. [project]
- **environment_rail**: Environment keywords for 'Rail' include rail, station, platform, subway, and signal. [project]
