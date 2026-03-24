import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import ffmpegStatic from 'ffmpeg-static';
import { chromium } from '@playwright/test';

const repoRoot = process.cwd();
const defaultStoryId = 'static-between-stations';
const defaultHost = '127.0.0.1';
const defaultPort = 3200;

const rawCaptureDir = join(repoRoot, 'assets', 'production', 'playthrough-capture', 'raw');
const outputDir = join(repoRoot, 'assets', 'production', 'playthrough-capture', 'final');
const narrationDir = join(repoRoot, 'assets', 'production', 'playthrough-capture', 'narration');
const reportsDir = join(repoRoot, 'docs', 'simulations');

function parseArgs(argv) {
  const parsed = {
    storyId: defaultStoryId,
    host: defaultHost,
    port: defaultPort,
    maxSteps: 48,
    outputName: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      continue;
    }
    const next = argv[index + 1];
    if ((token === '--story' || token === '--story-id') && next) {
      parsed.storyId = String(next);
      index += 1;
      continue;
    }
    if (token === '--host' && next) {
      parsed.host = String(next);
      index += 1;
      continue;
    }
    if (token === '--port' && next) {
      parsed.port = Number(next);
      index += 1;
      continue;
    }
    if (token === '--max-steps' && next) {
      parsed.maxSteps = Math.max(8, Number(next) || parsed.maxSteps);
      index += 1;
      continue;
    }
    if (token === '--output-name' && next) {
      parsed.outputName = String(next);
      index += 1;
      continue;
    }
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || (process.env[key] ?? '').trim().length > 0) {
      continue;
    }
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(join(repoRoot, '.env.local'));
loadEnvFile(join(repoRoot, '.env'));

function reasonForChoice(choiceLabel) {
  const normalized = String(choiceLabel).toLowerCase();
  if (normalized.includes('verify') || normalized.includes('audit') || normalized.includes('cross-check')) {
    return 'it secures chain-of-custody before escalation can contaminate the record';
  }
  if (normalized.includes('stabilize') || normalized.includes('witness') || normalized.includes('interview')) {
    return 'preserving witness trust improves later testimony reliability';
  }
  if (normalized.includes('shadow') || normalized.includes('covert') || normalized.includes('silent')) {
    return 'a low-noise branch can reveal motive without triggering immediate retaliation';
  }
  if (normalized.includes('force') || normalized.includes('immediate')) {
    return 'high-pressure pushes can unlock time-critical clues, but increase danger exposure';
  }
  if (normalized.includes('public') || normalized.includes('publish')) {
    return 'controlled disclosure can corner the antagonist, at reputational risk';
  }
  return 'it balances forward momentum with evidence integrity under uncertain threat pressure';
}

function parseCampaignDay(value) {
  const match = String(value ?? '').match(/Campaign Day:\s*(\d+)/i);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

async function waitForServer(url, timeoutMs = 240000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // Continue polling.
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for server readiness at ${url}`);
}

async function isServerReachable(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!(response.ok || response.status === 404)) {
      return false;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return false;
    }
    const body = await response.text();
    return /MyHorrorStory|Play Session|Signal Runtime/i.test(body);
  } catch {
    return false;
  }
}

function startWebServer({ host, port }) {
  const args = ['pnpm', '--filter', '@myhorrorstory/web', 'exec', 'next', 'dev', '-p', String(port), '-H', host];
  let child = null;
  if (process.platform === 'win32') {
    const commandLine = `corepack ${args.join(' ')}`;
    child = spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: process.env
    });
  } else {
    child = spawn('corepack', args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: process.env
    });
  }

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[walkthrough:web] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[walkthrough:web] ${chunk}`);
  });

  return child;
}

async function safeTerminate(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform === 'win32') {
    await new Promise((resolvePromise) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: false
      });
      killer.on('close', () => resolvePromise());
      killer.on('error', () => resolvePromise());
    });
    return;
  }
  child.kill('SIGTERM');
  await sleep(2000);
  if (!child.killed) {
    child.kill('SIGKILL');
  }
}

