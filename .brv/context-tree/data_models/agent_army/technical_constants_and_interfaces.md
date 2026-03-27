---
title: Technical Constants and Interfaces
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-23T20:24:19.441Z'
updatedAt: '2026-03-23T20:24:19.441Z'
---
## Raw Concept
**Task:**
Document core technical configurations, constants, and data interfaces

**Timestamp:** 2026-03-23

## Narrative
### Structure
Defines storage keys, UI constants (zoom, pan, delays), and campaign defaults.

### Dependencies
Uses SoundDirectorTelemetry for music evaluation and SetupStatusChannel for provider configuration.

### Highlights
AUDIO_CIPHER_CODE is "440". UI message delays range from 1,200ms to 45,000ms.

## Facts
- **storage_keys**: Storage keys include myhorrorstory.channel.caseId and myhorrorstory.channel.playerId [project]
- **messenger_channels**: MESSENGER_CHANNELS includes SMS, WHATSAPP, TELEGRAM, and SIGNAL [project]
- **campaign_duration**: Default campaign target is 28 days, max is 45 days [project]
