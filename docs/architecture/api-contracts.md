# API Contracts

## Versioning
- REST base path: `/api/v1`.
- Breaking changes require `/api/v2` and migration notes.

## Core Endpoints
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