function toAbsolutePathIfExists(pathValue) {
  if (!pathValue) {
    return null;
  }
  const normalized = resolve(pathValue);
  return existsSync(normalized) ? normalized : null;
}

function pickStoryAudioAssets(storyId) {
  const manifestPath = join(repoRoot, 'apps', 'web', 'public', 'agent-army', 'manifests', `${storyId}.json`);
  if (!existsSync(manifestPath)) {
    return {
      themePath: null,
      voicePaths: []
    };
  }

  const storyManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const assets = Array.isArray(storyManifest.assets) ? storyManifest.assets : [];
  const completeAudio = assets.filter(
    (asset) => asset.modality === 'audio' && asset.generation_status === 'complete'
  );
  const themeAsset =
    completeAudio.find((asset) => asset.asset_type === 'story_theme_loop') ??
    completeAudio.find((asset) => asset.asset_type === 'arc_ambience') ??
    completeAudio[0] ??
    null;
  const themePath = toAbsolutePathIfExists(themeAsset?.file_path ?? null);

  const voiceAssets = completeAudio.filter((asset) =>
    ['npc_voice_profile', 'villain_voice_profile'].includes(String(asset.asset_type))
  );
  const uniqueVoicePaths = [];
  const seen = new Set();
  for (const asset of voiceAssets) {
    const resolvedPath = toAbsolutePathIfExists(asset.file_path);
    if (!resolvedPath || seen.has(resolvedPath)) {
      continue;
    }
    seen.add(resolvedPath);
    uniqueVoicePaths.push(resolvedPath);
  }

  return {
    themePath,
    voicePaths: uniqueVoicePaths
  };
}

async function assertPathReadable(pathValue) {
  await access(pathValue, constants.R_OK);
}

function parseDurationFromFfmpegOutput(stderr) {
  const match = String(stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

async function runFfmpeg(args, options = {}) {
  if (!ffmpegStatic) {
    throw new Error('ffmpeg-static binary is unavailable.');
  }

  const timeoutMs = options.timeoutMs ?? 300_000;
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(ffmpegStatic, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      rejectPromise(new Error(`ffmpeg exited with ${code}: ${stderr}`));
    });
  });
}

async function getVideoDurationSeconds(videoPath) {
  const result = await runFfmpeg(['-i', videoPath, '-f', 'null', '-'], { timeoutMs: 120_000 });
  const duration = parseDurationFromFfmpegOutput(result.stderr);
  if (!duration || Number.isNaN(duration)) {
    throw new Error(`Unable to parse duration for ${videoPath}`);
  }
  return duration;
}

async function synthesizeNarratorVoice(scriptText, outputPath) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to synthesize walkthrough narrator audio.');
  }
  await mkdir(dirname(outputPath), { recursive: true });

  const model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  const voice = process.env.OPENAI_WALKTHROUGH_VOICE ?? 'sage';
  const speed = Number(process.env.OPENAI_WALKTHROUGH_SPEED ?? '0.97');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      voice,
      format: 'wav',
      speed,
      instructions:
        'Cinematic investigator narration. Calm, analytical, immersive, and emotionally present without melodrama.',
      input: scriptText
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Narrator TTS failed (${response.status}): ${detail}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  await assertPathReadable(outputPath);
  return {
    outputPath,
    model,
    voice,
    speed
  };
}

function buildNarratorScript(storyId, decisions, endingSummary) {
  const intro = [
    `Investigator log: beginning live run for ${storyId}.`,
    'Objective is to preserve chain-of-custody, isolate manipulation routes, and close the case before the villain controls the narrative.'
  ];

  const body = decisions.slice(0, 28).map((decision, index) => {
    const choiceText = decision.choiceLabel || 'advanced the default branch';
    return `Day ${decision.day}, beat ${index + 1}: I chose ${choiceText}. I made that move because ${reasonForChoice(
      choiceText
    )}.`;
  });

  const outro = [
    `Final assessment: ${endingSummary || 'case reached a valid ending with branch continuity maintained.'}`,
    'Run complete. Investigation board, puzzle systems, evidence links, and channel thread remained coherent through the ending.'
  ];

  return [...intro, ...body, ...outro].join(' ');
}

