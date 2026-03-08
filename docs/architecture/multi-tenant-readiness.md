# Multi-Tenant Readiness Notes

## Current State
- Single-tenant product architecture with tenant-ready abstractions.

## Tenant Expansion Strategy
- Add `tenantId` to user, story, party, billing, and audit entities.
- Namespace storage keys and queue names per tenant.
- Resolve branding and domain theming via tenant config package.
- Introduce tenant-level role overrides and policy rules.

## White-Label Requirements
- Theming contract in design tokens.
- Story catalog partitioning and entitlement isolation.
- Provider credential isolation by tenant.
