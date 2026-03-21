import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { LinearClient } from './lib/linear-client.mjs';
import { createLinearClientCredentialsToken } from './lib/oauth-client.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const backlogArgIndex = args.indexOf('--backlog');
  const backlog =
    backlogArgIndex >= 0 && args[backlogArgIndex + 1]
      ? args[backlogArgIndex + 1]
      : 'docs/operations/linear-production-package-backlog.json';

  return {
    mode: apply ? 'apply' : 'dry-run',
    backlog
  };
}

function resolveOutputPaths(repoRoot, backlogPathArg) {
  const defaultBacklog = 'docs/operations/linear-production-package-backlog.json';
  if (backlogPathArg === defaultBacklog) {
    return {
      outputJson: join(repoRoot, 'docs', 'operations', 'linear-production-package-report.json'),
      outputMd: join(repoRoot, 'docs', 'operations', 'linear-production-package-report.md')
    };
  }

  const backlogBase = basename(backlogPathArg, '.json');
  return {
    outputJson: join(repoRoot, 'docs', 'operations', `${backlogBase}-report.json`),
    outputMd: join(repoRoot, 'docs', 'operations', `${backlogBase}-report.md`)
  };
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

function buildIssueDescription(task, backlog) {
  const deliverables = task.deliverables.map((item) => `- ${item}`).join('\n');
  const signoffCriteria = task.signoffCriteria.map((item) => `- ${item}`).join('\n');
  const sourceRefs = backlog.sourceReferences.map((item) => `- ${item}`).join('\n');

  return [
    task.description,
    '',
    `Production Package: ${backlog.packageTitle} (${backlog.packageId})`,
    '',
    'Source references:',
    sourceRefs,
    '',
    'Deliverables:',
    deliverables,
    '',
    'Signoff criteria:',
    signoffCriteria
  ].join('\n');
}

function buildMarkdownReport(input) {
  const lines = [];
  lines.push('# Linear Production Package Dispatch Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${input.mode}`);
  lines.push(`Package: ${input.backlog.packageTitle}`);
  lines.push(`Team: ${input.teamKey}`);
  lines.push(`Auth source: ${input.authSource}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Existing issues scanned: ${input.existingCount}`);
  lines.push(`- Tasks in backlog: ${input.backlog.tasks.length}`);
  lines.push(`- Created: ${input.created.length}`);
  lines.push(`- Already present: ${input.existingMatches.length}`);
  lines.push('');
  lines.push('## Created');
  if (input.created.length === 0) {
    lines.push('- none');
  } else {
    for (const item of input.created) {
      lines.push(`- ${item.identifier}: ${item.title} -> ${item.botId}`);
    }
  }
  lines.push('');
  lines.push('## Existing');
  if (input.existingMatches.length === 0) {
    lines.push('- none');
  } else {
    for (const item of input.existingMatches) {
      lines.push(`- ${item.identifier}: ${item.title} -> ${item.botId}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const { mode, backlog } = parseArgs();
  const repoRoot = process.cwd();
  const backlogPath = join(repoRoot, backlog);
  const backlogRaw = await readFile(backlogPath, 'utf8');
  const backlogDoc = JSON.parse(backlogRaw);
  const { outputJson, outputMd } = resolveOutputPaths(repoRoot, backlog);
  await mkdir(join(repoRoot, 'docs', 'operations'), { recursive: true });

  const teamKey = process.env.LINEAR_TEAM_KEY?.trim();
  const tokenResolution = await resolveLinearToken();

  if (!teamKey || !tokenResolution.token) {
    const dryRunData = {
      mode: 'dry-run-no-token',
      teamKey: teamKey ?? null,
      authSource: tokenResolution.source,
      backlog: backlogDoc,
      created: [],
      existingMatches: [],
      existingCount: 0
    };
    await writeFile(outputJson, JSON.stringify(dryRunData, null, 2), 'utf8');
    await writeFile(outputMd, buildMarkdownReport(dryRunData), 'utf8');
    console.log(
      '[linear-package] Missing Linear credentials or team key. Wrote dry-run report only.'
    );
    console.log(`[linear-package] ${outputJson}`);
    console.log(`[linear-package] ${outputMd}`);
    return;
  }

  const client = new LinearClient(tokenResolution.token);
  const team = await client.getTeamByKey(teamKey);
  if (!team?.id) {
    throw new Error(`Team not found for LINEAR_TEAM_KEY=${teamKey}`);
  }

  const labelsByName = new Map(team.labels.nodes.map((item) => [item.name, item.id]));
  const existingIssues = await client.listIssues({
    teamId: team.id,
    includeCompleted: false
  });

  const existingByTitle = new Map(
    existingIssues.map((issue) => [issue.title.trim().toLowerCase(), issue])
  );
  const created = [];
  const existingMatches = [];

  for (const task of backlogDoc.tasks) {
    const titleKey = task.title.trim().toLowerCase();
    const existing = existingByTitle.get(titleKey);
    if (existing) {
      existingMatches.push({
        identifier: existing.identifier,
        title: task.title,
        botId: task.botId
      });
      continue;
    }

    if (mode !== 'apply') {
      created.push({
        identifier: 'PENDING',
        title: task.title,
        botId: task.botId
      });
      continue;
    }

    const labelId = labelsByName.get(task.botId);
    const createdIssue = await client.createIssue({
      teamId: team.id,
      title: task.title,
      description: buildIssueDescription(task, backlogDoc),
      labelIds: labelId ? [labelId] : [],
      priority: task.priority ?? 2
    });

    created.push({
      identifier: createdIssue.identifier,
      title: task.title,
      botId: task.botId
    });
    existingByTitle.set(titleKey, {
      identifier: createdIssue.identifier,
      title: task.title
    });
  }

  const report = {
    mode,
    teamKey: team.key,
    teamName: team.name,
    authSource: tokenResolution.source,
    backlog: backlogDoc,
    created,
    existingMatches,
    existingCount: existingIssues.length
  };

  await writeFile(outputJson, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(outputMd, buildMarkdownReport(report), 'utf8');

  console.log(`[linear-package] Mode: ${mode}`);
  console.log(`[linear-package] Team: ${team.key} (${team.name})`);
  console.log(`[linear-package] Existing issues scanned: ${existingIssues.length}`);
  console.log(`[linear-package] Created: ${created.length}`);
  console.log(`[linear-package] Already present: ${existingMatches.length}`);
  console.log(`[linear-package] ${outputJson}`);
  console.log(`[linear-package] ${outputMd}`);
}

main().catch((error) => {
  console.error('[linear-package] Failed:', error);
  process.exit(1);
});
