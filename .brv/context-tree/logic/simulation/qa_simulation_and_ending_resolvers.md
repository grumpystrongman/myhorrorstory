---
title: QA Simulation and Ending Resolvers
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T22:16:09.026Z'
updatedAt: '2026-03-23T22:16:09.026Z'
---
## Raw Concept
**Task:**
Define QA simulation metrics and ending resolver logic

**Files:**
- scripts/qa/run-quality-agent-simulations.mjs

**Flow:**
Simulate paths -> Track morality/trust/deception/aggression -> Resolve ending type

**Timestamp:** 2026-03-23

## Narrative
### Structure
Ending resolver thresholds categorize results into JUSTICE, CORRUPTION, UNRESOLVED, TRAGIC, or PYRRHIC based on morality, trust, deception, and aggression scores.

### Highlights
Simulation strategies use weighted selectors for morality, trustworthiness, deception, and aggression.

### Rules
JUSTICE: Morality >= 15, Trustworthiness >= 5, Progress >= 80%.
CORRUPTION: Deception >= 18 OR Morality <= -18.
TRAGIC: Aggression >= 22, Progress >= 65%.

## Facts
- **ending_thresholds_justice**: Ending thresholds for JUSTICE: Morality >= 15, Trustworthiness >= 5, Progress >= 80% [project]
- **ending_thresholds_corruption**: Ending thresholds for CORRUPTION: Deception >= 18 OR Morality <= -18 [project]
- **simulation_strategies**: QA simulation strategies: protocol-conservative, justice-maximizer, corruption-maximizer, tragic-force, pyrrhic-balancer, ending-target [project]
