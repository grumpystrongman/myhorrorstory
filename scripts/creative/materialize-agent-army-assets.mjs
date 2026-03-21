import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import {
  buildVerifiedCatalog,
  filterPlanAssets,
  generateRealAsset,
  loadPlanAssets,
  planPath,
  repoRoot,
  statusLedgerPath,
  writeStatusLedger
} from './lib/agent-army-real-assets.mjs';

const reportJsonPath = `${repoRoot}/docs/operations/agent-army-materialization-report.json`;
const reportMdPath = `${repoRoot}/docs/operations/agent-army-materialization-report.md`;

function parseArgs() {
  const args = process.argv.slice(2);

  function valueOf(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  }

  const limitRaw = valueOf('--limit');
  const startRaw = valueOf('--start');
  const timeoutRaw = valueOf('--timeout-ms');
  const retriesRaw = valueOf('--max-retries');
  const concurrencyRaw = valueOf('--concurrency');

  return {
    storyId: valueOf('--story') ?? null,
    assetId: valueOf('--asset-id') ?? null,
    modality: valueOf('--modality') ?? null,
    scope: valueOf('--scope') ?? null,
    imageBackend: valueOf('--image-backend') ?? 'auto',
    regenerate: args.includes('--regenerate'),
    start: Number.isFinite(Number(startRaw)) ? Math.max(0, Number(startRaw)) : 0,
    limit: Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : null,
    timeoutMs: Number.isFinite(Number(timeoutRaw)) ? Math.max(15_000, Number(timeoutRaw)) : 45_000,
    maxRetries: Number.isFinite(Number(retriesRaw)) ? Math.max(1, Number(retriesRaw)) : 1,
    concurrency: Number.isFinite(Number(concurrencyRaw)) ? Math.max(1, Number(concurrencyRaw)) : null
  };
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push('# Agent Army Real Asset Materialization Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Plan: ${report.planPath}`);
  lines.push(`Status ledger: ${report.statusLedgerPath}`);
  lines.push(`Story filter: ${report.filters.storyId ?? 'none'}`);
  lines.push(`Asset filter: ${report.filters.assetId ?? 'none'}`);
  lines.push(`Modality filter: ${report.filters.modality ?? 'none'}`);
  lines.push(`Scope filter: ${report.filters.scope ?? 'none'}`);
  lines.push(`Image backend: ${report.filters.imageBackend}`);
  lines.push(`Start: ${report.filters.start}`);
  lines.push(`Limit: ${report.filters.limit ?? 'none'}`);
  lines.push(`Regenerate: ${report.filters.regenerate}`);
  lines.push(`Timeout: ${report.filters.timeoutMs}ms`);
  lines.push(`Max retries: ${report.filters.maxRetries}`);
  lines.push(`Concurrency: ${report.filters.concurrency}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Planned assets: ${report.planned}`);
  lines.push(`- Selected assets: ${report.selected}`);
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Skipped existing: ${report.skippedExisting}`);
  lines.push(`- Failed: ${report.failed}`);
  lines.push(`- Unavailable: ${report.unavailable}`);
  lines.push('');
  lines.push('## By Modality');
  for (const [modality, summary] of Object.entries(report.byModality)) {
    lines.push(
      `- ${modality}: selected=${summary.selected} generated=${summary.generated} skipped=${summary.skipped} failed=${summary.failed} unavailable=${summary.unavailable}`
    );
  }
  lines.push('');
  lines.push('## Issues');
  if (report.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of report.issues) {
      lines.push(
        `- ${issue.assetId} (${issue.modality}) :: ${issue.status} :: ${issue.outputPathRelative}`
      );
      lines.push(`  Error: ${issue.error}`);
    }
  }
  lines.push('');
  lines.push('## Catalog Totals');
  lines.push(`- Stories: ${report.catalog.totals.stories}`);
  lines.push(`- Complete assets: ${report.catalog.totals.completeAssets}`);
  lines.push(`- Missing assets: ${report.catalog.totals.missingAssets}`);
  lines.push(`- Invalid assets: ${report.catalog.totals.invalidAssets}`);
  lines.push(`- Failed assets: ${report.catalog.totals.failedAssets}`);
  lines.push(`- Unavailable assets: ${report.catalog.totals.unavailableAssets}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const runContext = `materialize-real-assets:${new Date().toISOString()}`;
  const allAssets = await loadPlanAssets();
  const selectedAssets = filterPlanAssets(allAssets, options);
  const results = [];
  const concurrency =
    options.concurrency ??
    (options.modality === 'image' && options.imageBackend === 'openai' ? 3 : 1);

  let cursor = 0;
  async function worker() {
    while (cursor < selectedAssets.length) {
      const index = cursor;
      cursor += 1;
      const asset = selectedAssets[index];
      const result = await generateRealAsset(asset, {
        regenerate: options.regenerate,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        imageBackend: options.imageBackend,
        runContext
      });
      results[index] = result;
      console.log(
        `[agent-army:materialize] ${result.status} :: ${asset.id} (${asset.modality}) -> ${result.outputPath}`
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, selectedAssets.length)) }, () => worker()));

  await writeStatusLedger(results);
  const catalog = await buildVerifiedCatalog(allAssets);

  const byModality = {};
  for (const asset of selectedAssets) {
    byModality[asset.modality] ??= {
      selected: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
      unavailable: 0
    };
    byModality[asset.modality].selected += 1;
  }

  for (const result of results) {
    const summary = byModality[result.modality];
    if (!summary) {
      continue;
    }
    if (result.status === 'generated') {
      summary.generated += 1;
    } else if (result.status === 'skipped_existing') {
      summary.skipped += 1;
    } else if (result.status === 'unavailable') {
      summary.unavailable += 1;
    } else if (result.status === 'failed') {
      summary.failed += 1;
    }
  }

  const issues = results
    .filter((item) => item.status === 'failed' || item.status === 'unavailable')
    .map((item) => ({
      assetId: item.assetId,
      modality: item.modality,
      status: item.status,
      outputPathRelative: relative(repoRoot, item.outputPath).replaceAll('\\', '/'),
      error: item.error ?? 'unknown error'
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    planPath: relative(repoRoot, planPath).replaceAll('\\', '/'),
    statusLedgerPath: relative(repoRoot, statusLedgerPath).replaceAll('\\', '/'),
    filters: options,
    planned: allAssets.length,
    selected: selectedAssets.length,
    generated: results.filter((item) => item.status === 'generated').length,
    skippedExisting: results.filter((item) => item.status === 'skipped_existing').length,
    failed: results.filter((item) => item.status === 'failed').length,
    unavailable: results.filter((item) => item.status === 'unavailable').length,
    byModality,
    issues,
    catalog: {
      generatedAt: catalog.generatedAt,
      totals: catalog.totals
    }
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await Promise.all([
    writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(reportMdPath, toMarkdownReport(report), 'utf8')
  ]);

  console.log(`[agent-army:materialize] ${reportJsonPath}`);
  console.log(`[agent-army:materialize] ${reportMdPath}`);

  if (report.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[agent-army:materialize] Failed:', error);
  process.exit(1);
});
