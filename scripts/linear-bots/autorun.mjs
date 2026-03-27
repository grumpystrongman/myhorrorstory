import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { LinearClient } from './lib/linear-client.mjs';
import { createLinearClientCredentialsToken } from './lib/oauth-client.mjs';
import { inferBotIdForIssue } from './lib/planner.mjs';

const BOT_PIPELINES = {
  'AI-Executive-Orchestrator': ['corepack pnpm linear:bots:apply'],
  'AI-Product-Agent': ['corepack pnpm linear:bots:apply'],
  'AI-UX-UI-Agent': ['corepack pnpm --filter @myhorrorstory/design-tokens build', 'corepack pnpm --filter @myhorrorstory/ui build'],
  'AI-Web-App-Agent': ['corepack pnpm --filter @myhorrorstory/web build'],
  'AI-Mobile-App-Agent': ['corepack pnpm --filter @myhorrorstory/mobile build'],
  'AI-Backend-Agent': ['corepack pnpm --filter @myhorrorstory/api build', 'corepack pnpm --filter @myhorrorstory/worker build'],
  'AI-Story-Engine-Agent': ['corepack pnpm stories:build-compendium', 'corepack pnpm stories:build-drama'],
  'AI-Media-Pipeline-Agent': [
    'corepack pnpm creative:build-plan',
    'corepack pnpm creative:generate-visuals',
    'corepack pnpm creative:materialize-assets',
    'corepack pnpm creative:validate-visuals'
  ],
  'AI-Voice-Audio-Agent': ['corepack pnpm voice:build-drama', 'node scripts/generate-score-placeholders.mjs'],
  'AI-Admin-Ops-Agent': ['corepack pnpm --filter @myhorrorstory/admin build'],
  'AI-Growth-CRM-Agent': ['corepack pnpm --filter @myhorrorstory/email build', 'corepack pnpm --filter @myhorrorstory/crm build'],
  'AI-QA-Test-Agent': ['corepack pnpm test:commercial'],
  'AI-Security-Compliance-Agent': ['node scripts/validate-baseline.mjs'],
  'AI-DevOps-Release-Agent': ['corepack pnpm build', 'corepack pnpm test'],
  'AI-Commercial-Success-Agent': ['corepack pnpm linear:bots:dispatch-package']
};

