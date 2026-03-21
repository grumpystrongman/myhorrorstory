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
- Dispatch agent-army backlog: `corepack pnpm linear:bots:dispatch-agent-army`
- Materialize agent-army outputs locally: `corepack pnpm creative:materialize-agent-army`
- Verify agent-army output completeness: `corepack pnpm creative:verify-agent-army`
- OAuth connect page: `corepack pnpm linear:oauth:connect`

## Generated Control Artifacts

- `docs/operations/linear-bot-suite-plan.json`
- `docs/operations/linear-bot-suite-report.md`
- `docs/operations/linear-production-package-backlog.json`
- `docs/operations/linear-agent-army-backlog.json`
- `docs/operations/linear-agent-army-backlog-report.json`
- `docs/operations/linear-agent-army-backlog-report.md`
- `docs/operations/linear-production-package-report.json`
- `docs/operations/linear-production-package-report.md`
- `docs/operations/openclaw-agent-army-jobs.json`
- `docs/operations/openclaw-agent-army-dispatch-report.json`
- `docs/operations/openclaw-agent-army-dispatch-report.md`
- `docs/operations/openclaw-agent-army-strict-aggregate-report.json`
- `docs/operations/openclaw-agent-army-strict-aggregate-report.md`
- `docs/operations/openclaw-agent-army-output-verification.json`
- `docs/operations/openclaw-agent-army-output-verification.md`
- `docs/operations/agent-army-materialization-report.json`
- `docs/operations/agent-army-materialization-report.md`
- `assets/manifests/commercial-creative-plan.json`
- `assets/manifests/commercial-agent-army-plan.json`

## Governance Note

Linear remains the project control plane for bot ownership and queue routing. Repo-side execution artifacts are synchronized through the planner/apply workflow above.
