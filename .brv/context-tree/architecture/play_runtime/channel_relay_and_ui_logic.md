---
title: Channel Relay and UI Logic
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T20:24:19.431Z'
updatedAt: '2026-03-23T20:24:19.431Z'
---
## Raw Concept
**Task:**
Document Play Runtime channel relay and UI interaction logic

**Changes:**
- Added external channel relay for non-investigator messages
- Unblocked iPhone composer from isSimulatingBeat for mission bootstrapping

**Flow:**
Play UI -> reads playerId (URL/localStorage) -> auto-relays to /api/channels/send (SMS, WhatsApp, Telegram)

**Timestamp:** 2026-03-23

## Narrative
### Structure
The Play Runtime manages live beat messages and coordinates with external messaging providers via a relay API.

### Highlights
Supports SMS, WhatsApp, and Telegram for external communication. Uses myhorrorstory.channel.playerId for session tracking.

### Rules
Rule 1: Auto-relay only non-investigator messages
Rule 2: iPhone composer is unblocked for first send or quick-reply
