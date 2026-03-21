import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import {
  buildVerifiedCatalog,
  filterPlanAssets,
  loadPlanAssets,
  planPath,
  repoRoot,
  statusLedgerPath
} from './lib/agent-army-real-assets.mjs';

const reportJsonPath = `${repoRoot}/docs/operations/openclaw-agent-army-output-verification.json`;
const reportMdPath = `${repoRoot}/docs/operations/openclaw-agent-army-output-verification.md`;

function parseArgs() {
  const args = process.argv.slice(2);

  function valueOf(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  }

  return {
    storyId: valueOf('--story') ?? null,
    assetId: valueOf('--asset-id') ?? null,
    modality: valueOf('--modality') ?? null,
    scope: valueOf('--scope') ?? null,
    allowInvalid: args.includes('--allow-invalid')
  };
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push('# OpenClaw Agent Army Output Verification');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Plan path: ${report.planPath}`);
  lines.push(`Status ledger: ${report.statusLedgerPath}`);
  lines.push(`Story filter: ${report.filters.storyId ?? 'none'}`);
  lines.push(`Asset filter: ${report.filters.assetId ?? 'none'}`);
  lines.push(`Modality filter: ${report.filters.modality ?? 'none'}`);
  lines.push(`Scope filter: ${report.filters.scope ?? 'none'}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Assets planned: ${report.totals.assets}`);
  lines.push(`- Complete assets: ${report.totals.complete}`);
  lines.push(`- Missing assets: ${report.totals.missing}`);
  lines.push(`- Invalid assets: ${report.totals.invalid}`);
  lines.push(`- Failed assets: ${report.totals.failed}`);
  lines.push(`- Unavailable assets: ${report.totals.unavailable}`);
  lines.push('');
  lines.push('## Failure Sample');
  if (report.failureSample.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.failureSample) {
      lines.push(
        `- ${item.story_id} :: ${item.asset_id} (${item.modality}) -> ${item.generation_status} :: ${item.error}`
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const allAssets = await loadPlanAssets();
  const selectedAssets = filterPlanAssets(allAssets, {
    storyId: options.storyId,
    assetId: options.assetId,
    modality: options.modality,
    scope: options.scope
  });
  const catalog = await buildVerifiedCatalog(allAssets);

  const selectedIds = new Set(selectedAssets.map((asset) => asset.id));
  const selectedStories = catalog.stories
    .map((story) => ({
      ...story,
      assets: story.assets.filter((asset) => selectedIds.has(asset.asset_id)),
      failures: story.failures.filter((asset) => selectedIds.has(asset.asset_id))
    }))
    .filter((story) => story.assets.length > 0 || story.failures.length > 0);

  const completeCount = selectedStories.reduce((total, story) => total + story.assets.length, 0);
  const failures = selectedStories.flatMap((story) => story.failures);
  const missing = failures.filter((item) => item.generation_status === 'missing').length;
  const invalid = failures.filter((item) => item.generation_status === 'invalid').length;
  const failed = failures.filter((item) => item.generation_status === 'failed').length;
  const unavailable = failures.filter((item) => item.generation_status === 'unavailable').length;

  const report = {
    generatedAt: new Date().toISOString(),
    planPath: relative(repoRoot, planPath).replaceAll('\\', '/'),
    statusLedgerPath: relative(repoRoot, statusLedgerPath).replaceAll('\\', '/'),
    filters: options,
    totals: {
      assets: selectedAssets.length,
      complete: completeCount,
      missing,
      invalid,
      failed,
      unavailable
    },
    failureSample: failures.slice(0, 200)
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await Promise.all([
    writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(reportMdPath, toMarkdownReport(report), 'utf8')
  ]);

  console.log(`[agent-army:verify] ${reportJsonPath}`);
  console.log(`[agent-army:verify] ${reportMdPath}`);
  console.log(
    `[agent-army:verify] complete=${completeCount} missing=${missing} invalid=${invalid} failed=${failed} unavailable=${unavailable}`
  );

  if (!options.allowInvalid && missing + invalid + failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[agent-army:verify] Failed:', error);
  process.exit(1);
});
