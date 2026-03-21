import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, 'assets', 'manifests', 'commercial-agent-army-plan.json');
const reportJsonPath = join(repoRoot, 'docs', 'operations', 'agent-army-materialization-report.json');
const reportMdPath = join(repoRoot, 'docs', 'operations', 'agent-army-materialization-report.md');
const publicMirrorRoot = join(repoRoot, 'apps', 'web', 'public', 'agent-army');
let ffmpegBinary = process.env.FFMPEG_BIN ?? ffmpegStatic;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const startIndex = args.indexOf('--start');
  const modalityIndex = args.indexOf('--modality');
  const regenerate = args.includes('--regenerate');

  const limitRaw = limitIndex >= 0 ? Number(args[limitIndex + 1]) : null;
  const startRaw = startIndex >= 0 ? Number(args[startIndex + 1]) : 0;
  const modalityRaw = modalityIndex >= 0 ? String(args[modalityIndex + 1] ?? '').trim() : '';

  return {
    regenerate,
    start: Number.isFinite(startRaw) ? Math.max(0, Math.floor(startRaw)) : 0,
    limit: Number.isFinite(limitRaw) ? Math.max(1, Math.floor(limitRaw)) : null,
    modality: modalityRaw.length > 0 ? modalityRaw : null
  };
}

function hashHex(value) {
  return createHash('sha1').update(value).digest('hex');
}

function colorFromHashPair(hash, offset) {
  const input = Number.parseInt(hash.slice(offset, offset + 2), 16);
  const channel = 40 + (input % 120);
  return channel.toString(16).padStart(2, '0');
}

function paletteForAsset(assetId) {
  const hash = hashHex(assetId);
  const base = `${colorFromHashPair(hash, 0)}${colorFromHashPair(hash, 2)}${colorFromHashPair(
    hash,
    4
  )}`;
  const accent = `${colorFromHashPair(hash, 6)}${colorFromHashPair(hash, 8)}${colorFromHashPair(
    hash,
    10
  )}`;
  return { base, accent, hash };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeDimensions(inputWidth, inputHeight, maxSide) {
  const width = Number.isFinite(Number(inputWidth)) ? Math.max(64, Number(inputWidth)) : maxSide;
  const height = Number.isFinite(Number(inputHeight))
    ? Math.max(64, Number(inputHeight))
    : Math.floor((maxSide * 9) / 16);

  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxSide / longest;
  return {
    width: Math.max(64, Math.round(width * scale)),
    height: Math.max(64, Math.round(height * scale))
  };
}

function runFfmpeg(args) {
  return new Promise((resolve) => {
    const child = spawn(ffmpegBinary, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        code: null,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        stderr
      });
    });
  });
}

function runNodeScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        code: null,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        stderr
      });
    });
  });
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureFfmpegBinary() {
  if (!ffmpegBinary) {
    throw new Error('ffmpeg binary not available from ffmpeg-static.');
  }

  if (await exists(ffmpegBinary)) {
    return;
  }

  // ffmpeg-static may skip install in lockfile-only environments. Trigger install explicitly.
  const installerPath = join(repoRoot, 'node_modules', 'ffmpeg-static', 'install.js');
  if (!(await exists(installerPath))) {
    throw new Error(`ffmpeg binary missing at ${ffmpegBinary} and installer not found at ${installerPath}`);
  }

  const installResult = await runNodeScript(installerPath);
  if (!installResult.ok) {
    throw new Error(
      `ffmpeg-static install failed (${installResult.code ?? 'unknown'}): ${installResult.stderr}`
    );
  }

  ffmpegBinary = process.env.FFMPEG_BIN ?? ffmpegStatic;
  if (!ffmpegBinary || !(await exists(ffmpegBinary))) {
    throw new Error(`ffmpeg binary still missing after install: ${String(ffmpegBinary)}`);
  }
}

async function writeMetadata(outputPath, metadata) {
  const metadataPath = `${outputPath}.meta.json`;
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
}

