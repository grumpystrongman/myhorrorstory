# Linear Control Plane

Last synced: 2026-03-09

## Assigned-to-me snapshot
- Query: `assignee = me`
- Result: no user-assigned issues currently.
- Delivery ownership is bot-labeled per issue.

## Active Workspace Queue
- Team: `JEF` (`Jeffbarnes`)
- Open issues evaluated: `20`
- Bot-labeled issues: `20`
- Newly created in latest sync: `0`
- Relabeled in latest sync: `0`

## Bot Assignment Coverage
- `AI-Media-Pipeline-Agent`: 14 issues
- `AI-QA-Test-Agent`: 2 issues
- `AI-Security-Compliance-Agent`: 1 issue
- `AI-Growth-CRM-Agent`: 1 issue
- `AI-UX-UI-Agent`: 1 issue
- `AI-Executive-Orchestrator`: 1 issue

## Automation Entrypoints
- Dry-run planner: `corepack pnpm linear:bots:plan`
- Apply planner: `corepack pnpm linear:bots:apply`
- OAuth connect page: `corepack pnpm linear:oauth:connect`

## Generated Control Artifacts
- `docs/operations/linear-bot-suite-plan.json`
- `docs/operations/linear-bot-suite-report.md`
- `assets/manifests/commercial-creative-plan.json`

## Governance Note
Linear remains the project control plane for bot ownership and queue routing. Repo-side execution artifacts are synchronized through the planner/apply workflow above.

