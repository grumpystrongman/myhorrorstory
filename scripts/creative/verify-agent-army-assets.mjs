import { access, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, 'assets', 'manifests', 'commercial-agent-army-plan.json');
const reportJsonPath = join(
  repoRoot,
  'docs',
  'operations',
  'openclaw-agent-army-output-verification.json'
);
const reportMdPath = join(repoRoot, 'docs', 'operations', 'openclaw-agent-army-output-verification.md');

const MIN_SIZE_BY_MODALITY = {
  image: 3_000,
  audio: 24_000,
  video: 8_000,
  artifact: 400,
  web: 800
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    failOnInvalid: !args.includes('--allow-invalid')
  };
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push('# OpenClaw Agent Army Output Verification');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Plan path: ${report.planPath}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Assets planned: ${report.totals.assets}`);
  lines.push(`- Existing outputs: ${report.totals.existing}`);
  lines.push(`- Missing outputs: ${report.totals.missing}`);
  lines.push(`- Invalid outputs: ${report.totals.invalid}`);
  lines.push('');
  lines.push('## By Modality');
  for (const [modality, count] of Object.entries(report.byModality)) {
    lines.push(`- ${modality}: ${count}`);
  }
  lines.push('');
  lines.push('## Missing By Modality');
  for (const [modality, count] of Object.entries(report.byModalityMissing)) {
    lines.push(`- ${modality}: ${count}`);
  }
  lines.push('');
  lines.push('## Invalid By Modality');
  for (const [modality, count] of Object.entries(report.byModalityInvalid)) {
    lines.push(`- ${modality}: ${count}`);
  }
  lines.push('');
  lines.push('## Missing Sample');
  if (report.missingSample.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.missingSample) {
      lines.push(`- ${item}`);
    }
  }
  lines.push('');
  lines.push('## Invalid Sample');
  if (report.invalidSample.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.invalidSample) {
      lines.push(`- ${item.outputKey} :: ${item.reason}`);
    }
  }
  lines.push('');
  lines.push('## Status');
  lines.push(report.totals.missing === 0 && report.totals.invalid === 0 ? '- PASS' : '- FAIL');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();

  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];

  const byModality = {};
  const byModalityMissing = {};
  const byModalityInvalid = {};
  const missing = [];
  const invalid = [];

  for (const asset of assets) {
    byModality[asset.modality] = (byModality[asset.modality] ?? 0) + 1;

    const outputPath = join(repoRoot, asset.outputKey);
    const metadataPath = `${outputPath}.meta.json`;
    const outputExists = await exists(outputPath);
    const metadataExists = await exists(metadataPath);

    if (!outputExists) {
      byModalityMissing[asset.modality] = (byModalityMissing[asset.modality] ?? 0) + 1;
      missing.push(asset.outputKey);
      continue;
    }

    const outputStat = await stat(outputPath);
    if (!metadataExists) {
      byModalityInvalid[asset.modality] = (byModalityInvalid[asset.modality] ?? 0) + 1;
      invalid.push({
        outputKey: asset.outputKey,
        reason: 'missing metadata sidecar'
      });
      continue;
    }

    const minimumSize = MIN_SIZE_BY_MODALITY[asset.modality] ?? 128;
    if (outputStat.size < minimumSize) {
      byModalityInvalid[asset.modality] = (byModalityInvalid[asset.modality] ?? 0) + 1;
      invalid.push({
        outputKey: asset.outputKey,
        reason: `file too small (${outputStat.size} bytes, expected >= ${minimumSize})`
      });
      continue;
    }
  }

  const existing = assets.length - missing.length;
  const report = {
    generatedAt: new Date().toISOString(),
    planPath: relative(repoRoot, manifestPath).replaceAll('\\', '/'),
    totals: {
      assets: assets.length,
      existing,
      missing: missing.length,
      invalid: invalid.length
    },
    byModality,
    byModalityMissing,
    byModalityInvalid,
    missingSample: missing.slice(0, 120),
    invalidSample: invalid.slice(0, 120)
  };

  await Promise.all([
    writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(reportMdPath, toMarkdownReport(report), 'utf8')
  ]);

  console.log(`[agent-army:verify] ${reportJsonPath}`);
  console.log(`[agent-army:verify] ${reportMdPath}`);
  console.log(
    `[agent-army:verify] existing=${existing} missing=${missing.length} invalid=${invalid.length}`
  );

  if (options.failOnInvalid && (missing.length > 0 || invalid.length > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[agent-army:verify] Failed:', error);
  process.exit(1);
});