async function showDayOverlay(page, label) {
  await page.evaluate((overlayLabel) => {
    const id = '__walkthrough-day-overlay';
    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement('div');
      element.id = id;
      element.style.position = 'fixed';
      element.style.inset = '0';
      element.style.display = 'grid';
      element.style.placeItems = 'center';
      element.style.background = 'rgba(0,0,0,0.72)';
      element.style.color = '#f6f1e8';
      element.style.fontFamily = '"Cinzel", serif';
      element.style.fontSize = '64px';
      element.style.letterSpacing = '0.08em';
      element.style.textTransform = 'uppercase';
      element.style.opacity = '0';
      element.style.pointerEvents = 'none';
      element.style.transition = 'opacity 320ms ease';
      element.style.zIndex = '99999';
      document.body.appendChild(element);
    }
    element.textContent = overlayLabel;
    element.style.opacity = '1';
    window.setTimeout(() => {
      element.style.opacity = '0';
    }, 900);
  }, label);
  await page.waitForTimeout(1300);
}

async function acknowledgePopupIfPresent(page) {
  const popup = page.locator('[data-testid="message-popup"]');
  if ((await popup.count()) === 0) {
    return;
  }
  if (!(await popup.first().isVisible().catch(() => false))) {
    return;
  }
  const replayButton = page.locator('[data-testid="popup-play-voice"]');
  if ((await replayButton.count()) > 0 && (await replayButton.first().isEnabled().catch(() => false))) {
    await replayButton.first().click().catch(() => {});
    await page.waitForTimeout(450);
  }
  const ack = page.locator('[data-testid="popup-acknowledge"]');
  if ((await ack.count()) > 0) {
    await ack.first().click().catch(() => {});
  }
}

async function performRichInteractions(page, stepIndex) {
  if (stepIndex === 1) {
    await page.getByRole('button', { name: 'Thinking Hint' }).click().catch(() => {});
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'Use Suggested Response' }).click().catch(() => {});
    await page.waitForTimeout(1000);
    return;
  }

  if (stepIndex % 4 === 0) {
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.54, behavior: 'smooth' }));
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Analyze Audio' }).click().catch(() => {});
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Review Evidence' }).click().catch(() => {});
    await page.waitForTimeout(900);
    return;
  }

  if (stepIndex % 5 === 0) {
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.69, behavior: 'smooth' }));
    await page.waitForTimeout(900);
    const cipherInput = page.locator('[data-testid="audio-cipher-input"]');
    if ((await cipherInput.count()) > 0) {
      await cipherInput.fill('440').catch(() => {});
      await page.locator('[data-testid="audio-cipher-submit"]').click().catch(() => {});
      await page.waitForTimeout(900);
    }
    return;
  }

  if (stepIndex % 3 === 0) {
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.83, behavior: 'smooth' }));
    await page.waitForTimeout(800);
    await page.locator('[data-testid="zoom-in"]').click().catch(() => {});
    await page.waitForTimeout(250);
    await page.locator('[data-testid="pan-right"]').click().catch(() => {});
    await page.waitForTimeout(250);
    await page.locator('[data-testid="pan-down"]').click().catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function pickChoiceLabelAndApply(page) {
  const quickChoices = page.locator('[data-testid^="phone-quick-reply-"]');
  const quickCount = await quickChoices.count();
  for (let index = 0; index < quickCount; index += 1) {
    const button = quickChoices.nth(index);
    const isEnabled = await button.isEnabled().catch(() => false);
    if (!isEnabled) {
      continue;
    }
    const label = (await button.innerText().catch(() => `quick-choice-${index + 1}`)).trim();
    await button.click();
    return label;
  }

  const responseOptions = page.locator('[data-testid^="response-option-"]');
  const optionCount = await responseOptions.count();
  for (let index = 0; index < optionCount; index += 1) {
    const button = responseOptions.nth(index);
    const isEnabled = await button.isEnabled().catch(() => false);
    if (!isEnabled) {
      continue;
    }
    const label = (await button.innerText().catch(() => `response-option-${index + 1}`))
      .split('\n')[0]
      .trim();
    await button.click();
    return label;
  }

  return null;
}

