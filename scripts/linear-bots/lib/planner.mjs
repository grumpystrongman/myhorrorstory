import { botCatalog } from './bot-catalog.mjs';

const keywordRules = [
  {
    botId: 'AI-Media-Pipeline-Agent',
    keywords: ['art', 'image', 'visual', 'creative', 'asset', 'design']
  },
  {
    botId: 'AI-Voice-Audio-Agent',
    keywords: ['voice', 'audio', 'music', 'sound', 'narration']
  },
  {
    botId: 'AI-Web-App-Agent',
    keywords: ['web', 'landing', 'next.js', 'frontend']
  },
  {
    botId: 'AI-Mobile-App-Agent',
    keywords: ['mobile', 'expo', 'react native', 'ios', 'android']
  },
  {
    botId: 'AI-Backend-Agent',
    keywords: ['api', 'backend', 'service', 'database', 'queue', 'worker']
  },
  {
    botId: 'AI-Growth-CRM-Agent',
    keywords: ['growth', 'crm', 'email', 'referral', 'campaign']
  },
  {
    botId: 'AI-Security-Compliance-Agent',
    keywords: ['security', 'privacy', 'compliance', 'legal']
  },
  {
    botId: 'AI-QA-Test-Agent',
    keywords: ['qa', 'test', 'validation', 'certification']
  },
  {
    botId: 'AI-DevOps-Release-Agent',
    keywords: ['deploy', 'ci', 'cd', 'release', 'infra']
  }
];

function resolveBotFromLabels(labels) {
  const labelSet = new Set(labels);
  const direct = botCatalog.find((bot) => labelSet.has(bot.linearLabel));
  return direct?.id ?? null;
}

export function inferBotIdForIssue(issue) {
  const fromLabels = resolveBotFromLabels(issue.labels ?? []);
  if (fromLabels) {
    return fromLabels;
  }

  const searchable = `${issue.title} ${issue.description ?? ''}`.toLowerCase();
  const matchedRule = keywordRules.find((rule) =>
    rule.keywords.some((keyword) => searchable.includes(keyword))
  );

  return matchedRule?.botId ?? 'AI-Executive-Orchestrator';
}

export function buildBotExecutionPlan(issues) {
  return issues.map((issue) => {
    const botId = inferBotIdForIssue(issue);
    const bot = botCatalog.find((candidate) => candidate.id === botId);

    return {
      issueIdentifier: issue.identifier ?? 'UNTRACKED',
      issueTitle: issue.title,
      proposedBotId: botId,
      proposedLinearLabel: bot?.linearLabel ?? 'AI-Executive-Orchestrator',
      rationale:
        botId === 'AI-Executive-Orchestrator'
          ? 'No specific domain keywords or labels found; orchestration bot selected for triage.'
          : `Matched to ${botId} through labels/keyword heuristics.`,
      ownershipScope: bot?.scope ?? 'Orchestration triage'
    };
  });
}

export function summarizePlanCoverage(plan) {
  const coverage = new Map();
  for (const item of plan) {
    const current = coverage.get(item.proposedBotId) ?? 0;
    coverage.set(item.proposedBotId, current + 1);
  }

  return Array.from(coverage.entries())
    .map(([botId, issueCount]) => ({ botId, issueCount }))
    .sort((a, b) => b.issueCount - a.issueCount);
}
