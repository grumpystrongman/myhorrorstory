# Email Marketing System

## Scope
Commercial lifecycle automation for:
- email join capture
- onboarding welcome
- abandoned signup recovery
- abandoned case recovery
- win-back
- upsell
- referral invites
- launch announcements

## Runtime Components
- API controller: `apps/api/src/growth/growth.controller.ts`
- API service: `apps/api/src/growth/growth.service.ts`
- Email templates and providers: `packages/email/src/index.ts`
- CRM segment sync: `packages/crm/src/index.ts`
- Analytics event tracking: `packages/analytics/src/index.ts`
- Web form entrypoints:
  - `apps/web/src/app/components/lead-capture-form.tsx`
  - `apps/web/src/app/components/signup-form.tsx`

## Endpoints
- `POST /api/v1/growth/lead-capture`
- `POST /api/v1/growth/lifecycle-event`
- `GET /api/v1/growth/leads`
- `GET /api/v1/growth/campaigns`

## Campaign Registry
- `campaign-welcome` -> `welcome`
- `campaign-abandoned-signup` -> `abandoned_signup`
- `campaign-abandoned-case` -> `abandoned_case`
- `campaign-win-back` -> `win_back`
- `campaign-upsell` -> `upsell`
- `campaign-referral` -> `referral_invite`
- `campaign-launch` -> `launch_announcement`

## Provider Strategy
- Primary provider: `ResendEmailProvider` when `RESEND_API_KEY` is configured.
- Fallback provider: `ConsoleEmailProvider` for deterministic local/dev operation.
- Failover chain: `FailoverEmailProvider`.

## Legal + Consent Notes
- Signup requires accepted terms, privacy, and age gate flags.
- Consent and legal acceptance timestamps are persisted in auth memory model.
- Marketing send behavior can be gated by `marketingConsent`.

## Validation
- API integration tests:
  - `apps/api/src/app.integration.test.ts`
- Email unit tests:
  - `packages/email/src/index.test.ts`
