# MyHorrorStory

MyHorrorStory is a production-focused, cross-platform horror mystery platform for solo and remote party play. It includes a consumer web app, mobile app, backend API, admin operations platform, story engine, media/voice pipelines, growth operations, and deployment infrastructure.

## Platform Capabilities
- Web gameplay and marketing funnel.
- In-browser immersive play simulation with channel popups and branching response flow.
- Mobile gameplay companion and progression continuity.
- Backend API with auth, story discovery, party/session orchestration, support endpoints, and realtime gateway.
- Admin console for operations, moderation, content, campaigns, support, and feature controls.
- Story engine for branching logic and timed unlock behavior.
- Voice and media adapter architecture with deterministic caching/fallback behavior.
- Growth stack foundations for lifecycle email, referrals, CRM, analytics, and commercial reporting.
- Multi-channel messaging tooling for SMS, WhatsApp, and Telegram player delivery.
- Commercial visual and audio pipelines with reusable asset manifests.
- Legal acceptance flows (terms, privacy, age gate) built into onboarding.

## Repository Structure
- `apps/web`: Next.js consumer app.
- `apps/admin`: Next.js admin app.
- `apps/mobile`: Expo React Native app.
- `apps/api`: NestJS API and realtime gateway.
- `apps/worker`: BullMQ workers for background orchestration.
- `packages/*`: shared schemas, adapters, story runtime, design system, and DB package.
- `docs/*`: architecture, security, QA, operations, growth, status, and agent workstreams.
- `infra/*`: local Docker and Terraform baseline.

## Quickstart
1. Install Node.js 22+.
2. Enable Corepack and activate pnpm:
   - `corepack enable`
   - `corepack prepare pnpm@10.8.1 --activate`
3. Install dependencies:
   - `pnpm install`
4. Start infrastructure:
   - `docker compose -f infra/docker/compose.yaml up -d`
5. Generate Prisma client and migrate:
   - `pnpm db:generate`
   - `pnpm db:migrate`
   - `pnpm db:seed`
6. Run development stack:
   - `pnpm dev`

## Remote Testing Anywhere
Use the built-in remote test orchestrator to expose web/admin/API with public tunnel URLs.

1. Install a tunnel provider (`cloudflared` recommended).
2. Start remote session:
   - `corepack pnpm remote:test:start`
3. Check current URLs:
   - `corepack pnpm remote:test:status`
4. Stop session:
   - `corepack pnpm remote:test:stop`

## Codex Browser Control Room
Use `/codex` in the web app to run local Codex prompts, stream live execution updates, and send follow-up guidance.

1. Set optional bridge hardening token:
   - `CODEX_BRIDGE_TOKEN=replace_with_strong_local_token`
2. Start the web app:
   - `corepack pnpm --filter @myhorrorstory/web dev`
3. Open:
   - `http://127.0.0.1:3000/codex` (or your configured web port)
4. If token is set, paste it into the bridge token field before running prompts.

## Immersive Web Session (Simulation-First)
The web play route now simulates live player delivery across SMS/WhatsApp/Telegram/email as in-app popups while preserving direct-provider abstractions for phone delivery later.

1. Start web on a dedicated test port:
   - `corepack pnpm --filter @myhorrorstory/web exec next dev -p 3100 -H 127.0.0.1`
2. Open:
   - `http://127.0.0.1:3100/play?storyId=midnight-lockbox`
3. Review commercial art gallery:
   - `http://127.0.0.1:3100/artwork`

