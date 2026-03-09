# Linear Control Plane

Last synced: 2026-03-09

## Assigned-to-me snapshot
- Query: `assignee = me`
- Result: no user-assigned issues currently.
- Delivery ownership is bot-labeled per issue.

## Active Workspace Queue
- Team: `JEF` (`Jeffbarnes`)
- Open issues evaluated: `50`
- Bot-labeled issues: `50`
- Newly created in latest sync: `15` (production package dispatch)
- Relabeled in latest sync: `0`

## Bot Assignment Coverage
- `AI-Media-Pipeline-Agent`: 15 issues
- `AI-Story-Engine-Agent`: 13 issues
- `AI-QA-Test-Agent`: 3 issues
- `AI-Security-Compliance-Agent`: 2 issues
- `AI-Growth-CRM-Agent`: 2 issues
- `AI-Voice-Audio-Agent`: 2 issues
- `AI-UX-UI-Agent`: 2 issues
- `AI-Web-App-Agent`: 2 issues
- `AI-Backend-Agent`: 2 issues
- `AI-Executive-Orchestrator`: 2 issues
- `AI-Mobile-App-Agent`: 1 issue
- `AI-Commercial-Success-Agent`: 1 issue
- `AI-DevOps-Release-Agent`: 1 issue
- `AI-Admin-Ops-Agent`: 1 issue
- `AI-Product-Agent`: 1 issue

## Automation Entrypoints
- Dry-run planner: `corepack pnpm linear:bots:plan`
- Apply planner: `corepack pnpm linear:bots:apply`
- Auto-run daemon for `assignee = me`: `corepack pnpm linear:bots:autorun`
- Auto-run one cycle: `corepack pnpm linear:bots:autorun:once`
- Dispatch production package backlog: `corepack pnpm linear:bots:dispatch-package`
- OAuth connect page: `corepack pnpm linear:oauth:connect`

## Generated Control Artifacts
- `docs/operations/linear-bot-suite-plan.json`
- `docs/operations/linear-bot-suite-report.md`
- `docs/operations/linear-production-package-backlog.json`
- `docs/operations/linear-production-package-report.json`
- `docs/operations/linear-production-package-report.md`
- `assets/manifests/commercial-creative-plan.json`

## Governance Note
Linear remains the project control plane for bot ownership and queue routing. Repo-side execution artifacts are synchronized through the planner/apply workflow above.

