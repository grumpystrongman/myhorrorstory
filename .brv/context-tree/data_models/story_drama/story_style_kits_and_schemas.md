---
title: Story Style Kits and Schemas
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-03-23T20:42:02.771Z'
updatedAt: '2026-03-23T20:43:29.989Z'
---
## Raw Concept
**Task:**
Define narrative schemas and style kits for drama stories

**Changes:**
- Standardized STORY_STYLE_KITS for 10 core stories
- Defined structured narrative payloads (playerBriefing, caseFile)
- Enforced message object properties via ensureMessageShape

**Timestamp:** 2026-03-23

## Narrative
### Structure
STORY_STYLE_KITS define Incident, Objective, Risk, and Setting Thread for each story. Narrative payloads are divided into playerBriefing and caseFile.

### Highlights
Covers stories: black-chapel-ledger, crown-of-salt, dead-channel-protocol, midnight-lockbox, red-creek-winter, signal-from-kharon-9, tape-17-pinewatch, the-fourth-tenant, the-harvest-men, ward-1908.

### Rules
ensureMessageShape properties: id, senderName, role, channel, text, delaySeconds, intensity.