async function runWalkthroughCapture({
  storyId,
  host,
  port,
  maxSteps
}) {
  await mkdir(rawCaptureDir, { recursive: true });
  const baseUrl = `http://${host}:${port}`;
  const captureUrl = `${baseUrl}/play?storyId=${encodeURIComponent(storyId)}&playerId=walkthrough-agent`;
  const healthUrl = `${baseUrl}/play`;
  const usingExistingServer = await isServerReachable(healthUrl);
  const server = usingExistingServer ? null : startWebServer({ host, port });
  let browser = null;
  let context = null;
  let page = null;

  const runStartedAt = new Date().toISOString();
  const decisions = [];
  let endingSummary = '';
  let rawVideoPath = null;

  try {
    await waitForServer(healthUrl, 300_000);

    browser = await chromium.launch({
      headless: true
    });

    context = await browser.newContext({
      viewport: { width: 1512, height: 980 },
      recordVideo: {
        dir: rawCaptureDir,
        size: { width: 1512, height: 980 }
      }
    });

    page = await context.newPage();
    await page.goto(captureUrl, { waitUntil: 'networkidle', timeout: 180_000 });
    await page.waitForSelector('[data-testid="mission-begin"]', { timeout: 120_000 });
    await showDayOverlay(page, 'Day 1');
    await page.locator('[data-testid="mission-begin"]').click();
    await page.waitForTimeout(1800);

    let lastDay = 1;

    for (let step = 0; step < maxSteps; step += 1) {
      const endingCard = page.locator('[data-testid="resolved-ending"]');
      if ((await endingCard.count()) > 0 && (await endingCard.first().isVisible().catch(() => false))) {
        endingSummary = (await endingCard.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        break;
      }

      await acknowledgePopupIfPresent(page);
      await page.waitForTimeout(450);

      const beatLabel = (await page.locator('[data-testid="current-beat"]').first().innerText().catch(() => 'Unknown Beat'))
        .replace(/\s+/g, ' ')
        .trim();
      const campaignText = await page.locator('p:has-text("Campaign Day:")').first().innerText().catch(() => '');
      const day = parseCampaignDay(campaignText) ?? lastDay;
      if (day !== lastDay) {
        await showDayOverlay(page, `Day ${day}`);
        lastDay = day;
      }

      await performRichInteractions(page, step);
      await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'smooth' }));
      await page.waitForTimeout(800);

      const choiceLabel = await pickChoiceLabelAndApply(page);
      if (!choiceLabel) {
        await page.waitForTimeout(1200);
        continue;
      }

      decisions.push({
        step: step + 1,
        day,
        beat: beatLabel,
        choiceLabel
      });

      await page.waitForTimeout(1800);
      await acknowledgePopupIfPresent(page);
      await page.waitForTimeout(1100);
    }

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.92, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    const videoRef = page.video();
    const pathPromise = videoRef ? videoRef.path() : Promise.resolve(null);
    await context.close();
    rawVideoPath = await pathPromise;
    await browser.close();

    if (!rawVideoPath) {
      throw new Error('Playwright did not produce a capture file.');
    }

    await assertPathReadable(rawVideoPath);
  } finally {
    if (server) {
      await safeTerminate(server);
    }
  }

  return {
    rawVideoPath,
    decisions,
    endingSummary,
    runStartedAt
  };
}

