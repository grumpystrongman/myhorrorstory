# Contributing

## Workflow
1. Create a feature branch from `main`.
2. Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.
3. Fill the PR template and link related issues.
4. Include documentation updates for behavior/API changes.

## Commit style
- Use conventional commits.
- Keep commits focused and reversible.

## Quality gates
- Type-safe implementation.
- Validation and error handling on all public inputs.
- Unit and integration coverage for changed behavior.
