# Event Flows

## Session Join
1. Client requests invite validation.
2. API validates invite capacity and expiry.
3. API adds party membership and emits `session.joined`.
4. WebSocket gateway fan-outs event to all connected members.

## Chapter Reveal
1. Host or AI narrator issues progression command.
2. Story engine validates beat preconditions.
3. API persists progression state.
4. Worker schedules delayed unlock jobs when needed.
5. Gateway emits `chapter.revealed` and clue updates.

## Lifecycle Email
1. API emits growth event (`signup_abandoned`, `case_abandoned`, `winback_candidate`).
2. Worker consumes event and resolves template + segment rules.
3. Email adapter sends transactional/marketing message.
4. Analytics records deliverability and engagement events.
