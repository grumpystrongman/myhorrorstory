# Domain Model

## Core Domains
- Identity and consent: users, sessions, legal acceptance, age-gate, intensity preferences.
- Story runtime: cases, acts, beats, triggers, arcs, endings, consequences.
- Character simulation: NPC profiles, trust states, secrets, villain models, escalation stages.
- Investigation graph: suspects, locations, evidence, timeline events, board links.
- Messaging orchestration: multi-channel inbound/outbound events and delivery audit.
- Commercial operations: entitlements, subscriptions, referrals, campaigns, support tickets.

## Primary Aggregates
- `StoryPackage`: versioned playable bundle with beats, trigger rules, arc map, endings, and safety profile.
- `StoryRuntimeState`: deterministic state snapshot for rules (`flags`, `clues`, `reputation`, `npcTrust`, `events`, `villainStage`).
- `NarrativeEventCard`: dynamic ARG payload containing media plan, AI prompt, hidden clues, response options, and branching consequences.
- `NpcProfile`: behavior model with trust gates and secret reveal requirements.
- `VillainProfile`: archetype, tactics, escalation timing, and message template catalog.
- `InvestigationBoard`: nodes, links, timeline events, and confidence values.
- `CommunityPuzzle`: shard distribution, solve condition, reward clue, and failure consequence.

## Reputation Model
- Axes: `trustworthiness`, `aggression`, `curiosity`, `deception`, `morality`.
- Range: `-100..100` per axis.
- Runtime effects: trigger conditions, NPC trust deltas, villain tone shifts, ending eligibility.

## Narrative Director Inputs
- Behavior telemetry: discovered clues, accusations, alliances, tone, response delay, curiosity/risk profile.
- Context telemetry: scene type, mood, location, danger, tension, villain proximity, channel availability.
- Safety controls: intensity, threat tone cap, realism level, late-night opt-in, max contacts per hour.

## Trigger DSL Model
- Condition tree: `predicate | all | any | not`.
- Predicate source examples:
- `PLAYER_REPUTATION`, `NPC_TRUST`, `HAS_CLUE`, `EVENT_OCCURRED`, `VILLAIN_STAGE`, `SILENCE_SECONDS`.
- Rule structure: `eventType + condition + ordered actions + cooldown + max activations`.
- Actions include: `SEND_MESSAGE`, `UPDATE_REPUTATION`, `REVEAL_CLUE`, `START_COUNTDOWN`, `UNLOCK_ENDING`.

## Villain Contact Escalation
1. Stage 1 `Peripheral Presence`: cryptic awareness and surveillance signals.
2. Stage 2 `Psychological Contact`: trust erosion and manipulative ambiguity.
3. Stage 3 `Active Interference`: timed threats, evidence disruption, NPC risk.
4. Stage 4 `Personal Confrontation`: direct moral tests and corruption offers.

## Season Continuity
- Persisted between cases: reputation vector, selected carry-forward flags, antagonist thread markers.
- Returning actors: at least one recurring ally and one recurring villain thread per package.

## Permission Model
- Gameplay roles: `PLAYER`, `HOST`.
- Operational roles: `MODERATOR`, `CONTENT_EDITOR`, `SUPPORT_AGENT`, `MARKETING_MANAGER`, `ANALYST`.
- Platform roles: `ADMIN`, `SUPER_ADMIN`.

## Source Of Truth
- Canonical schemas: `packages/contracts/src/index.ts`.
- Runtime evaluator: `packages/story-engine/src/index.ts`.
- Case assets: `docs/stories/*.story.json`.
