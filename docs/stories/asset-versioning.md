# Asset Versioning Rules

## Naming Convention
- `{assetType}/{slug}-v{revision}.{ext}`

## Metadata Requirements
- Story association.
- Prompt and prompt hash.
- Provider and generation settings.
- Human approval state.
- Safety review tag.

## Promotion Rules
- Draft assets remain in placeholder namespace.
- Approved assets promoted to canonical `assets/production/` namespace.
- Revisions are immutable; superseding creates new revision number.