const DEFAULT_PIPELINE = ['corepack pnpm linear:bots:apply'];
const AUTO_REPORT_PATH = join('docs', 'operations', 'linear-autorun-report.md');
const AUTO_STATE_PATH = join('docs', 'operations', 'linear-autorun-state.json');
const AUTO_LOG_DIR = join('logs', 'linear-autorun');

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function parseInteger(input, fallback) {
  const parsed = Number.parseInt(String(input), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const hasArg = (flag) => args.includes(flag);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const intervalSeconds = parseInteger(
    getArg('--interval') ?? process.env.LINEAR_AUTORUN_INTERVAL_SECONDS ?? 60,
    60
  );
  const maxPerCycle = parseInteger(
    getArg('--max-per-cycle') ?? process.env.LINEAR_AUTORUN_MAX_PER_CYCLE ?? 2,
    2
  );

  return {
    once: hasArg('--once'),
    dryRun: hasArg('--dry-run'),
    includeStarted: !hasArg('--unstarted-only'),
    retryFailed: process.env.LINEAR_AUTORUN_RETRY_FAILED !== 'false',
    intervalSeconds,
    maxPerCycle,
    manageStates: process.env.LINEAR_AUTORUN_MANAGE_STATES !== 'false',
    completeOnSuccess: process.env.LINEAR_AUTORUN_COMPLETE_ON_SUCCESS !== 'false',
    teamKey: getArg('--team') ?? process.env.LINEAR_TEAM_KEY?.trim() ?? null
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

async function loadState(statePath) {
  try {
    const raw = await readFile(statePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      startedAt: new Date().toISOString(),
      cycleCount: 0,
      issues: {},
      runs: []
    };
  }
}

async function saveState(statePath, state) {
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildWorkFingerprint(issue) {
  const payload = {
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? '',
    labels: [...(issue.labels ?? [])].sort(),
    priority: issue.priority ?? 0,
    assigneeId: issue.assigneeId ?? null
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function selectPipeline(botId) {
  return BOT_PIPELINES[botId] ?? DEFAULT_PIPELINE;
}

function shouldRunIssue(issue, stateEntry, retryFailed) {
  if (!stateEntry) {
    return true;
  }

  if (stateEntry.status === 'running') {
    return false;
  }

  const currentFingerprint = buildWorkFingerprint(issue);
  if (stateEntry.workFingerprint !== currentFingerprint) {
    return true;
  }

  if (retryFailed && stateEntry.status === 'failed') {
    return true;
  }

  return false;
}

function getIssueSortValue(issue) {
  const priority = Number.isFinite(issue.priority) ? issue.priority : 0;
  const createdAt = issue.createdAt ? Date.parse(issue.createdAt) : 0;
  return priority * 10000000000000 - createdAt;
}

async function runCommand(command, context) {
  const { cwd, env, issueIdentifier, runToken } = context;
  const logFile = join(AUTO_LOG_DIR, `${issueIdentifier}-${runToken}.log`);
  await mkdir(AUTO_LOG_DIR, { recursive: true });
  const stream = createWriteStream(logFile, { flags: 'a', encoding: 'utf8' });
  const startedAt = new Date().toISOString();
  stream.write(`[${startedAt}] $ ${command}\n`);

  const child = spawn(command, {
    cwd,
    env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    stream.write(chunk.toString());
  });
  child.stderr.on('data', (chunk) => {
    stream.write(chunk.toString());
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });

  stream.write(`\n[${new Date().toISOString()}] exit_code=${exitCode}\n`);
  await new Promise((resolve) => stream.end(resolve));

  return {
    exitCode,
    logFile
  };
}

async function setIssueStateByType(client, workflowStateByType, issueId, stateType) {
  const target = workflowStateByType.get(stateType);
  if (!target?.id) {
    return false;
  }
  await client.updateIssueState(issueId, target.id);
  return true;
}

function buildRunComment({ success, issue, botId, commands, dryRun, logFile }) {
  const status = success ? 'completed' : 'failed';
  const commandList = commands.map((command) => `- \`${command}\``).join('\n');
  const logLine = logFile ? `\n- Log: \`${logFile}\`` : '';
  return [
    `Auto-runner ${status} for ${issue.identifier}.`,
    `- Bot routing: \`${botId}\``,
    `- Mode: \`${dryRun ? 'dry-run' : 'apply'}\``,
    '- Commands:',
    commandList + logLine
  ].join('\n');
}

function buildMarkdownReport({ options, team, viewer, queuedCount, processed, skipped, failed, state }) {
  const lines = [];
  lines.push('# Linear Auto-Run Report');
  lines.push('');
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push(`Team: ${team.key} (${team.name})`);
  lines.push(`Viewer: ${viewer.email}`);
  lines.push(`Mode: ${options.dryRun ? 'dry-run' : 'apply'}`);
  lines.push(`Interval: ${options.intervalSeconds}s`);
  lines.push(`Cycle count: ${state.cycleCount}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Issues queued this cycle: ${queuedCount}`);
  lines.push(`- Processed: ${processed.length}`);
  lines.push(`- Skipped: ${skipped.length}`);
  lines.push(`- Failed: ${failed.length}`);
  lines.push('');
  lines.push('## Processed Issues');
  if (processed.length === 0) {
    lines.push('- none');
  } else {
    for (const item of processed) {
      lines.push(`- ${item.issueIdentifier}: ${item.status} via ${item.botId}`);
    }
  }
  lines.push('');
  lines.push('## Skipped Issues');
  if (skipped.length === 0) {
    lines.push('- none');
  } else {
    for (const item of skipped) {
      lines.push(`- ${item.issueIdentifier}: ${item.reason}`);
    }
  }
  lines.push('');
  lines.push('## Last Failed Issues');
  if (failed.length === 0) {
    lines.push('- none');
  } else {
    for (const item of failed) {
      lines.push(`- ${item.issueIdentifier}: ${item.error}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function executeCycle({ client, team, viewer, options, workflowStateByType, state }) {
  const stateTypes = options.includeStarted ? ['backlog', 'unstarted', 'started'] : ['backlog', 'unstarted'];
  const issues = await client.listIssues({
    teamId: team.id,
    assigneeId: viewer.id,
    includeCompleted: false,
    includeCanceled: false,
    stateTypes
  });

  const sortedIssues = [...issues].sort((a, b) => getIssueSortValue(b) - getIssueSortValue(a));

  const processed = [];
  const skipped = [];
  const failed = [];
  let processedCount = 0;

  for (const issue of sortedIssues) {
    const previous = state.issues[issue.id];
    if (processedCount >= options.maxPerCycle) {
      skipped.push({
        issueIdentifier: issue.identifier,
        reason: `throttled (max-per-cycle=${options.maxPerCycle})`
      });
      continue;
    }

    if (!shouldRunIssue(issue, previous, options.retryFailed)) {
      skipped.push({
        issueIdentifier: issue.identifier,
        reason: 'already processed'
      });
      continue;
    }

    const botId = inferBotIdForIssue(issue);
    const commands = selectPipeline(botId);
    const runToken = Date.now().toString(36);
    const workFingerprint = buildWorkFingerprint(issue);

    state.issues[issue.id] = {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      status: 'running',
      botId,
      workFingerprint,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      runCount: (previous?.runCount ?? 0) + 1,
      lastError: null,
      lastLogFile: previous?.lastLogFile ?? null
    };
    await saveState(AUTO_STATE_PATH, state);

    let success = true;
    let errorMessage = null;
    let logFile = null;
    try {
      if (!options.dryRun) {
        if (options.manageStates && (issue.stateType === 'backlog' || issue.stateType === 'unstarted')) {
          await setIssueStateByType(client, workflowStateByType, issue.id, 'started');
        }

        const env = {
          ...process.env,
          LINEAR_CURRENT_ISSUE_ID: issue.id,
          LINEAR_CURRENT_ISSUE_IDENTIFIER: issue.identifier,
          LINEAR_CURRENT_ISSUE_TITLE: issue.title,
          LINEAR_CURRENT_BOT: botId
        };
        for (const command of commands) {
          const commandResult = await runCommand(command, {
            cwd: process.cwd(),
            env,
            issueIdentifier: issue.identifier,
            runToken
          });
          logFile = commandResult.logFile;
          if (commandResult.exitCode !== 0) {
            throw new Error(`Command failed (${commandResult.exitCode}): ${command}`);
          }
        }

        if (options.manageStates && options.completeOnSuccess) {
          await setIssueStateByType(client, workflowStateByType, issue.id, 'completed');
        }

        await client.addCommentToIssue(
          issue.id,
          buildRunComment({
            success: true,
            issue,
            botId,
            commands,
            dryRun: false,
            logFile
          })
        );
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      if (!options.dryRun) {
        await client.addCommentToIssue(
          issue.id,
          buildRunComment({
            success: false,
            issue,
            botId,
            commands,
            dryRun: false,
            logFile
          })
        );
      }
    }

    state.issues[issue.id] = {
      ...state.issues[issue.id],
      status: success ? 'completed' : 'failed',
      finishedAt: new Date().toISOString(),
      lastError: errorMessage,
      lastLogFile: logFile
    };

    const runSummary = {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      botId,
      status: success ? 'completed' : 'failed',
      dryRun: options.dryRun,
      commands,
      startedAt: state.issues[issue.id].startedAt,
      finishedAt: state.issues[issue.id].finishedAt,
      logFile,
      error: errorMessage
    };

    state.runs.unshift(runSummary);
    state.runs = state.runs.slice(0, 1000);
    await saveState(AUTO_STATE_PATH, state);

    processed.push({
      issueIdentifier: issue.identifier,
      botId,
      status: success ? 'completed' : 'failed'
    });
    if (!success) {
      failed.push({
        issueIdentifier: issue.identifier,
        error: errorMessage
      });
    }
    processedCount += 1;
  }

  return {
    queuedCount: sortedIssues.length,
    processed,
    skipped,
    failed
  };
}

async function buildWorkflowStateMap(client, teamId) {
  const states = await client.listWorkflowStates(teamId);
  const byType = new Map();
  for (const state of states) {
    if (!byType.has(state.type)) {
      byType.set(state.type, state);
    }
  }
  return byType;
}

async function main() {
  const options = parseArgs();
  const tokenResolution = await resolveLinearToken();
  if (!options.teamKey || !tokenResolution.token) {
    throw new Error(
      'LINEAR_TEAM_KEY and Linear token credentials are required. Set LINEAR_ACCESS_TOKEN or LINEAR_API_KEY.'
    );
  }

  await mkdir(join(process.cwd(), 'docs', 'operations'), { recursive: true });
  await mkdir(join(process.cwd(), 'logs'), { recursive: true });

  const client = new LinearClient(tokenResolution.token);
  const team = await client.getTeamByKey(options.teamKey);
  if (!team?.id) {
    throw new Error(`Team not found for LINEAR_TEAM_KEY=${options.teamKey}`);
  }

  const viewer = await client.getViewer();
  if (!viewer?.id) {
    throw new Error('Failed to resolve viewer identity from Linear token.');
  }

  const workflowStateByType = options.manageStates ? await buildWorkflowStateMap(client, team.id) : new Map();
  const state = await loadState(AUTO_STATE_PATH);
  state.team = { id: team.id, key: team.key, name: team.name };
  state.viewer = { id: viewer.id, email: viewer.email, name: viewer.name };
  state.authSource = tokenResolution.source;
  state.mode = options.dryRun ? 'dry-run' : 'apply';

  const cycle = async () => {
    state.cycleCount = (state.cycleCount ?? 0) + 1;
    const cycleResult = await executeCycle({
      client,
      team,
      viewer,
      options,
      workflowStateByType,
      state
    });

    state.lastCycleAt = new Date().toISOString();
    await saveState(AUTO_STATE_PATH, state);
    await writeFile(
      AUTO_REPORT_PATH,
      buildMarkdownReport({
        options,
        team,
        viewer,
        queuedCount: cycleResult.queuedCount,
        processed: cycleResult.processed,
        skipped: cycleResult.skipped,
        failed: cycleResult.failed,
        state
      }),
      'utf8'
    );

    const completedCount = cycleResult.processed.filter((item) => item.status === 'completed').length;
    const failedCount = cycleResult.failed.length;
    console.log(
      `[linear-autorun] cycle=${state.cycleCount} queued=${cycleResult.queuedCount} completed=${completedCount} failed=${failedCount} skipped=${cycleResult.skipped.length}`
    );
  };

  await cycle();

  if (options.once) {
    return;
  }

  while (true) {
    await delay(options.intervalSeconds * 1000);
    await cycle();
  }
}

main().catch((error) => {
  console.error('[linear-autorun] Failed:', error);
  process.exit(1);
});
