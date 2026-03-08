# Domain Model

## Core Domains
- Identity and access: users, roles, sessions, terms and consent records.
- Commerce: subscriptions, purchases, entitlements, referrals.
- Story content: stories, chapters, beats, clues, evidence, media and voice assets.
- Session gameplay: parties, invites, memberships, journal notes, timeline reconstruction.
- Operations: support tickets, announcements, campaigns, feature flags, audit logs.

## Key Entities
- `User`: account, profile, legal acceptance, subscription tier.
- `Story`: versioned playable package with acts/beats and metadata.
- `Party`: active session context for solo or multiplayer cases.
- `Invite`: join mechanism for remote players via code/link.
- `Evidence` + `Clue`: collectible reasoning artifacts used in progression.
- `AuditLog`: immutable administrative trace for compliance and incident review.

## Permission Model
- `PLAYER`, `HOST` for gameplay operations.
- `MODERATOR`, `CONTENT_EDITOR`, `SUPPORT_AGENT`, `MARKETING_MANAGER`, `ANALYST` for operational concerns.
- `ADMIN`, `SUPER_ADMIN` for platform control and irreversible operations.
