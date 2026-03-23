import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import {
  buildVerifiedCatalog,
  generateRealAsset,
  loadPlanAssets,
  repoRoot,
  writeStatusLedger
} from './lib/agent-army-real-assets.mjs';

const catalogPath = `${repoRoot}/apps/web/public/agent-army/catalog.json`;
const reportJsonPath = `${repoRoot}/docs/operations/agent-army-image-regeneration-report.json`;
const reportMdPath = `${repoRoot}/docs/operations/agent-army-image-regeneration-report.md`;

function parseArgs() {
  const args = process.argv.slice(2);

  function valueOf(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  }

  const concurrencyRaw = valueOf('--concurrency');
  const limitRaw = valueOf('--limit');
  const timeoutRaw = valueOf('--timeout-ms');
  const retriesRaw = valueOf('--max-retries');

  return {
    storyId: valueOf('--story') ?? null,
    imageBackend: valueOf('--image-backend') ?? 'auto',
    concurrency: Number.isFinite(Number(concurrencyRaw)) ? Math.max(1, Number(concurrencyRaw)) : 2,
    limit: Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : null,
    timeoutMs: Number.isFinite(Number(timeoutRaw)) ? Math.max(30_000, Number(timeoutRaw)) : 120_000,
    maxRetries: Number.isFinite(Number(retriesRaw)) ? Math.max(1, Number(retriesRaw)) : 1
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Commercial Image Regeneration Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Story filter: ${report.storyId ?? 'none'}`);
  lines.push(`Image backend: ${report.imageBackend}`);
  lines.push(`Concurrency: ${report.concurrency}`);
  lines.push(`Limit: ${report.limit ?? 'none'}`);
  lines.push(`Timeout: ${report.timeoutMs}ms`);
  lines.push(`Max retries: ${report.maxRetries}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Targeted failures: ${report.targeted}`);
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Failed: ${report.failed}`);
  lines.push(`- Skipped existing: ${report.skippedExisting}`);
  lines.push('');
  lines.push('## Results');
  if (report.results.length === 0) {
    lines.push('- none');
  } else {
    for (const result of report.results) {
      lines.push(
        `- ${result.assetId} :: ${result.status} :: ${result.outputPathRelative}${result.error ? ` :: ${result.error}` : ''}`
      );
    }
  }
  lines.push('');
  lines.push('## Catalog Totals');
  lines.push(`- Stories: ${report.catalogTotals.stories}`);
  lines.push(`- Complete assets: ${report.catalogTotals.completeAssets}`);
  lines.push(`- Failed assets: ${report.catalogTotals.failedAssets}`);
  lines.push(`- Invalid assets: ${report.catalogTotals.invalidAssets}`);
  lines.push(`- Missing assets: ${report.catalogTotals.missingAssets}`);
  lines.push(`- Unavailable assets: ${report.catalogTotals.unavailableAssets}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const runContext = `commercial-image-regeneration:${new Date().toISOString()}`;
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const allAssets = await loadPlanAssets();
  const planById = new Map(allAssets.map((asset) => [asset.id, asset]));

  const targetedFailures = catalog.stories
    .filter((story) => !options.storyId || story.storyId === options.storyId)
    .flatMap((story) =>
      story.failures.filter(
        (failure) =>
          failure.modality === 'image' &&
          (failure.generation_status === 'invalid' || failure.generation_status === 'failed')
      )
    )
    .slice(0, options.limit ?? undefined);

  const targetAssets = targetedFailures
    .map((failure) => planById.get(failure.asset_id))
    .filter(Boolean);

  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < targetAssets.length) {
      const index = cursor;
      cursor += 1;
      const asset = targetAssets[index];
      const result = await generateRealAsset(asset, {
        regenerate: true,
        imageBackend: options.imageBackend,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        runContext
      });
      results[index] = result;
      console.log(
        `[commercial-image-regeneration] ${result.status} :: ${asset.id} -> ${result.outputPath}${result.error ? ` :: ${result.error}` : ''}`
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, Math.max(1, targetAssets.length)) }, () => worker())
  );

  await writeStatusLedger(results);
  const updatedCatalog = await buildVerifiedCatalog(allAssets);

  const report = {
    generatedAt: new Date().toISOString(),
    storyId: options.storyId,
    imageBackend: options.imageBackend,
    concurrency: options.concurrency,
    limit: options.limit,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    targeted: targetAssets.length,
    generated: results.filter((item) => item.status === 'generated').length,
    failed: results.filter((item) => item.status === 'failed').length,
    skippedExisting: results.filter((item) => item.status === 'skipped_existing').length,
    results: results.map((result) => ({
      assetId: result.assetId,
      storyId: result.storyId,
      status: result.status,
      outputPathRelative: relative(repoRoot, result.outputPath).replaceAll('\\', '/'),
      error: result.error ?? null,
      toolUsed: result.toolUsed ?? null
    })),
    catalogTotals: updatedCatalog.totals
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await Promise.all([
    writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(reportMdPath, toMarkdown(report), 'utf8')
  ]);

  console.log(`[commercial-image-regeneration] ${reportJsonPath}`);
  console.log(`[commercial-image-regeneration] ${reportMdPath}`);

  if (report.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[commercial-image-regeneration] Failed:', error);
  process.exit(1);
});
