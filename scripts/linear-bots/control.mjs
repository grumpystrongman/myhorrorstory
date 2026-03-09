import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { botCatalog } from './lib/bot-catalog.mjs';
import { buildCommercialCreativeIssueBlueprints, buildCommercialWebsiteBlueprint } from './lib/creative-blueprints.mjs';
import { LinearClient } from './lib/linear-client.mjs';
import { createLinearClientCredentialsToken } from './lib/oauth-client.mjs';
import { buildBotExecutionPlan, summarizePlanCoverage } from './lib/planner.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    dryRun: args.includes('--dry-run') || !args.includes('--apply')
  };
}

async function loadStoryIds(repoRoot) {
  const storiesDir = join(repoRoot, 'docs', 'stories');
  const files = await readdir(storiesDir);
  const storyFiles = files.filter((file) => file.endsWith('.story.json'));

  const storyIds = [];
  for (const file of storyFiles) {
    const raw = await readFile(join(storiesDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.id === 'string') {
      storyIds.push(parsed.id);
    }
  }

  return storyIds.sort();
}

function buildIssueDescription(blueprint, websiteBlueprint) {
  const websiteTargets = websiteBlueprint.map((surface) => `- ${surface.surface}: ${surface.objective}`).join('\n');
  return [
    blueprint.description,
    '',
    'Commercial website quality requirements:',
    websiteTargets,
    '',
    'Delivery requirements:',
    '- Production-ready artifacts (no placeholders without migration path).',
    '- Asset provenance metadata and revision strategy.',
    '- Mobile + desktop variants.',
    '- Accessibility and legal checks included.'
  ].join('\n');
}

function buildMarkdownReport(input) {
  const lines = [];
  lines.push('# Linear Bot Suite Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${input.mode}`);
  lines.push('');
  lines.push('## Coverage by Bot');
  for (const item of input.coverage) {
    lines.push(`- ${item.botId}: ${item.issueCount} issue(s)`);
  }
  lines.push('');
  lines.push('## Planned Creative Work Queue');
  for (const row of input.plan.slice(0, 200)) {
    lines.push(`- ${row.issueIdentifier}: ${row.issueTitle} -> ${row.proposedBotId}`);
  }
  lines.push('');
  lines.push('## Bot Catalog');
  for (const bot of botCatalog) {
    lines.push(`- ${bot.id}: ${bot.scope}`);
  }
  return `${lines.join('\n')}\n`;
}

async function resolveLinearToken() {
  const explicitAccessToken = process.env.LINEAR_ACCESS_TOKEN?.trim();
  if (explicitAccessToken) {
    return {
      token: explicitAccessToken,
      source: 'LINEAR_ACCESS_TOKEN'
    };
  }

  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (apiKey) {
    return {
      token: apiKey,
      source: 'LINEAR_API_KEY'
    };
  }

  const useClientCredentials = process.env.LINEAR_OAUTH_USE_CLIENT_CREDENTIALS === 'true';
  const clientId = process.env.LINEAR_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.LINEAR_OAUTH_CLIENT_SECRET?.trim();

  if (useClientCredentials && clientId && clientSecret) {
    const tokenResponse = await createLinearClientCredentialsToken({
      clientId,
      clientSecret,
      scope: process.env.LINEAR_OAUTH_SCOPE?.trim() || 'read,write'
    });

    if (!tokenResponse.access_token) {
      throw new Error('Linear OAuth client credentials request succeeded without access_token.');
    }

    return {
      token: tokenResponse.access_token,
      source: 'LINEAR_OAUTH_CLIENT_CREDENTIALS'
    };
  }

  return {
    token: null,
    source: 'none'
  };
}

async function main() {
  const repoRoot = process.cwd();
  const { apply, dryRun } = parseArgs();
  const mode = apply && !dryRun ? 'apply' : 'dry-run';

  const storyIds = await loadStoryIds(repoRoot);
  const creativeBlueprints = buildCommercialCreativeIssueBlueprints(storyIds);
  const websiteBlueprint = buildCommercialWebsiteBlueprint();

  const reportOutput = join(repoRoot, 'docs', 'operations', 'linear-bot-suite-report.md');
  const jsonOutput = join(repoRoot, 'docs', 'operations', 'linear-bot-suite-plan.json');
  await mkdir(join(repoRoot, 'docs', 'operations'), { recursive: true });

  const teamKey = process.env.LINEAR_TEAM_KEY;
  const tokenResolution = await resolveLinearToken();

  if (!teamKey || !tokenResolution.token) {
    const localIssues = creativeBlueprints.map((blueprint, index) => ({
      id: `LOCAL-${index + 1}`,
      identifier: `LOCAL-${index + 1}`,
      title: blueprint.title,
      description: buildIssueDescription(blueprint, websiteBlueprint),
      labels: [blueprint.botId],
      stateName: 'Planned',
      stateType: 'unstarted',
      assigneeEmail: null,
      url: null
    }));

    const localPlan = buildBotExecutionPlan(localIssues);
    const coverage = summarizePlanCoverage(localPlan);

    await writeFile(
      jsonOutput,
      JSON.stringify(
        {
          mode: 'dry-run-no-linear-token',
          generatedAt: new Date().toISOString(),
          linearAuthSource: tokenResolution.source,
          storyIds,
          websiteBlueprint,
          issues: localIssues,
          plan: localPlan,
          coverage
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      reportOutput,
      buildMarkdownReport({
        mode: `dry-run-no-linear-token (auth source: ${tokenResolution.source})`,
        plan: localPlan,
        coverage
      }),
      'utf8'
    );
    console.log(
      '[linear-bots] Missing LINEAR_TEAM_KEY or token credentials (LINEAR_ACCESS_TOKEN / LINEAR_API_KEY / OAuth client credentials). Generated dry-run local plan only.'
    );
    console.log(`[linear-bots] Wrote ${jsonOutput}`);
    console.log(`[linear-bots] Wrote ${reportOutput}`);
    return;
  }

  const client = new LinearClient(tokenResolution.token);
  const team = await client.getTeamByKey(teamKey);
  if (!team?.id) {
    throw new Error(`Team not found for LINEAR_TEAM_KEY=${teamKey}`);
  }

  const currentIssues = await client.listIssues({
    teamId: team.id,
    includeCompleted: false
  });

  const labelsByName = new Map(team.labels.nodes.map((label) => [label.name, label.id]));
  const existingTitleKey = new Set(currentIssues.map((issue) => issue.title.trim().toLowerCase()));

  const createdIssues = [];
  for (const blueprint of creativeBlueprints) {
    const titleKey = blueprint.title.trim().toLowerCase();
    if (existingTitleKey.has(titleKey)) {
      continue;
    }

    const labelId = labelsByName.get(blueprint.botId);
    const shouldCreate = mode === 'apply';
    if (!shouldCreate) {
      createdIssues.push({
        identifier: 'PENDING',
        title: blueprint.title,
        botId: blueprint.botId,
        created: false
      });
      continue;
    }

    const created = await client.createIssue({
      teamId: team.id,
      title: blueprint.title,
      description: buildIssueDescription(blueprint, websiteBlueprint),
      labelIds: labelId ? [labelId] : [],
      priority: blueprint.priority
    });

    createdIssues.push({
      identifier: created.identifier,
      title: created.title,
      botId: blueprint.botId,
      created: true
    });
  }

  const issuesAfterCreate = mode === 'apply'
    ? await client.listIssues({
        teamId: team.id,
        includeCompleted: false
      })
    : currentIssues;

  const plan = buildBotExecutionPlan(issuesAfterCreate);
  const coverage = summarizePlanCoverage(plan);
  let reassignedIssues = 0;

  if (mode === 'apply') {
    const issueByIdentifier = new Map(issuesAfterCreate.map((issue) => [issue.identifier, issue]));
    for (const planItem of plan) {
      const issue = issueByIdentifier.get(planItem.issueIdentifier);
      if (!issue?.id) {
        continue;
      }

      const labelId = labelsByName.get(planItem.proposedLinearLabel);
      if (!labelId) {
        continue;
      }

      const nextLabelIds = Array.from(new Set([...(issue.labelIds ?? []), labelId]));
      const isAlreadyAssigned = (issue.labelIds ?? []).includes(labelId);
      if (isAlreadyAssigned) {
        continue;
      }

      await client.updateIssueLabels(issue.id, nextLabelIds);
      issue.labelIds = nextLabelIds;
      issue.labels = Array.from(new Set([...(issue.labels ?? []), planItem.proposedLinearLabel]));
      reassignedIssues += 1;
    }
  }

  await writeFile(
    jsonOutput,
    JSON.stringify(
      {
        mode,
        generatedAt: new Date().toISOString(),
        team: {
          id: team.id,
          key: team.key,
          name: team.name
        },
        linearAuthSource: tokenResolution.source,
        storyIds,
        websiteBlueprint,
        createdIssues,
        reassignedIssues,
        issueCount: issuesAfterCreate.length,
        plan,
        coverage
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    reportOutput,
    buildMarkdownReport({
      mode,
      plan,
      coverage
    }),
    'utf8'
  );

  console.log(`[linear-bots] Mode: ${mode}`);
  console.log(`[linear-bots] Team: ${team.key} (${team.name})`);
  console.log(`[linear-bots] Open issues evaluated: ${issuesAfterCreate.length}`);
  console.log(`[linear-bots] Created issue placeholders: ${createdIssues.length}`);
  if (mode === 'apply') {
    console.log(`[linear-bots] Existing issues relabeled to bot ownership: ${reassignedIssues}`);
  }
  console.log(`[linear-bots] Wrote ${jsonOutput}`);
  console.log(`[linear-bots] Wrote ${reportOutput}`);
}

main().catch((error) => {
  console.error('[linear-bots] Failed:', error);
  process.exit(1);
});
