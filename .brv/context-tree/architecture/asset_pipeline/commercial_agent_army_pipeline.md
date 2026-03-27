---
title: Commercial Agent-Army Pipeline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-22T19:00:09.487Z'
updatedAt: '2026-03-22T19:00:09.487Z'
---
## Raw Concept
**Task:**
Document Commercial Agent-Army Asset Pipeline

**Changes:**
- Defined commercial gallery exclusion policy
- Established image generation fallback order
- Configured asset paths and environment loading

**Files:**
- assets/manifests/commercial-agent-army-plan.json
- apps/web/public/agent-army/catalog.json

**Flow:**
Environment Loading -> Image Generation (OpenAI/Pollinations) -> Validation -> Catalog Update

**Timestamp:** 2026-03-22

## Narrative
### Structure
Pipeline manages asset generation and distribution for commercial agent-army stories, using a fallback-based generation strategy.

### Dependencies
Depends on OpenAI (openai-gpt-image-1) and Pollinations (pollinations-free) for image generation.

### Highlights
Excludes degraded fallback images from commercial galleries; uses explicit "missing-art" states.

### Rules
Rule 1: Degraded local-playwright fallback images are excluded from commercial galleries unless ALLOW_LOCAL_ARTWORK_FALLBACK is set.
Rule 2: CLI asset scripts must load .env.local or .env files.

## Facts
- **Commercial Gallery Exclusion**: Degraded local-playwright fallback images are excluded from commercial galleries.
- **Image Generation Fallback**: Image generation fallback attempts OpenAI (openai-gpt-image-1) then Pollinations (pollinations-free).
- **Environment Loading**: CLI asset scripts load repo .env.local or .env files if environment variables are missing.
- **Web Surface Strategy**: Prefer verified agent-army manifest images and use explicit 'missing-art' states instead of placeholders.
- **publicAgentArmyRoot**: The public root path for agent-army assets is apps/web/public/agent-army.
- **productionAgentArmyRoot**: The production root path for agent-army assets is assets/production/agent-army.
- **planPath**: The commercial agent-army plan manifest is located at assets/manifests/commercial-agent-army-plan.json.
- **statusLedgerPath**: The generation status ledger is located at [publicAgentArmyRoot]/status/generation-status.json.
- **catalogPath**: The catalog path is located at [publicAgentArmyRoot]/catalog.json.
- **imageBackends**: Supported image backends include openai-gpt-image-1, pollinations-free, and local-playwright-art-director.
- **ALLOW_LOCAL_ARTWORK_FALLBACK**: ALLOW_LOCAL_ARTWORK_FALLBACK environment variable overrides commercial exclusion.
