import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const jobsPath = join(repoRoot, 'docs', 'operations', 'openclaw-agent-army-jobs.json');
const jsonReportPath = join(
  repoRoot,
  'docs',
  'operations',
  'openclaw-agent-army-dispatch-report.json'
);
const mdReportPath = join(repoRoot, 'docs', 'operations', 'openclaw-agent-army-dispatch-report.md');
const historyReportDir = join(repoRoot, 'logs', 'openclaw-agent-army');
const defaultBridgeScript = join(repoRoot, 'scripts', 'openclaw-codex-bridge.mjs');
const STRICT_JSON_PREFIX =
  'Respond with ONLY a valid JSON object. Do not include markdown, explanations, headings, or code fences. Required keys: taskTitle (string), generatedCount (number), failedCount (number), skippedCount (number), blockers (string[]), notes (string[]).';

function parseArgs() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const strictStructuredOutput = !args.includes('--allow-unstructured');
  const limitIndex = args.indexOf('--limit');
  const startIndex = args.indexOf('--start');
  const retriesIndex = args.indexOf('--max-retries');

  const limitRaw = limitIndex >= 0 ? args[limitIndex + 1] : undefined;
  const startRaw = startIndex >= 0 ? args[startIndex + 1] : undefined;
  const retriesRaw = retriesIndex >= 0 ? args[retriesIndex + 1] : undefined;
  const limit = Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : null;
  const start = Number.isFinite(Number(startRaw)) ? Math.max(0, Number(startRaw)) : 0;
  const maxRetries = Number.isFinite(Number(retriesRaw)) ? Math.max(0, Number(retriesRaw)) : 2;

  return {
    execute,
    strictStructuredOutput,
    limit,
    start,
    maxRetries
  };
}

function extractAssistantMessage(stdout) {
  const lines = stdout
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.reverse()) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type === 'item.completed' && typeof parsed?.item?.text === 'string') {
        return parsed.item.text;
      }
    } catch {
      // ignore non-json lines
    }
  }

  return null;
}

function extractJsonCandidate(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf('{');
  if (start < 0) {
    return null;
  }

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseStructuredSummary(assistantMessage) {
  if (typeof assistantMessage !== 'string' || assistantMessage.trim().length === 0) {
    return {
      ok: false,
      error: 'Missing assistant message payload.'
    };
  }

  const candidate = extractJsonCandidate(assistantMessage) ?? assistantMessage.trim();
  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    return {
      ok: false,
      error: `Assistant message did not contain parseable JSON summary (${error.message}).`
    };
  }

  const generatedCount = Number(parsed?.generatedCount);
  const failedCount = Number(parsed?.failedCount);
  const skippedCount = Number(parsed?.skippedCount);
  const blockers = Array.isArray(parsed?.blockers)
    ? parsed.blockers.map((item) => String(item))
    : typeof parsed?.blockers === 'string'
      ? [parsed.blockers]
      : [];
  const notes = Array.isArray(parsed?.notes)
    ? parsed.notes.map((item) => String(item))
    : typeof parsed?.notes === 'string'
      ? [parsed.notes]
      : [];

  const hasRequiredFields =
    typeof parsed?.taskTitle === 'string' &&
    Number.isFinite(generatedCount) &&
    Number.isFinite(failedCount) &&
    Number.isFinite(skippedCount);

  if (!hasRequiredFields) {
    return {
      ok: false,
      error:
        'JSON summary missing required keys/types. Expected taskTitle:string, generatedCount:number, failedCount:number, skippedCount:number, blockers:string[], notes:string[].'
    };
  }

  return {
    ok: true,
    summary: {
      taskTitle: parsed.taskTitle,
      generatedCount,
      failedCount,
      skippedCount,
      blockers,
      notes
    }
  };
}

