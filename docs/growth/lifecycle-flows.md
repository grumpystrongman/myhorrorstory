# Lifecycle Email Flows

## Flows
- Welcome series: immediate welcome plus day-2 orientation email.
- Abandoned signup: trigger at 1 hour and 24 hours after incomplete registration.
- Abandoned case: trigger at 6 hours and 48 hours after incomplete chapter.
- Win-back: trigger at 21 days and 35 days inactivity.
- Upsell: trigger after first completed case and on premium content preview interaction.

## CRM Segments
- `new_lead`
- `onboarded`
- `active_player`
- `abandoned_signup`
- `abandoned_case`
- `winback_candidate`
- `premium_interest`

## Operational Safeguards
- Respect consent and unsubscribe state before enqueue.
- Deduplicate by campaign key + user within 24-hour window.
- Track send/open/click events to analytics and CRM.