async function mirrorIntoPublic(outputPath) {
  const relativeOutput = relative(join(repoRoot, 'assets', 'production', 'agent-army'), outputPath);
  if (relativeOutput.startsWith('..')) {
    return null;
  }

  const targetPath = join(publicMirrorRoot, relativeOutput);
  await mkdir(dirname(targetPath), { recursive: true });
  const bytes = await readFile(outputPath);
  await writeFile(targetPath, bytes);
  return targetPath;
}

async function generateImage(asset, outputPath, runContext) {
  const palette = paletteForAsset(asset.id);
  const dimensions = normalizeDimensions(asset.specs?.width, asset.specs?.height, 1280);
  const noise = 8 + (Number.parseInt(palette.hash.slice(12, 14), 16) % 12);

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x${palette.base}:s=${dimensions.width}x${dimensions.height}:d=1`,
    '-frames:v',
    '1',
    '-vf',
    `noise=alls=${noise}:allf=t+u,eq=contrast=1.08:saturation=0.84`,
    '-y',
    outputPath
  ];

  const result = await runFfmpeg(args);
  if (!result.ok) {
    return {
      ok: false,
      error: `ffmpeg image generation failed (${result.code ?? 'unknown'}): ${result.stderr}`
    };
  }

  const outputStat = await stat(outputPath);
  await writeMetadata(outputPath, {
    id: asset.id,
    title: asset.title,
    modality: asset.modality,
    category: asset.category,
    scope: asset.scope,
    outputKey: asset.outputKey,
    specs: asset.specs,
    generatedProxy: true,
    runContext,
    renderer: {
      type: 'ffmpeg-color-noise',
      ffmpegBinary,
      width: dimensions.width,
      height: dimensions.height,
      baseColor: `#${palette.base}`,
      accentColor: `#${palette.accent}`
    },
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    providerChain: asset.providerChain,
    qualityGates: asset.qualityGates,
    generatedAt: new Date().toISOString()
  });

  await mirrorIntoPublic(outputPath);

  return {
    ok: true,
    bytes: outputStat.size
  };
}

