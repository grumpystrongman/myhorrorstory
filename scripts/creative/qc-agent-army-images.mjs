import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import {
  buildVerifiedCatalog,
  filterPlanAssets,
  generateRealAsset,
  loadPlanAssets,
  outputPathForAsset,
  repoRoot,
  writeStatusLedger
} from './lib/agent-army-real-assets.mjs';
import { scanImageForTextArtifacts, terminateImageQaWorker } from './lib/agent-army-image-qa.mjs';

const reportJsonPath = `${repoRoot}/docs/operations/agent-army-image-text-qa-report.json`;
const reportMdPath = `${repoRoot}/docs/operations/agent-army-image-text-qa-report.md`;
const LOCAL_FALLBACK_TOOL = 'local-playwright-art-director';

function parseArgs() {
  const args = process.argv.slice(2);

  function valueOf(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  }

  const limitRaw = valueOf('--limit');
  const timeoutRaw = valueOf('--timeout-ms');
  const retriesRaw = valueOf('--max-retries');

  return {
    storyId: valueOf('--story') ?? null,
    assetId: valueOf('--asset-id') ?? null,
    imageBackend: valueOf('--image-backend') ?? 'auto',
    fix: args.includes('--fix'),
    limit: Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : null,
    timeoutMs: Number.isFinite(Number(timeoutRaw)) ? Math.max(15_000, Number(timeoutRaw)) : 60_000,
    maxRetries: Number.isFinite(Number(retriesRaw)) ? Math.max(1, Number(retriesRaw)) : 1
  };
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push('# Agent Army Image Text QA Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Story filter: ${report.filters.storyId ?? 'none'}`);
  lines.push(`Asset filter: ${report.filters.assetId ?? 'none'}`);
  lines.push(`Fix mode: ${report.filters.fix}`);
  lines.push(`Image backend: ${report.filters.imageBackend}`);
  lines.push(`Limit: ${report.filters.limit ?? 'none'}`);
  lines.push(`Timeout: ${report.filters.timeoutMs}ms`);
  lines.push(`Max retries: ${report.filters.maxRetries}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Selected image assets: ${report.totals.selected}`);
  lines.push(`- Scanned image assets: ${report.totals.scanned}`);
  lines.push(`- Flagged for readable text: ${report.totals.flagged}`);
  lines.push(`- Regenerated successfully: ${report.totals.fixed}`);
  lines.push(`- Regeneration failures: ${report.totals.fixFailed}`);
  lines.push('');
  lines.push('## Flagged Assets');
  if (report.flaggedAssets.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of report.flaggedAssets) {
      lines.push(`- ${entry.assetId} :: ${entry.storyId}`);
      lines.push(`  File: ${entry.file}`);
      lines.push(`  Tokens: ${entry.tokens.join(', ') || 'none'}`);
      lines.push(`  OCR confidence: ${Number(entry.confidence ?? 0).toFixed(2)}`);
      lines.push(`  Fix status: ${entry.fixStatus}`);
      if (entry.fixError) {
        lines.push(`  Fix error: ${entry.fixError}`);
      }
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const planAssets = await loadPlanAssets();
  const selectedImages = filterPlanAssets(planAssets, {
    storyId: options.storyId,
    assetId: options.assetId,
    modality: 'image'
  }).filter((asset) => !options.limit || asset.id);

  const limitedImages =
    options.limit && options.limit > 0 ? selectedImages.slice(0, options.limit) : selectedImages;

  const flaggedAssets = [];
  const resultsToWrite = [];
  let scanned = 0;
  let fixed = 0;
  let fixFailed = 0;

  try {
    for (const asset of limitedImages) {
      const outputPath = outputPathForAsset(asset);
      const metadataPath = `${outputPath}.meta.json`;

      try {
        const [outputStat, metadataRaw] = await Promise.all([stat(outputPath), readFile(metadataPath, 'utf8')]);
        if (outputStat.size <= 0) {
          continue;
        }

        const metadata = JSON.parse(metadataRaw);
        if (metadata.generatedProxy === true) {
          continue;
        }
        if ((metadata.tool_used ?? metadata.toolUsed) === LOCAL_FALLBACK_TOOL) {
          continue;
        }
      } catch {
        continue;
      }

      scanned += 1;
      const scan = await scanImageForTextArtifacts(outputPath);
      if (!scan.foundText) {
        continue;
      }

      const flagged = {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        file: relative(repoRoot, outputPath).replaceAll('\\', '/'),
        confidence: Number(scan.confidence ?? 0),
        tokens: scan.tokens.slice(0, 8).map((token) => token.text),
        fixStatus: options.fix ? 'pending' : 'not-requested',
        fixError: null
      };

      if (options.fix) {
        const result = await generateRealAsset(asset, {
          regenerate: true,
          timeoutMs: options.timeoutMs,
          maxRetries: options.maxRetries,
          imageBackend: options.imageBackend,
          runContext: `image-text-qa-fix:${new Date().toISOString()}`
        });
        resultsToWrite.push(result);
        if (result.status === 'generated') {
          fixed += 1;
          flagged.fixStatus = 'regenerated';
        } else {
          fixFailed += 1;
          flagged.fixStatus = result.status;
          flagged.fixError = result.error ?? 'regeneration failed';
        }
      }

      flaggedAssets.push(flagged);
    }
  } finally {
    await terminateImageQaWorker().catch(() => {});
  }

  if (resultsToWrite.length > 0) {
    await writeStatusLedger(resultsToWrite);
  }

  const catalog = await buildVerifiedCatalog(planAssets);
  const report = {
    generatedAt: new Date().toISOString(),
    filters: options,
    totals: {
      selected: limitedImages.length,
      scanned,
      flagged: flaggedAssets.length,
      fixed,
      fixFailed
    },
    flaggedAssets,
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

  console.log(`[agent-army:image-qa] ${reportJsonPath}`);
  console.log(`[agent-army:image-qa] ${reportMdPath}`);
  console.log(
    `[agent-army:image-qa] scanned=${scanned} flagged=${flaggedAssets.length} fixed=${fixed} fixFailed=${fixFailed}`
  );

  if (fixFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[agent-army:image-qa] Failed:', error);
  process.exit(1);
});
