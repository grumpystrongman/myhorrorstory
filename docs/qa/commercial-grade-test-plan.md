# Commercial-Grade Test Plan

## Objective
Validate that MyHorrorStory behaves as a commercial-grade product across functional correctness, interaction fidelity, visual quality, accessibility, audio/control behavior, and deployment readiness.

## Automated Test Layers

### 1. Unit and Package Tests
- Shared contracts, story engine, auth, analytics, CRM, email, payments, storage, voice, media pipeline.
- Validation focus: schema correctness, deterministic behavior, adapter contracts, fallback behavior.

### 2. API Integration Tests
- Runtime stack: Nest application instance + HTTP assertions (supertest).
- Coverage:
  - Health endpoint.
  - Auth signup/signin and duplicate signup handling.
  - Story listing and story retrieval.
  - Party creation/listing.
  - Support ticket create/list.
  - Billing checkout flow.
  - Lead-capture growth flow.

### 3. Browser E2E Control Tests
- Runtime stack: Playwright against running web/admin apps.
- Harness isolation: dedicated ephemeral ports (`PLAYWRIGHT_WEB_PORT=3100`, `PLAYWRIGHT_ADMIN_PORT=3101`) with no server reuse.
- Coverage:
  - Every primary navigation click in consumer web flow.
  - Soundtrack routing:
    - Global overture on landing routes.
    - Story-specific handoff on intro and story play routes.
  - Play session control deck:
    - Zoom in/out/reset.
    - Pan via directional controls.
    - Pointer drag panning.
    - Wheel-based zoom.
    - Audio play/pause.
    - Mute toggle.
    - Volume adjustment.
    - Subtitle toggle.
  - Admin console navigation/structure validation.

### 4. Visual Certification
- Full-page screenshot capture at desktop and mobile breakpoints for key routes:
  - Web home.
  - Web play.
  - Admin home.
- Artifacts written under `tests/e2e/artifacts/visual`.

### 5. Accessibility Audits
- Axe scans for web home, web play, and admin home.
- Gate: no critical/serious violations.

### 6. Mobile Control Tests
- Pure state-model tests validating deterministic React Native control behavior:
  - Subtitles toggle.
  - Zoom and pan controls.
  - Audio play/mute controls.

## Commands
- Unit/package tests: `corepack pnpm test`
- API integration tests: `corepack pnpm test:api:integration`
- Install browser runtime: `corepack pnpm test:e2e:install`
- Browser/a11y/visual tests: `corepack pnpm test:e2e`
- Full commercial gate: `corepack pnpm test:commercial`

## Commercial Gate Criteria
A build is commercial-ready only when all of the following are true:
- `lint`, `typecheck`, and unit/package tests pass.
- API integration tests pass.
- Browser interaction, visual capture, and a11y tests pass.
- No unresolved blocker defects in security, billing, or core gameplay controls.
- Phase status docs are updated with validation evidence and signoff state.
