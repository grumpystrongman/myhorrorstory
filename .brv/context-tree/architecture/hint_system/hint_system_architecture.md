---
title: Hint System Architecture
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T15:30:10.837Z'
updatedAt: '2026-03-23T15:30:10.837Z'
---
## Raw Concept
**Task:**
Implement and document LLM-backed hint system

**Flow:**
UI request -> /api/hints -> LLM (gpt-4o-mini) -> structured hint + server-side penalties -> UI update

**Timestamp:** 2026-03-23

## Narrative
### Structure
The system uses a three-tier hint architecture (approach, thinking, solve) via a Node.js dynamic API endpoint. It includes a robust fallback mechanism if the LLM is unavailable.

### Dependencies
Depends on OpenAI gpt-4o-mini, specifically using json_object format and temperature 0.3.

### Highlights
Features server-authoritative penalties that scale with usage and hint level, affecting reputation, campaign progress, and villain advantage.

### Rules
Rule 1: Penalties must be server-authoritative
Rule 2: Solve level hints must provide direct answers and autopick UI options
Rule 3: Use buildFallbackHint if LLM fails

### Examples
Audio cipher code constant: "440". Hint levels: approach (low severity), thinking (med), solve (high).
