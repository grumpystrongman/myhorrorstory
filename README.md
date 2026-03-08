# MyHorrorStory

MyHorrorStory is a production-focused, cross-platform horror mystery platform for solo and remote party play. It includes a consumer web app, mobile app, backend API, admin operations platform, story engine, media/voice pipelines, growth operations, and deployment infrastructure.

## Platform Capabilities
- Web gameplay and marketing funnel.
- Mobile gameplay companion and progression continuity.
- Backend API with auth, story discovery, party/session orchestration, support endpoints, and realtime gateway.
- Admin console for operations, moderation, content, campaigns, support, and feature controls.
- Story engine for branching logic and timed unlock behavior.
- Voice and media adapter architecture with deterministic caching/fallback behavior.
- Growth stack foundations for lifecycle email, referrals, CRM, analytics, and commercial reporting.

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

## Core Commands
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm test:api:integration`
- `corepack pnpm test:e2e:install`
- `corepack pnpm test:e2e`
- `corepack pnpm test:commercial`
- `corepack pnpm build`
- `node scripts/validate-baseline.mjs`
- `PLAYWRIGHT_WEB_PORT=3100 PLAYWRIGHT_ADMIN_PORT=3101 corepack pnpm test:e2e` (optional explicit port override)

## API Contract Summary
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `GET /api/v1/stories`
- `GET /api/v1/stories/:id`
- `POST /api/v1/parties`
- `GET /api/v1/parties`
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`

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
- Growth architecture: `docs/growth/architecture.md`
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

## Security and Compliance Notes
- RBAC and audit logs are first-class in data schema and API boundaries.
- Age gate, terms acceptance, and privacy consent are modeled per user.
- External provider integrations use adapter packages to avoid vendor lock-in.

## Licensing
Apache-2.0
