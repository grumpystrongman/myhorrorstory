# Commercial Benchmark Research

Updated: 2026-03-09

## Source Set
- Semrush Top Games websites (traffic/popularity baseline): https://www.semrush.com/website/top/games/
- Awwwards Games category (high-recognition interaction and visual patterns): https://www.awwwards.com/websites/games/
- Figma design trend report for current visual directions and composition patterns: https://www.figma.com/blog/design-trends/
- Baymard homepage/category usability guidance for conversion-safe structure: https://baymard.com/blog/homepage-and-category-usability
- WCAG 2.2 for accessibility floor in commercial UX: https://www.w3.org/TR/WCAG22/

## Extracted Decisions
- Keep premium cinematic visual direction, but prioritize conversion clarity in the first viewport.
- Use strong editorial hierarchy: oversized hero headline, concise value proposition, direct CTA path.
- Use texture-rich backgrounds and atmospheric depth instead of flat dark surfaces.
- Keep predictable navigation and fast wayfinding for commercial sections (library, pricing, onboarding).
- Enforce accessibility floor for contrast, visible focus states, and reduced-motion support.
- Produce shareable social moments with dedicated composition-safe regions for captions and overlays.

## Translation Into MyHorrorStory
- `assets/prompts/commercial-site-pack.json` defines generation prompts for website and campaign surfaces.
- `assets/manifests/commercial-creative-plan.json` expands to a full production asset plan across website and stories.
- `scripts/linear-bots/control.mjs` turns this into Linear-managed issue assignments for AI bot execution.
