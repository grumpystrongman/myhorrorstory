# Visual Production System

## Goal
Ship a commercial-quality visual framework that supports:
- premium landing and onboarding surfaces
- story-specific key art for every launch case
- reusable design language across web, email, and social

## Source of Truth
- Visual generator script: `scripts/creative/generate-visual-assets.mjs`
- Story visuals output: `apps/web/public/visuals/stories/*.svg`
- Surface visuals output: `apps/web/public/visuals/surfaces/*.svg`
- Commercial prompt packs: `assets/prompts/commercial-site-pack.json`
- Asset manifests: `assets/manifests/commercial-creative-plan.json`

## Asset Rules
- Every story must have a dedicated key-art file mapped by story ID.
- Surface assets include landing, onboarding, and library hero compositions.
- Color palette and motif are story-specific to improve catalog differentiation.
- Assets are AI-assist-friendly and can be replaced by human-made art without path changes.

## Website Integration
- Landing page uses `/visuals/surfaces/landing-hero.svg`.
- Library and intro pages use `/visuals/stories/{storyId}.svg`.
- Onboarding and legal funnel pages use shared premium panel system in `globals.css`.

## Quality Checklist
- Responsive rendering on mobile and desktop
- Contrast-safe text overlays
- Distinct visual identity per story
- Reusable naming conventions for future stories