async function generateAudio(asset, outputPath, runContext) {
  const palette = paletteForAsset(asset.id);
  const frequency = 120 + (Number.parseInt(palette.hash.slice(0, 2), 16) % 260);
  const duration = clamp(
    Number.isFinite(Number(asset.specs?.durationSeconds)) ? Number(asset.specs.durationSeconds) : 8,
    2,
    8
  );
  const sampleRate = 48000;

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=${frequency}:sample_rate=${sampleRate}:duration=${duration}`,
    '-f',
    'lavfi',
    '-i',
    `anoisesrc=color=pink:amplitude=0.010:duration=${duration}:sample_rate=${sampleRate}`,
    '-filter_complex',
    '[0:a][1:a]amix=inputs=2:weights=1 0.22,volume=0.44',
    '-ar',
    String(sampleRate),
    '-ac',
    String(asset.specs?.channels === 1 ? 1 : 2),
    '-c:a',
    'pcm_s16le',
    '-y',
    outputPath
  ];

  const result = await runFfmpeg(args);
  if (!result.ok) {
    return {
      ok: false,
      error: `ffmpeg audio generation failed (${result.code ?? 'unknown'}): ${result.stderr}`
    };
  }

  const outputStat = await stat(outputPath);
  await writeMetadata(outputPath, {
    id: asset.id,
    title: asset.title,
    modality: asset.modality,
    category: asset.category,
    scope: asset.scope,
    outputKey: asset.outputKey,
    specs: asset.specs,
    generatedProxy: true,
    runContext,
    renderer: {
      type: 'ffmpeg-sine-noise',
      ffmpegBinary,
      frequencyHz: frequency,
      durationSeconds: duration,
      sampleRateHz: sampleRate
    },
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    providerChain: asset.providerChain,
    qualityGates: asset.qualityGates,
    generatedAt: new Date().toISOString()
  });

  await mirrorIntoPublic(outputPath);

  return {
    ok: true,
    bytes: outputStat.size
  };
}

async function generateVideo(asset, outputPath, runContext) {
  const palette = paletteForAsset(asset.id);
  const dimensions = normalizeDimensions(asset.specs?.width, asset.specs?.height, 640);
  const duration = clamp(
    Number.isFinite(Number(asset.specs?.durationSeconds)) ? Number(asset.specs.durationSeconds) : 6,
    2,
    4
  );
  const noise = 10 + (Number.parseInt(palette.hash.slice(14, 16), 16) % 14);
  const fps = clamp(Number(asset.specs?.fps) || 24, 12, 24);

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x${palette.base}:s=${dimensions.width}x${dimensions.height}:d=${duration}:r=${fps}`,
    '-vf',
    `noise=alls=${noise}:allf=t+u,eq=contrast=1.06:saturation=0.78`,
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-r',
    String(fps),
    '-t',
    String(duration),
    '-y',
    outputPath
  ];

  const result = await runFfmpeg(args);
  if (!result.ok) {
    return {
      ok: false,
      error: `ffmpeg video generation failed (${result.code ?? 'unknown'}): ${result.stderr}`
    };
  }

  const outputStat = await stat(outputPath);
  await writeMetadata(outputPath, {
    id: asset.id,
    title: asset.title,
    modality: asset.modality,
    category: asset.category,
    scope: asset.scope,
    outputKey: asset.outputKey,
    specs: asset.specs,
    generatedProxy: true,
    runContext,
    renderer: {
      type: 'ffmpeg-color-noise-video',
      ffmpegBinary,
      width: dimensions.width,
      height: dimensions.height,
      durationSeconds: duration,
      fps,
      baseColor: `#${palette.base}`,
      accentColor: `#${palette.accent}`
    },
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    providerChain: asset.providerChain,
    qualityGates: asset.qualityGates,
    generatedAt: new Date().toISOString()
  });

  await mirrorIntoPublic(outputPath);

  return {
    ok: true,
    bytes: outputStat.size
  };
}