## Core Commands
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm test:api:integration`
- `corepack pnpm test:e2e:install`
- `corepack pnpm test:e2e`
- `corepack pnpm test:commercial`
- `corepack pnpm build`
- `corepack pnpm messaging:setup -- --public-url https://your-api.example.com`
- `corepack pnpm linear:bots:plan`
- `corepack pnpm linear:bots:apply`
- `corepack pnpm linear:oauth:connect`
- `corepack pnpm linear:oauth:url`
- `corepack pnpm linear:oauth:exchange -- --code <authorization_code>`
- `corepack pnpm linear:oauth:refresh -- --refresh-token <refresh_token>`
- `corepack pnpm linear:oauth:client-credentials`
- `corepack pnpm creative:build-plan`
- `corepack pnpm creative:generate-visuals`
- `corepack pnpm creative:materialize-assets`
- `corepack pnpm creative:validate-visuals`
- `corepack pnpm stories:build-compendium`
- `corepack pnpm stories:build-drama`
- `corepack pnpm voice:build-drama`
- `node scripts/generate-score-placeholders.mjs`
- `node scripts/validate-baseline.mjs`
- `PLAYWRIGHT_WEB_PORT=3100 PLAYWRIGHT_ADMIN_PORT=3101 corepack pnpm test:e2e` (optional explicit port override)

## API Contract Summary
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `POST /api/v1/auth/legal/accept`
- `GET /api/v1/stories`
- `GET /api/v1/stories/:id`
- `POST /api/v1/parties`
- `GET /api/v1/parties`
- `GET /api/v1/channels/setup`
- `GET /api/v1/channels/setup/user?caseId=...&playerId=...`
- `POST /api/v1/channels/setup/user`
- `POST /api/v1/channels/setup/test`
- `POST /api/v1/channels/send`
- `POST /api/v1/webhooks/twilio`
- `POST /api/v1/webhooks/telegram`
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `POST /api/v1/growth/lead-capture`
- `POST /api/v1/growth/lifecycle-event`
- `GET /api/v1/growth/leads`
- `GET /api/v1/growth/campaigns`

## Realtime Events
- `session.joined`
- `chapter.revealed`
- `clue.unlocked`
- `vote.submitted`
- `host.command`
- `gm.narration`

## Documentation Index
- Architecture overview: `docs/architecture/overview.md`
- Domain model: `docs/domain/domain-model.md`
- Security model: `docs/security/security-model.md`
- QA strategy: `docs/qa/test-strategy.md`
- Commercial-grade test plan: `docs/qa/commercial-grade-test-plan.md`
- Voice design spec: `docs/stories/voice-design-spec.md`
- Voice casting manifest: `docs/stories/voice-casting-manifest.md`
- Music score spec: `docs/stories/music-score-spec.md`
- Voice drama production: `docs/stories/voice-drama-production.md`
- Growth architecture: `docs/growth/architecture.md`
- Email marketing system: `docs/growth/email-marketing-system.md`
- Remote testing runbook: `docs/operations/remote-testing-anywhere.md`
- Messaging setup runbook: `docs/operations/messaging-setup.md`
- Linear bot suite runbook: `docs/operations/linear-bot-suite.md`
- Commercial benchmark research: `docs/design/commercial-benchmark-research.md`
- Visual validation report: `docs/design/visual-validation-report.md`
- Story branching compendium: `docs/stories/branching-compendium.md`
- Finalized story playbooks: `docs/stories/finalized-playbooks/*.md`
- Terms and Conditions source: `docs/legal/terms-and-conditions.md`
- Phase status reports: `docs/status/phase-01.md` through `docs/status/phase-11.md`
- Agent workstreams: `docs/agents/README.md`

## Launch Story Catalog
1. Static Between Stations
2. Black Chapel Ledger
3. The Harvest Men
4. Signal From Kharon-9
5. The Fourth Tenant
6. Tape 17: Pinewatch
7. Crown of Salt
8. Red Creek Winter
9. Ward 1908
10. Dead Channel Protocol

## Short Mode Test Story
- Midnight Lockbox (short-mode QA arc, 1-2 day async playthrough)

## Security and Compliance Notes
- RBAC and audit logs are first-class in data schema and API boundaries.
- Age gate, terms acceptance, and privacy consent are modeled per user.
- External provider integrations use adapter packages to avoid vendor lock-in.

## Licensing
Apache-2.0
