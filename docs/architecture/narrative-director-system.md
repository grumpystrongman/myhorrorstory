# Narrative Director System

## Objective
Deliver adaptive ARG events that feel like a live investigation while preserving deterministic, testable backend behavior.

## Implemented Interfaces
- Contract package:
- `nextNarrativeEventRequestSchema`
- `nextNarrativeEventResponseSchema`
- `narrativeEventCardSchema`
- Runtime API:
- `POST /api/v1/narrative/events/next`
- Story engine:
- `NarrativeDirectorEngine.generateNextEvent(story, request)`

## System Architecture
- `Channel Ingress` captures player signals and telemetry.
- `Runtime Trigger Evaluator` applies deterministic rule DSL and updates `StoryRuntimeState`.
- `Narrative Director Engine` reads runtime + behavior + safety + context and outputs the next event card.
- `Delivery Orchestrator` maps output to SMS/WhatsApp/Telegram/email/web/voice channels.
- `Realtime Gateway` syncs party state and event notifications.

## Data Models
- Input model:
- player behavior: clues, accusations, alliances, tone, moral trend, delay, skill, curiosity, risk.
- runtime snapshot: villain stage, progress, reputation, NPC trust, unresolved clues, flags.
- context: mood, scene type, danger, tension, villain presence, time, channel availability.
- safety: intensity, threat tone cap, realism level, late-night preference, max touches/hour.
- Output model (`NarrativeEventCard`):
1. `mediaType`
2. `mediaDescription`
3. `aiGenerationPrompt`
4. `narrativePurpose`
5. `hiddenClues`
6. `deliveryMethod`
7. `possiblePlayerResponses`
8. `storyConsequences`

## Villain Contact Architecture
- Stage engine computes `nextVillainStage` from:
- investigation progress
- villain presence
- accusation pressure
- delay/silence behavior
- safety caps
- Stage output drives:
- tone and objective
- allowed media styles
- urgency and cadence
- consequence severity

## Escalation Stages
1. Peripheral Presence: surveillance dread and cryptic awareness.
2. Psychological Contact: trust disruption via half-truths and social fracture.
3. Active Interference: timed pressure, false evidence, ally jeopardy.
4. Personal Confrontation: direct moral tests, recruitment, corruption paths.

## Message Generation Logic
- Determine stage and tension score.
- Select media type by stage + scene + tension.
- Build AI prompt with mood, location, stage objective, and hidden clue directive.
- Select delivery channel from media compatibility and currently enabled channels.
- Produce response options (fear/defiance/bargain/curiosity/deception/compliance/silence).
- Generate response-linked consequences with reputation/NPC trust/event impacts.

## Timing Rules
- `IMMEDIATE`: stage >= 3 or high tension.
- `SILENCE_BREAK`: long response delays.
- `LATE_NIGHT`: only if player allows late-night contact.
- `DELAYED`: suspense spacing for lower intensity moments.
- Urgency tiers: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` from tension thresholds.

## Trust Disruption System
- Enabled by default from stage 2 onward.
- Consequences can:
- reduce trust with key allies
- introduce contradictory leads
- expose real secrets mixed with false attribution
- lock or unlock endings based on response strategy

## Branching Consequence Examples
- Curiosity response:
- unlocks clue paths and timeline updates
- increases curiosity/trustworthiness
- may open secret endings
- Compliance response:
- lowers immediate threat
- risks evidence corruption and trust loss
- can lock justice endings
- Defiance response:
- increases direct villain pressure
- can unlock confrontation endings

## Sample Villain Message Tree
- Stage 1 (`CRYPTIC_CLUE`): "You missed what mattered in the relay room."
- Player curiosity -> metadata clue unlock.
- Player silence -> late-night escalation message.
- Stage 2 (`TAUNT`): "You were smarter yesterday."
- Player defiance -> stage 3 acceleration.
- Player bargain -> partial confession branch.
- Stage 3 (`COUNTDOWN`): "Ten minutes. Choose the station or the witness."
- Player compliance -> witness survives, evidence chain weakens.
- Player defiance -> higher casualty risk, stronger truth path.
- Stage 4 (`MORAL_TEST`): "Confess one truth and I return one life."
- Player deception -> retaliation branch.
- Player confession -> corruption branch with secret ending.

## NPC Behavior Design
- NPC trust remains bounded and response style-aware.
- NPC trust deltas are consequence-bound per response branch.
- Villain actions intentionally target alliance weak points to force belief decisions.

## Messaging Flow
1. Player action or timeout enters runtime.
2. Trigger DSL evaluates and updates state.
3. Client requests `/narrative/events/next`.
4. Engine returns event card with media + delivery + branch options.
5. Delivery adapter dispatches across chosen channel.
6. Player reply maps to consequence and feeds next trigger cycle.

## Emotional Design Principles
- Dread first, shock second.
- Escalation must feel earned by player behavior.
- Silence is an active pacing tool.
- Personalization should be specific but within consent boundaries.
- Every contact changes state; no cosmetic villain messages.

## Validation
- Contract tests cover request/response schema parsing.
- Story-engine tests cover output completeness and stage safety caps.
- API integration test covers `/narrative/events/next` response shape and branching payload presence.
