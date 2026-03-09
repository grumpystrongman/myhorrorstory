# Phase 04: Web Consumer + Marketing

## Completed
- Implemented Next.js consumer app with landing, onboarding, library, play, dashboard, support, referral, billing, and legal routes.
- Applied design-token-based horror-luxe visual baseline and responsive container layout.
- Added Codex browser control room (`/codex`) with a local CLI bridge, live SSE update streaming, and in-thread guidance prompts.
- Rebuilt landing, library, onboarding, support, billing, and legal pages with commercial-grade visual hierarchy, story key-art integration, and conversion-focused copy.
- Added production onboarding forms for account signup (with terms/privacy/age-gate acceptance) and email join capture.
- Added web-side marketing API bridge routes (`/api/marketing/lead`, `/api/marketing/signup`) with backend fallback handling.
- Rebuilt `/play` into immersive runtime UX with:
  - in-app popup simulation for SMS/WhatsApp/Telegram/email drops
  - message feed and branching response flow
  - session progression, reputation effects, and ending debrief
  - investigation board and timeline visibility integrated into gameplay surface
- Added `/artwork` gallery route for commercial creative preview review.

## Remaining
- Connect all web screens to authenticated live API data and realtime party state.

## Validation Evidence
- Date: 2026-03-09
- Commands executed successfully from repository root:
  - `corepack pnpm --filter @myhorrorstory/web lint`
  - `corepack pnpm --filter @myhorrorstory/web typecheck`
  - `corepack pnpm --filter @myhorrorstory/web test`
  - `corepack pnpm --filter @myhorrorstory/web build`
  - `corepack pnpm stories:build-drama`
  - `corepack pnpm creative:generate-visuals`
  - `PLAYWRIGHT_WEB_PORT=3200 PLAYWRIGHT_ADMIN_PORT=3201 corepack pnpm exec playwright test tests/e2e/web-commercial.spec.ts --config tests/e2e/playwright.config.ts`

## Risks
- Provider integrations (payments, CRM, support, voice/media) remain adapter-based until live credentials and staging infra are connected.

## Signoff
- Product: Complete for current baseline
- Engineering: Complete for current baseline
- QA: Baseline complete, e2e expansion pending
- Security: Baseline complete, automated scan expansion pending
- Release: Baseline complete, staging dry-run pending
