# API Contracts

## Versioning
- REST base path: `/api/v1`.
- Breaking changes require a new major route namespace.
- Canonical runtime schemas live in `@myhorrorstory/contracts`.

## Core Gameplay Endpoints
- `GET /api/v1/stories`
- Response: `StoryPackage[]`.
- `GET /api/v1/stories/:id`
- Response: `StoryPackage`.
- `POST /api/v1/parties`
- Request: `createPartySchema`.
- `GET /api/v1/parties`
- Response: party session summaries.

## ARG Runtime Endpoints
- `POST /api/v1/channels/inbound`
- Request: `processInboundMessageRequestSchema`.
- Response: `processInboundMessageResponseSchema`.
- `GET /api/v1/channels/setup`
- Response: provider readiness, missing env vars, and webhook URLs for `SMS`, `WHATSAPP`, `TELEGRAM`.
- `POST /api/v1/channels/setup/user`
- Request: `{ caseId, playerId, contacts[] }` with per-channel address and opt-in.
- Response: route registration summary (`channelCount`, `activeRouteCount`).
- `GET /api/v1/channels/setup/user?caseId=...&playerId=...`
- Response: persisted channel mapping for that player/case (normalized addresses + opt-in state).
- `POST /api/v1/channels/setup/test`
- Request: `{ caseId, playerId, channels?, message? }`.
- Response: delivery receipts from configured provider chain (live provider or console fallback).
- `POST /api/v1/channels/send`
- Request: `{ caseId, playerId, channels?, message, mediaUrls? }`.
- Response: live delivery receipts for configured player channels.
- `POST /api/v1/webhooks/twilio`
- Request: Twilio webhook payload (`application/x-www-form-urlencoded`).
- Response: normalized inbound ingestion result routed to runtime by registered contact map.
- `POST /api/v1/webhooks/telegram`
- Request: Telegram update payload.
- Response: normalized inbound ingestion result routed to runtime by registered contact map.
- `POST /api/v1/story-rules/evaluate`
- Request: `evaluateTriggersRequestSchema`.
- Response: `evaluateTriggersResponseSchema`.
- `POST /api/v1/narrative/events/next`
- Request: `nextNarrativeEventRequestSchema`.
- Response: `nextNarrativeEventResponseSchema`.
- `PUT /api/v1/investigation/board`
- Request: `investigationBoardUpsertSchema`.
- Response: persisted board metadata.

## Auth + Ops Endpoints
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `POST /api/v1/auth/legal/accept`
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `POST /api/v1/billing/checkout`
- `POST /api/v1/growth/lead-capture`
- `POST /api/v1/growth/lifecycle-event`
- `GET /api/v1/growth/leads`
- `GET /api/v1/growth/campaigns`

## Realtime Event Contracts
- Session events: `session.joined`, `chapter.revealed`, `clue.unlocked`, `vote.submitted`.
- Narrative events: `gm.narration`, `message.received`, `villain.contacted`, `npc.updated`.
- Outcome events: `event.triggered`, `ending.changed`.

## Validation Rules
- All inbound/outbound payloads must validate at runtime with Zod.
- Story package loading must parse with `storyPackageSchema` before API exposure.
- Trigger DSL payloads must parse with `triggerConditionSchema` and `storyTriggerRuleSchema`.
- Narrative output cards must include all eight required fields:
- `mediaType`, `mediaDescription`, `aiGenerationPrompt`, `narrativePurpose`, `hiddenClues`, `deliveryMethod`, `possiblePlayerResponses`, `storyConsequences`.
