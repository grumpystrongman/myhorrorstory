# Service Boundaries

## Runtime Services
- `Channel Ingress Service`
- Accepts inbound SMS/WhatsApp/Telegram/email payloads.
- Normalizes into `processInboundMessageRequestSchema` for downstream orchestration.
- `Narrative Orchestrator`
- Resolves active case/session, runs trigger evaluation, and chooses NPC/villain/GM responses.
- `Narrative Director Service`
- Generates next event cards with media prompt, delivery method, player response options, and consequence branches.
- Adapts output using behavior telemetry, safety preferences, villain stage, and channel availability.
- `Trigger Evaluation Service`
- Executes trigger DSL (`StoryTriggerRule`) against `StoryRuntimeState`.
- Produces deterministic action list and updated state deltas.
- `Villain Director Service`
- Maintains escalation stage, message cadence, and personalization context.
- Enforces stage timing limits and safety boundaries.
- `NPC Trust Service`
- Updates trust/emotion state and secret unlock checks.
- `Investigation Graph Service`
- Stores board nodes/links/timeline and validates confidence transitions.
- `Realtime Session Service`
- Emits websocket events for party sync and chapter progression.

## Operational Services
- `Story CMS Service`
- Publishes versioned story packages and validates against `storyPackageSchema`.
- `Growth/CRM Service`
- Lead capture, lifecycle event dispatch, referral events.
- `Support Service`
- Ticket workflows and audit log of moderator actions.

## API App Responsibilities (`apps/api`)
- AuthN/AuthZ, RBAC, terms and consent enforcement.
- Story package read APIs and party/session orchestration.
- Inbound channel processing endpoints and trigger evaluation endpoints.
- Health and admin operations endpoints.

## Worker Responsibilities (`apps/worker`)
- Timed unlock and countdown expirations.
- Delayed villain/NPC message scheduling.
- Email/CRM async delivery and retries.
- Media and voice generation jobs.

## Shared Package Responsibilities
- `contracts`: canonical schemas, trigger DSL, DTO contracts.
- `story-engine`: deterministic rule evaluation and action application.
- `voice`, `email`, `payments`, `analytics`, `storage`, `crm`: provider adapters only.

## External Boundary Rule
- App/API layers must never call provider SDKs directly.
- All external integrations go through adapter packages with test doubles.

## Data Ownership
- Story definitions: `docs/stories/*.story.json` validated by contracts.
- Runtime state snapshots: backend persistence layer (future DB modules).
- Delivery logs and audit events: operations domain tables.
