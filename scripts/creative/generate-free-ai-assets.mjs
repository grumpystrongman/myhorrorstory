import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, 'assets', 'manifests', 'commercial-creative-plan.json');
const webPreviewRoot = join(repoRoot, 'apps', 'web', 'public', 'creative');

function chooseDimensions(assetType) {
  switch (assetType) {
    case 'character_portrait':
      return { width: 768, height: 1024 };
    case 'social_creative':
      return { width: 1080, height: 1080 };
    case 'promo_image':
      return { width: 1200, height: 628 };
    case 'evidence_image':
      return { width: 1400, height: 900 };
    default:
      return { width: 1600, height: 900 };
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function looksLikeImage(buffer) {
  if (buffer.length < 12) {
    return false;
  }

  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp =
    String.fromCharCode(...buffer.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...buffer.subarray(8, 12)) === 'WEBP';

  return isPng || isJpeg || isWebp;
}

function runCurlDownload(url, outputPath) {
  return new Promise((resolve) => {
    const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const child = spawn(curlBinary, ['-L', '--silent', '--show-error', '--max-time', '12', url, '-o', outputPath], {
      cwd: repoRoot,
      stdio: 'ignore'
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });
    child.on('error', () => {
      resolve(false);
    });
  });
}

function resolveSourceOutput(asset) {
  const declared = join(repoRoot, asset.outputKey);
  return declared.endsWith('.png') ? declared : `${declared}.png`;
}

function resolvePreviewOutput(asset) {
  const previewScope = asset.storyId ? join('stories', asset.storyId) : 'website';
  return join(webPreviewRoot, previewScope, `${asset.id}.png`);
}

async function generateAsset(asset) {
  const sourceFile = resolveSourceOutput(asset);
  const previewFile = resolvePreviewOutput(asset);
  await mkdir(dirname(previewFile), { recursive: true });

  const { width, height } = chooseDimensions(asset.type);
  const prompt = encodeURIComponent(asset.prompt);
  const seed = hashString(`${asset.id}:${asset.revision}`) % 100000;
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  const tempFile = `${previewFile}.tmp`;

  const downloaded = await runCurlDownload(url, tempFile);
  let usedProvider = 'pollinations-free';
  let status = 'generated';

  if (downloaded) {
    try {
      const bytes = await readFile(tempFile);
      if (!looksLikeImage(bytes)) {
        throw new Error('downloaded payload was not an image');
      }
      await writeFile(previewFile, bytes);
    } catch {
      status = 'fallback';
      usedProvider = 'local-fallback';
      await copyFile(sourceFile, previewFile);
    }
  } else {
    status = 'fallback';
    usedProvider = 'local-fallback';
    await copyFile(sourceFile, previewFile);
  }

  await unlink(tempFile).catch(() => {});

  await writeFile(
    `${previewFile}.ai-meta.json`,
    JSON.stringify(
      {
        id: asset.id,
        prompt: asset.prompt,
        attemptedProvider: 'pollinations-free',
        usedProvider,
        status,
        generatedAt: new Date().toISOString(),
        sourceFallback: sourceFile
      },
      null,
      2
    ),
    'utf8'
  );

  return { id: asset.id, status, usedProvider };
}

async function main() {
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const assets = manifest.assets ?? [];

  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : assets.length;
  const selectedAssets = assets.slice(0, Number.isFinite(limit) ? limit : assets.length);

  let generated = 0;
  let fallback = 0;
  for (const asset of selectedAssets) {
    const result = await generateAsset(asset);
    if (result.status === 'generated') {
      generated += 1;
    } else {
      fallback += 1;
    }
    console.log(`[free-ai-assets] ${result.id} -> ${result.status} (${result.usedProvider})`);
  }

  console.log(
    `[free-ai-assets] Completed ${selectedAssets.length} assets. generated=${generated} fallback=${fallback}`
  );
}

main().catch((error) => {
  console.error('[free-ai-assets] Failed:', error);
  process.exit(1);
});