function runBridgePrompt(prompt) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [defaultBridgeScript, 'exec', '--json', prompt], {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr
      });
    });
  });
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# OpenClaw Agent Army Dispatch Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Strict structured output: ${report.strictStructuredOutput}`);
  lines.push(`Max retries: ${report.maxRetries}`);
  lines.push(`Jobs considered: ${report.jobsConsidered}`);
  lines.push(`Jobs selected: ${report.jobsSelected}`);
  lines.push(`Executed: ${report.executed}`);
  lines.push(`Succeeded: ${report.succeeded}`);
  lines.push(`Failed: ${report.failed}`);
  lines.push('');
  lines.push('## Job Results');

  if (report.results.length === 0) {
    lines.push('- none');
  } else {
    for (const result of report.results) {
      const status = result.status.toUpperCase();
      lines.push(`- [${status}] ${result.id} :: ${result.taskTitle} (${result.botId})`);
      lines.push(`  Attempts: ${result.attempts}`);
      if (result.summary) {
        lines.push(
          `  Summary: generated=${result.summary.generatedCount} failed=${result.summary.failedCount} skipped=${result.summary.skippedCount}`
        );
      }
      if (result.errorSummary) {
        lines.push(`  Error: ${result.errorSummary}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const raw = await readFile(jobsPath, 'utf8');
  const jobsDoc = JSON.parse(raw);
  const jobs = Array.isArray(jobsDoc.jobs) ? jobsDoc.jobs : [];

  const sliced = jobs.slice(
    options.start,
    options.limit ? options.start + options.limit : undefined
  );
  const mode = options.execute ? 'execute' : 'dry-run';

  const results = [];

  for (const job of sliced) {
    if (!options.execute) {
      results.push({
        id: job.id,
        taskTitle: job.taskTitle,
        botId: job.botId,
        status: 'queued',
        errorSummary: null,
        assistantMessage: null
      });
      continue;
    }

    const prompt = options.strictStructuredOutput
      ? `${STRICT_JSON_PREFIX}\n\n${job.prompt}`
      : job.prompt;

    let attempts = 0;
    let response = null;
    let assistantMessage = null;
    let parsedSummary = { ok: false, error: 'No response parsed.' };
    let status = 'failed';
    let errorSummary = null;

    while (attempts <= options.maxRetries) {
      attempts += 1;
      response = await runBridgePrompt(prompt);
      assistantMessage = extractAssistantMessage(response.stdout);
      parsedSummary = parseStructuredSummary(assistantMessage);

      const isStructuredPass = !options.strictStructuredOutput || parsedSummary.ok;
      status = response.ok && isStructuredPass ? 'success' : 'failed';
      errorSummary = response.ok
        ? parsedSummary.ok
          ? null
          : parsedSummary.error
        : (response.stderr || response.stdout || 'OpenClaw bridge returned a non-zero exit code.')
            .split(/\r?\n/g)
            .filter(Boolean)
            .slice(0, 4)
            .join(' | ');

      if (status === 'success') {
        break;
      }
    }

    results.push({
      id: job.id,
      taskTitle: job.taskTitle,
      botId: job.botId,
      status,
      attempts,
      exitCode: response?.code ?? null,
      errorSummary,
      assistantMessage,
      summary: parsedSummary.ok ? parsedSummary.summary : null
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    strictStructuredOutput: options.strictStructuredOutput,
    maxRetries: options.maxRetries,
    jobsConsidered: jobs.length,
    jobsSelected: sliced.length,
    executed: results.filter((item) => item.status !== 'queued').length,
    succeeded: results.filter((item) => item.status === 'success').length,
    failed: results.filter((item) => item.status === 'failed').length,
    results
  };

  const runId = report.generatedAt.replace(/[:.]/g, '-');
  const historyJsonPath = join(historyReportDir, `dispatch-${runId}.json`);
  const historyMdPath = join(historyReportDir, `dispatch-${runId}.md`);

  await Promise.all([
    mkdir(join(repoRoot, 'docs', 'operations'), { recursive: true }),
    mkdir(historyReportDir, { recursive: true })
  ]);
  await Promise.all([
    writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(mdReportPath, toMarkdown(report), 'utf8'),
    writeFile(historyJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(historyMdPath, toMarkdown(report), 'utf8')
  ]);

  console.log(`[openclaw-agent-army] mode=${mode}`);
  console.log(`[openclaw-agent-army] strictStructuredOutput=${options.strictStructuredOutput}`);
  console.log(`[openclaw-agent-army] maxRetries=${options.maxRetries}`);
  console.log(`[openclaw-agent-army] jobs=${report.jobsSelected}/${report.jobsConsidered}`);
  console.log(`[openclaw-agent-army] succeeded=${report.succeeded} failed=${report.failed}`);
  console.log(`[openclaw-agent-army] ${jsonReportPath}`);
  console.log(`[openclaw-agent-army] ${mdReportPath}`);
  console.log(`[openclaw-agent-army] ${historyJsonPath}`);
  console.log(`[openclaw-agent-army] ${historyMdPath}`);

  if (options.execute && report.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[openclaw-agent-army] Failed:', error);
  process.exit(1);
});
