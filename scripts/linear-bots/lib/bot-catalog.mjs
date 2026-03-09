export const botCatalog = [
  {
    id: 'AI-Executive-Orchestrator',
    linearLabel: 'AI-Executive-Orchestrator',
    scope: 'Program control, sequencing, and cross-workstream signoff.',
    owns: ['Roadmap governance', 'Cross-agent conflict resolution', 'Launch readiness gates']
  },
  {
    id: 'AI-Product-Agent',
    linearLabel: 'AI-Product-Agent',
    scope: 'Commercial product requirements and acceptance criteria.',
    owns: ['PRD updates', 'Scope/risk decisions', 'Feature acceptance definitions']
  },
  {
    id: 'AI-UX-UI-Agent',
    linearLabel: 'AI-UX-UI-Agent',
    scope: 'Interaction design, visual language, and accessibility.',
    owns: ['Design system decisions', 'Page blueprints', 'UX consistency checks']
  },
  {
    id: 'AI-Web-App-Agent',
    linearLabel: 'AI-Web-App-Agent',
    scope: 'Marketing and gameplay web implementation.',
    owns: ['Landing pages', 'Funnels', 'Gameplay UI polish']
  },
  {
    id: 'AI-Mobile-App-Agent',
    linearLabel: 'AI-Mobile-App-Agent',
    scope: 'Mobile parity and responsive runtime UX.',
    owns: ['Mobile navigation', 'Performance constraints', 'Cross-device UX parity']
  },
  {
    id: 'AI-Backend-Agent',
    linearLabel: 'AI-Backend-Agent',
    scope: 'APIs, orchestration, data contracts, and backend reliability.',
    owns: ['API contracts', 'Runtime services', 'Delivery infrastructure']
  },
  {
    id: 'AI-Story-Engine-Agent',
    linearLabel: 'AI-Story-Engine-Agent',
    scope: 'Narrative logic, branching validation, and content runtime behavior.',
    owns: ['Story branching', 'Trigger DSL', 'Narrative state integrity']
  },
  {
    id: 'AI-Media-Pipeline-Agent',
    linearLabel: 'AI-Media-Pipeline-Agent',
    scope: 'Image/video prompt pipeline, manifests, and asset generation quality.',
    owns: ['Prompt libraries', 'Asset manifests', 'Provider output quality checks']
  },
  {
    id: 'AI-Voice-Audio-Agent',
    linearLabel: 'AI-Voice-Audio-Agent',
    scope: 'Voice casting, score direction, and adaptive audio experience.',
    owns: ['Voice profiles', 'Music direction', 'Audio mix policies']
  },
  {
    id: 'AI-Admin-Ops-Agent',
    linearLabel: 'AI-Admin-Ops-Agent',
    scope: 'Back-office tooling, moderation, and operations workflows.',
    owns: ['Admin tooling', 'Content operations', 'Moderation workflows']
  },
  {
    id: 'AI-Growth-CRM-Agent',
    linearLabel: 'AI-Growth-CRM-Agent',
    scope: 'Lifecycle growth, referral mechanics, and CRM orchestration.',
    owns: ['Lifecycle campaigns', 'Lead capture', 'Segmentation and attribution']
  },
  {
    id: 'AI-QA-Test-Agent',
    linearLabel: 'AI-QA-Test-Agent',
    scope: 'Commercial-grade validation, regression protection, and quality evidence.',
    owns: ['Test strategy', 'Certification artifacts', 'Regression suites']
  },
  {
    id: 'AI-Security-Compliance-Agent',
    linearLabel: 'AI-Security-Compliance-Agent',
    scope: 'Security, safety, policy, and legal compliance.',
    owns: ['Threat checks', 'Consent/privacy controls', 'Compliance evidence']
  },
  {
    id: 'AI-DevOps-Release-Agent',
    linearLabel: 'AI-DevOps-Release-Agent',
    scope: 'CI/CD reliability, deployment quality, and release controls.',
    owns: ['Pipelines', 'Runbooks', 'Rollback strategies']
  },
  {
    id: 'AI-Commercial-Success-Agent',
    linearLabel: 'AI-Commercial-Success-Agent',
    scope: 'Monetization strategy, packaging, and post-launch expansion.',
    owns: ['Pricing experiments', 'Packaging strategy', 'Commercial KPI outcomes']
  }
];

export function getBotById(id) {
  return botCatalog.find((bot) => bot.id === id);
}