async function renderFinalVideo({
  storyId,
  rawVideoPath,
  decisions,
  endingSummary,
  outputName
}) {
  await mkdir(outputDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  const slug = slugify(outputName ?? `${storyId}-full-playthrough`);
  const stagedRawPath = join(rawCaptureDir, `${slug}.webm`);
  const narratorWavPath = join(narrationDir, `${slug}-narrator.wav`);
  const finalOutputPath = join(outputDir, `${slug}.mp4`);
  const reportPath = join(reportsDir, `${slug}.json`);

  await copyFile(rawVideoPath, stagedRawPath);
  const videoDuration = await getVideoDurationSeconds(stagedRawPath);

  const storyAudio = pickStoryAudioAssets(storyId);
  if (!storyAudio.themePath) {
    throw new Error(`No story theme loop found for ${storyId}.`);
  }

  const narratorScript = buildNarratorScript(storyId, decisions, endingSummary);
  const narrator = await synthesizeNarratorVoice(narratorScript, narratorWavPath);

  const voiceTracks = storyAudio.voicePaths.slice(0, 6);
  const ffmpegInputs = [
    '-y',
    '-i',
    stagedRawPath,
    '-stream_loop',
    '-1',
    '-i',
    storyAudio.themePath,
    '-i',
    narrator.outputPath
  ];

  for (const voicePath of voiceTracks) {
    ffmpegInputs.push('-i', voicePath);
  }

  const filterParts = [];
  const safeDuration = Math.max(20, Math.floor(videoDuration));
  const fadeOutStart = Math.max(1, safeDuration - 2);

  filterParts.push(
    `[1:a]atrim=0:${safeDuration.toFixed(3)},asetpts=PTS-STARTPTS,volume=0.18,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart.toFixed(
      3
    )}:d=1.5[bed]`
  );
  filterParts.push(
    `[2:a]atrim=0:${safeDuration.toFixed(3)},asetpts=PTS-STARTPTS,volume=1.00,acompressor=threshold=-19dB:ratio=2.8:attack=18:release=170[narr]`
  );

  const audioLabels = ['[bed]', '[narr]'];
  for (let index = 0; index < voiceTracks.length; index += 1) {
    const inputIndex = 3 + index;
    const delaySeconds = 8 + index * 18;
    const delayMs = Math.floor(delaySeconds * 1000);
    const label = `[char${index}]`;
    filterParts.push(
      `[${inputIndex}:a]atrim=0:11,asetpts=PTS-STARTPTS,volume=0.82,adelay=${delayMs}|${delayMs}${label}`
    );
    audioLabels.push(label);
  }

  filterParts.push(
    `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0,alimiter=limit=0.96[aout]`
  );

  const args = [
    ...ffmpegInputs,
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-c:a',
    'aac',
    '-b:a',
    '224k',
    '-shortest',
    finalOutputPath
  ];

  await runFfmpeg(args, { timeoutMs: 1_200_000 });
  await assertPathReadable(finalOutputPath);

  const report = {
    generatedAt: new Date().toISOString(),
    storyId,
    output: {
      rawCapture: stagedRawPath,
      finalVideo: finalOutputPath,
      narratorTrack: narrator.outputPath
    },
    durationSeconds: videoDuration,
    narration: {
      model: narrator.model,
      voice: narrator.voice,
      speed: narrator.speed,
      script: narratorScript
    },
    soundtrack: {
      themePath: storyAudio.themePath,
      insertedVoiceTracks: voiceTracks
    },
    decisions
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  return {
    finalOutputPath,
    reportPath,
    stagedRawPath,
    narratorWavPath,
    durationSeconds: videoDuration,
    decisions: decisions.length
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const capture = await runWalkthroughCapture(args);
  const render = await renderFinalVideo({
    storyId: args.storyId,
    rawVideoPath: capture.rawVideoPath,
    decisions: capture.decisions,
    endingSummary: capture.endingSummary,
    outputName: args.outputName
  });

  process.stdout.write(
    `[walkthrough] done story=${args.storyId} video=${render.finalOutputPath} report=${render.reportPath} duration=${render.durationSeconds.toFixed(
      2
    )}s decisions=${render.decisions}\n`
  );
}

main().catch((error) => {
  console.error('[walkthrough] failed', error);
  process.exit(1);
});
