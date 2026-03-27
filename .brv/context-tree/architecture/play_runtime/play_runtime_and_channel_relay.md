---
title: Play Runtime and Channel Relay
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T20:23:42.301Z'
updatedAt: '2026-03-23T20:23:42.301Z'
---
## Raw Concept
**Task:**
Document Play UI runtime updates and external channel relay mechanism

**Changes:**
- Added support for relaying non-investigator messages to external channels
- Updated composer logic to allow mission thread bootstrapping
- Implemented hint penalty logic based on severity

**Files:**
- apps/web/src/app/play/page.tsx
- apps/web/src/app/components/channel-setup-console.tsx

**Flow:**
Message received -> Check if non-investigator -> Relay to /api/channels/send if external channel selected

**Timestamp:** 2026-03-23

## Narrative
### Structure
The Play UI manages the game session, including message delays (min 1.2s, max 45s), zoom/pan constants (50-200%), and external relaying.

### Highlights
External relay supports SMS, WHATSAPP, and TELEGRAM. PlayerId is read from URL or localStorage (myhorrorstory.channel.playerId).

### Rules
Rule 1: iPhone composer not blocked by isSimulatingBeat.
Rule 2: Relay only non-investigator messages.
Rule 3: Normalize phone numbers with +1 for US 10-digit.
Rule 4: WhatsApp requires whatsapp: prefix; Telegram requires numeric chatId.

## Facts
- **external_relay**: Play UI supports relaying non-investigator messages to SMS, WhatsApp, and Telegram via /api/channels/send [project]
- **composer_logic**: iPhone composer is no longer blocked by isSimulatingBeat [project]
- **hint_penalty_logic**: Hint penalty logic applies progress (+1 to +3), day (+1 to +2), and danger/villain (+2 to +5) increases [project]
- **audio_cipher_code**: Audio cipher code is '440' [project]