async function generateArtifact(asset, outputPath, runContext) {
  const content = [
    `# ${asset.title}`,
    '',
    `Asset ID: \`${asset.id}\``,
    `Scope: \`${asset.scope}\``,
    asset.storyId ? `Story: \`${asset.storyId}\`` : 'Story: website',
    `Category: \`${asset.category}\``,
    '',
    '## Prompt',
    asset.prompt,
    '',
    '## Negative Prompt',
    asset.negativePrompt,
    '',
    '## Quality Gates',
    ...asset.qualityGates.map((gate) => `- ${gate}`),
    '',
    '## Provider Chain',
    ...asset.providerChain.map((provider) => `- ${provider}`),
    '',
    '## Notes',
    'Proxy artifact generated for commercial pipeline continuity. Replace with authored final content before release.',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Run Context: ${runContext}`
  ].join('\n');

  await writeFile(outputPath, `${content}\n`, 'utf8');
  const outputStat = await stat(outputPath);

  await writeMetadata(outputPath, {
    id: asset.id,
    title: asset.title,
    modality: asset.modality,
    category: asset.category,
    scope: asset.scope,
    outputKey: asset.outputKey,
    generatedProxy: true,
    runContext,
    renderer: {
      type: 'markdown-template'
    },
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    providerChain: asset.providerChain,
    qualityGates: asset.qualityGates,
    generatedAt: new Date().toISOString()
  });

  await mirrorIntoPublic(outputPath);

  return {
    ok: true,
    bytes: outputStat.size
  };
}

async function generateWeb(asset, outputPath, runContext) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${asset.title}</title>
    <style>
      :root {
        --bg-0: #120f16;
        --bg-1: #1b1520;
        --ink-0: #efe7da;
        --ink-1: #d6c8b1;
        --line: rgba(255, 255, 255, 0.16);
        --accent: #9b6f45;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink-0);
        background:
          radial-gradient(circle at 12% 18%, rgba(164, 120, 79, 0.28), transparent 40%),
          radial-gradient(circle at 88% 74%, rgba(57, 74, 96, 0.30), transparent 44%),
          linear-gradient(145deg, var(--bg-0), var(--bg-1));
      }
      main {
        width: min(960px, 92vw);
        border: 1px solid var(--line);
        background: rgba(8, 8, 12, 0.72);
        border-radius: 16px;
        padding: 24px;
        backdrop-filter: blur(8px);
      }
      h1 { margin-top: 0; letter-spacing: 0.03em; }
      p { color: var(--ink-1); line-height: 1.65; }
      .row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
      .btn {
        border: 1px solid rgba(255, 255, 255, 0.24);
        color: var(--ink-0);
        background: linear-gradient(180deg, rgba(155, 111, 69, 0.34), rgba(155, 111, 69, 0.12));
        border-radius: 999px;
        padding: 10px 16px;
      }
      .meta {
        margin-top: 16px;
        border-top: 1px solid var(--line);
        padding-top: 14px;
        font-size: 0.92rem;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${asset.title}</h1>
      <p>${asset.prompt.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>
      <div class="row">
        <button class="btn">Investigate</button>
        <button class="btn">Archive</button>
        <button class="btn">Escalate</button>
      </div>
      <section class="meta">
        <p><strong>Asset:</strong> <code>${asset.id}</code></p>
        <p><strong>Category:</strong> ${asset.category}</p>
        <p><strong>Scope:</strong> ${asset.scope}${asset.storyId ? ` / ${asset.storyId}` : ''}</p>
        <p><strong>Run:</strong> ${runContext}</p>
      </section>
    </main>
  </body>
</html>
`;

  await writeFile(outputPath, html, 'utf8');
  const outputStat = await stat(outputPath);
  await writeMetadata(outputPath, {
    id: asset.id,
    title: asset.title,
    modality: asset.modality,
    category: asset.category,
    scope: asset.scope,
    outputKey: asset.outputKey,
    generatedProxy: true,
    runContext,
    renderer: {
      type: 'html-template'
    },
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    providerChain: asset.providerChain,
    qualityGates: asset.qualityGates,
    generatedAt: new Date().toISOString()
  });

  await mirrorIntoPublic(outputPath);

  return {
    ok: true,
    bytes: outputStat.size
  };
}

async function materializeAsset(asset, options, runContext) {
  const outputPath = join(repoRoot, asset.outputKey);
  await mkdir(dirname(outputPath), { recursive: true });

  if (!options.regenerate) {
    try {
      await stat(outputPath);
      return {
        id: asset.id,
        outputPath,
        modality: asset.modality,
        status: 'skipped_existing',
        bytes: 0
      };
    } catch {
      // continue
    }
  }

  let result;
  if (asset.modality === 'image') {
    result = await generateImage(asset, outputPath, runContext);
  } else if (asset.modality === 'audio') {
    result = await generateAudio(asset, outputPath, runContext);
  } else if (asset.modality === 'video') {
    result = await generateVideo(asset, outputPath, runContext);
  } else if (asset.modality === 'artifact') {
    result = await generateArtifact(asset, outputPath, runContext);
  } else if (asset.modality === 'web') {
    result = await generateWeb(asset, outputPath, runContext);
  } else {
    await writeFile(outputPath, `Unsupported modality: ${asset.modality}\n`, 'utf8');
    const outputStat = await stat(outputPath);
    result = { ok: true, bytes: outputStat.size };
  }

  if (!result.ok) {
    return {
      id: asset.id,
      outputPath,
      modality: asset.modality,
      status: 'failed',
      bytes: 0,
      error: result.error
    };
  }

  return {
    id: asset.id,
    outputPath,
    modality: asset.modality,
    status: 'generated',
    bytes: result.bytes
  };
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push('# Agent Army Materialization Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Manifest: ${report.manifestPath}`);
  lines.push(`FFmpeg: ${report.ffmpegBinary}`);
  lines.push(`Start index: ${report.start}`);
  lines.push(`Limit: ${report.limit ?? 'none'}`);
  lines.push(`Modality filter: ${report.modality ?? 'none'}`);
  lines.push(`Regenerate existing: ${report.regenerate}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Planned assets: ${report.planned}`);
  lines.push(`- Selected assets: ${report.selected}`);
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Skipped existing: ${report.skippedExisting}`);
  lines.push(`- Failed: ${report.failed}`);
  lines.push(`- Bytes generated: ${report.bytesGenerated.toLocaleString()}`);
  lines.push('');
  lines.push('## By Modality');
  for (const [modality, summary] of Object.entries(report.byModality)) {
    lines.push(
      `- ${modality}: selected=${summary.selected} generated=${summary.generated} skipped=${summary.skipped} failed=${summary.failed}`
    );
  }
  lines.push('');
  lines.push('## Failures');
  if (report.failures.length === 0) {
    lines.push('- none');
  } else {
    for (const failure of report.failures) {
      lines.push(`- ${failure.id} (${failure.modality})`);
      lines.push(`  Path: ${failure.outputPath}`);
      lines.push(`  Error: ${failure.error}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await ensureFfmpegBinary();

  const options = parseArgs();
  const runContext = `materialize-agent-army-assets:${new Date().toISOString()}`;

  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const allAssets = Array.isArray(manifest.assets) ? manifest.assets : [];

  const filteredByModality = options.modality
    ? allAssets.filter((asset) => asset.modality === options.modality)
    : allAssets;
  const selected = filteredByModality.slice(
    options.start,
    options.limit ? options.start + options.limit : undefined
  );

  const results = [];
  for (const asset of selected) {
    const result = await materializeAsset(asset, options, runContext);
    results.push(result);
    console.log(`[agent-army:materialize] ${result.status} :: ${asset.id} (${asset.modality})`);
  }

  const byModality = {};
  for (const asset of selected) {
    if (!byModality[asset.modality]) {
      byModality[asset.modality] = {
        selected: 0,
        generated: 0,
        skipped: 0,
        failed: 0
      };
    }
    byModality[asset.modality].selected += 1;
  }

  for (const result of results) {
    if (!byModality[result.modality]) {
      continue;
    }
    if (result.status === 'generated') {
      byModality[result.modality].generated += 1;
    } else if (result.status === 'skipped_existing') {
      byModality[result.modality].skipped += 1;
    } else if (result.status === 'failed') {
      byModality[result.modality].failed += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    manifestPath: relative(repoRoot, manifestPath),
    ffmpegBinary,
    start: options.start,
    limit: options.limit,
    modality: options.modality,
    regenerate: options.regenerate,
    planned: allAssets.length,
    selected: selected.length,
    generated: results.filter((item) => item.status === 'generated').length,
    skippedExisting: results.filter((item) => item.status === 'skipped_existing').length,
    failed: results.filter((item) => item.status === 'failed').length,
    bytesGenerated: results
      .filter((item) => item.status === 'generated')
      .reduce((total, item) => total + item.bytes, 0),
    byModality,
    failures: results
      .filter((item) => item.status === 'failed')
      .map((item) => ({
        id: item.id,
        modality: item.modality,
        outputPath: relative(repoRoot, item.outputPath),
        error: item.error ?? 'unknown error'
      }))
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await Promise.all([
    writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8'),
    writeFile(reportMdPath, toMarkdownReport(report), 'utf8')
  ]);

  console.log(`[agent-army:materialize] report: ${reportJsonPath}`);
  console.log(`[agent-army:materialize] report: ${reportMdPath}`);

  if (report.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[agent-army:materialize] Failed:', error);
  process.exit(1);
});
