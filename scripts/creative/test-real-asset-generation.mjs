import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import {
  filterPlanAssets,
  loadPlanAssets,
  outputPathForAsset,
  repoRoot,
  validateFileForAsset
} from './lib/agent-army-real-assets.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const storyIndex = args.indexOf('--story');
  const storyId = storyIndex >= 0 ? args[storyIndex + 1] : 'static-between-stations';
  return {
    storyId: storyId ?? 'static-between-stations'
  };
}

function runMaterializer(storyId) {
  const commandArgs = [
    'scripts/creative/materialize-agent-army-assets.mjs',
    '--story',
    storyId,
    '--modality',
    'image',
    '--limit',
    '3',
    '--max-retries',
    '1',
    '--timeout-ms',
    '45000',
    '--regenerate'
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, commandArgs, {
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

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          command: `${process.execPath} ${commandArgs.join(' ')}`,
          stdout,
          stderr
        });
        return;
      }
      reject(new Error(stderr || `materializer failed with exit code ${code}`));
    });
  });
}

async function main() {
  const { storyId } = parseArgs();
  const run = await runMaterializer(storyId);
  const assets = filterPlanAssets(await loadPlanAssets(), {
    storyId,
    modality: 'image',
    limit: 3,
    start: 0
  });

  const validations = [];
  for (const asset of assets) {
    const outputPath = outputPathForAsset(asset);
    const outputStat = await stat(outputPath);
    const validation = await validateFileForAsset(asset, outputPath);
    validations.push({
      assetId: asset.id,
      file: relative(repoRoot, outputPath).replaceAll('\\', '/'),
      fileSize: outputStat.size,
      validation
    });
  }

  const manifestPath = join(
    repoRoot,
    'apps',
    'web',
    'public',
    'agent-army',
    'manifests',
    `${storyId}.json`
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  console.log(`COMMAND=${run.command}`);
  console.log(`OUTPUT_DIR=apps/web/public/agent-army/stories/${storyId}/image`);
  console.log(`FILENAMES=${validations.map((item) => item.file).join(', ')}`);
  console.log(`VALIDATION=${JSON.stringify(validations, null, 2)}`);
  console.log(
    `UI_MANIFEST_ASSETS=${JSON.stringify(
      manifest.assets
        .filter((asset) => validations.some((item) => item.assetId === asset.asset_id))
        .map((asset) => ({
          asset_id: asset.asset_id,
          public_path: asset.public_path,
          thumbnail: asset.public_thumbnail_path
        })),
      null,
      2
    )}`
  );
}

main().catch((error) => {
  console.error('[test-real-asset-generation] Failed:', error);
  process.exit(1);
});
