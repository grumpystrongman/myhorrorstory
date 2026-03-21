# ARG Daily Experience Architecture

## 1) System Goal
MyHorrorStory runs as a 3-4 week interactive investigation, not a short beat script.  
Each campaign is modeled as a living daily system with delayed interactions, evolving NPC behavior, artifacts, puzzles, branch anchors, and progression flags.

## 2) Core Components
- `scripts/creative/build-arg-campaigns.mjs`
  - Canonical ARG generator.
  - Produces 28 daily packages per story plus campaign metadata and prompt packs.
- `apps/web/public/content/arg/<storyId>/`
  - Runtime content contract for daily campaign delivery.
- `apps/web/src/app/lib/arg-campaign.ts`
  - Typed session and progression helper logic for day unlock and completion state.
- `apps/web/src/app/lib/arg-to-drama.ts`
  - Adapter that maps ARG day content to existing web runtime model.
- `apps/web/public/content/drama/<storyId>.json`
  - Compatibility output generated from ARG files so `/play` can run immediately.

## 3) Data Contracts
- `campaign.json`
  - Story identity, 4-week structure, threads, branch anchors, progression flags, delivery model.
- `day_01.json` ... `day_28.json`
  - Daily narrative progression, evidence drops, interactions, optional puzzle, red herring, awareness moments, unlock conditions.
- `npc_profiles.json`
  - Role-driven NPC behavior model (detective, witness, journalist, antagonist, unknown contact).
- `artifact_definitions.json`
  - All artifacts with clue tags, reliability, misleading markers, image prompts, and audio prompts.
- `npc_dialogue_system_prompts.json`
  - In-world LLM prompt pack for role behavior and immersion constraints.
- `sample_7_day_experience.json`
  - Complete first-week sample for review and QA baselines.
- `frontend_integration_plan.json`
  - Surface contract for board/messages/timeline/files presentation.
- `expansion_system.json`
  - Rules for creating additional campaigns safely and consistently.

## 4) Daily Progression Model
- Unlock gates combine:
  - prior day completion,
  - required interaction IDs,
  - progression flags,
  - branch conditions.
- Each day can include:
  - 1-2 new artifacts,
  - 3-5 interactions,
  - optional puzzle,
  - optional red herring,
  - awareness lines referencing prior player behavior.
- Phases:
  - Week 1 `DISCOVERY`
  - Week 2 `ESCALATION`
  - Week 3 `DANGER`
  - Week 4 `RESOLUTION`

## 5) NPC Behavior Model
- Required roles are guaranteed by generator.
- NPCs carry:
  - personality and motivations,
  - trust ranges,
  - secrets with reveal conditions,
  - deception rules,
  - panic triggers.
- Antagonist and unknown contact increase odd-hour pressure over time.

## 6) Artifact and Prompt Model
- Artifact categories rotate across realistic case-file formats.
- Every artifact includes:
  - image prompt with camera/lighting/grain specs,
  - audio prompt with grounded environmental dread cues,
  - reliability and misleading signals for deduction play.

## 7) Frontend Integration Model
- Evidence Board:
  - graph links between artifacts, threads, and NPC sources.
- Messages:
  - asynchronous channel events with delayed/no-response escalation.
- Timeline:
  - day cards with branch anchors and unresolved contradictions.
- Files:
  - searchable evidence cabinet with verified vs misleading markers.

## 8) Expansion Model
- Clone template campaign, replace narrative inputs, regenerate all day packages and prompts.
- Preserve schema and progression contracts to prevent broken unlock chains.
- Validate with full-month simulation and smoke tests before release.

## 9) Linear + OpenClaw Orchestration
- Linear tracks feature slices and acceptance criteria for story, art, audio, integration, and QA lanes.
- OpenClaw jobs consume generated prompt/content files for modality-specific production and verification.
