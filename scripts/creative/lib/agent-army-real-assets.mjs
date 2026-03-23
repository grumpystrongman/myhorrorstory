import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { constants, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { scanImageForTextArtifacts } from './agent-army-image-qa.mjs';

export const repoRoot = process.cwd();
export const publicRoot = join(repoRoot, 'apps', 'web', 'public');
export const publicAgentArmyRoot = join(publicRoot, 'agent-army');
export const productionAgentArmyRoot = join(repoRoot, 'assets', 'production', 'agent-army');
export const planPath = join(repoRoot, 'assets', 'manifests', 'commercial-agent-army-plan.json');
export const statusLedgerPath = join(publicAgentArmyRoot, 'status', 'generation-status.json');
export const catalogPath = join(publicAgentArmyRoot, 'catalog.json');
export const storyManifestRoot = join(publicAgentArmyRoot, 'manifests');
const storyDocsRoot = join(repoRoot, 'docs', 'stories');
const argContentRoot = join(repoRoot, 'apps', 'web', 'public', 'content', 'arg');
const voiceDramaManifestPath = join(repoRoot, 'assets', 'manifests', 'voice-drama-manifest.json');
export const imageBackends = ['openai-gpt-image-1', 'pollinations-free', 'local-playwright-art-director'];
const LOCAL_FALLBACK_TOOL = 'local-playwright-art-director';
const DEGRADED_FALLBACK_ERROR =
  'degraded local fallback excluded from commercial gallery; rerun with a remote image backend';
const VIDEO_TOOL = 'ffmpeg-cinematic-montage';
const AUDIO_TOOL = 'ffmpeg-cinematic-horror-score';
const VOICE_TOOL = 'openai:gpt-4o-mini-tts+ffmpeg-voice-cast-lab';

const OPENAI_TTS_VOICE_POOL = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
const OPENAI_ROLE_VOICE_POOL = {
  antagonist: ['onyx', 'fable', 'ash', 'sage', 'echo'],
  witness: ['nova', 'coral', 'alloy', 'shimmer', 'echo'],
  operator: ['sage', 'alloy', 'ash', 'shimmer', 'coral'],
  investigator: ['echo', 'alloy', 'nova', 'sage', 'ash'],
  narrator: ['alloy', 'sage', 'fable', 'echo', 'nova']
};
const VIDEO_DURATION_MIN_SECONDS = 5;
const VIDEO_DURATION_MAX_SECONDS = 59;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg', '.m4a']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);
const MIN_SIZE_BY_MODALITY = {
  image: 6_000,
  audio: 48_000,
  video: 24_000,
  artifact: 300,
  web: 700
};

let ffmpegBinary = process.env.FFMPEG_BIN ?? ffmpegStatic;
let planAssetsPromise = null;
const storyPackageCache = new Map();
const npcProfileCache = new Map();
let voiceDramaManifestPromise = null;

function loadEnvLineIntoProcess(line) {
  const trimmed = String(line).trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) {
    return;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key || (process.env[key] ?? '').trim().length > 0) {
    return;
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

function loadRepoEnvFiles() {
  for (const candidate of [join(repoRoot, '.env.local'), join(repoRoot, '.env')]) {
    try {
      const raw = readFileSync(candidate, 'utf8');
      for (const line of raw.split(/\r?\n/g)) {
        loadEnvLineIntoProcess(line);
      }
    } catch {
      // Ignore absent or unreadable env files; scripts can still rely on inherited env vars.
    }
  }
}

loadRepoEnvFiles();

function sha1Hex(value) {
  return createHash('sha1').update(value).digest('hex');
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function getPlanAssetsCached() {
  if (!planAssetsPromise) {
    planAssetsPromise = readFile(planPath, 'utf8').then((raw) => {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.assets) ? parsed.assets : [];
    });
  }

  return planAssetsPromise;
}

async function loadStoryPackage(storyId) {
  if (!storyId) {
    return null;
  }

  if (!storyPackageCache.has(storyId)) {
    storyPackageCache.set(storyId, readJsonIfExists(join(storyDocsRoot, `${storyId}.story.json`)));
  }

  return storyPackageCache.get(storyId);
}

async function loadNpcProfiles(storyId) {
  if (!storyId) {
    return [];
  }

  if (!npcProfileCache.has(storyId)) {
    npcProfileCache.set(
      storyId,
      readJsonIfExists(join(argContentRoot, storyId, 'npc_profiles.json')).then((value) =>
        Array.isArray(value) ? value : []
      )
    );
  }

  return npcProfileCache.get(storyId);
}

async function loadVoiceDramaManifest() {
  if (!voiceDramaManifestPromise) {
    voiceDramaManifestPromise = readJsonIfExists(voiceDramaManifestPath);
  }

  return voiceDramaManifestPromise;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function colorChannel(seed, shift, minimum, spread) {
  return minimum + ((seed >>> shift) % spread);
}

function paletteFromSeed(seed) {
  const primary = `rgb(${colorChannel(seed, 0, 24, 72)}, ${colorChannel(seed, 8, 18, 64)}, ${colorChannel(seed, 16, 28, 70)})`;
  const secondary = `rgb(${colorChannel(seed, 4, 92, 110)}, ${colorChannel(seed, 12, 56, 86)}, ${colorChannel(seed, 20, 44, 74)})`;
  const accent = `rgb(${colorChannel(seed, 2, 130, 90)}, ${colorChannel(seed, 10, 70, 70)}, ${colorChannel(seed, 18, 58, 56)})`;
  const warning = `rgb(${colorChannel(seed, 6, 160, 70)}, ${colorChannel(seed, 14, 48, 40)}, ${colorChannel(seed, 22, 40, 38)})`;
  return {
    primary,
    secondary,
    accent,
    warning,
    ink: 'rgba(244, 233, 218, 0.96)',
    muted: 'rgba(221, 201, 179, 0.78)'
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function promptFragments(prompt) {
  return String(prompt)
    .split(/[.|,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function imageConceptForAsset(asset) {
  const category = String(asset.category ?? '').toLowerCase();
  if (category.includes('portrait')) {
    return 'portrait';
  }
  if (category.includes('evidence') || category.includes('artifact')) {
    return 'evidence';
  }
  if (category.includes('puzzle') || category.includes('map')) {
    return 'diagram';
  }
  if (category.includes('key_art') || category.includes('ending') || category.includes('banner')) {
    return 'poster';
  }
  return 'scene';
}

function assetTypeForPrompt(asset) {
  const category = String(asset.category ?? '').toLowerCase();
  if (category === 'story_key_art') {
    return 'hero poster';
  }
  if (category === 'arc_key_art') {
    return 'chapter poster';
  }
  if (category === 'beat_scene_art') {
    return 'cinematic scene still';
  }
  if (category === 'character_portrait') {
    return 'character portrait';
  }
  if (category === 'villain_portrait') {
    return 'villain portrait';
  }
  if (category === 'ending_card') {
    return 'ending illustration';
  }
  if (category === 'evidence_still') {
    return 'forensic evidence photograph';
  }
  if (category === 'puzzle_board') {
    return 'investigation board';
  }
  if (category === 'puzzle_shard_card') {
    return 'clue artifact detail';
  }
  if (category === 'page_banner') {
    return 'website banner artwork';
  }
  if (category === 'background_texture') {
    return 'atmospheric background plate';
  }
  if (category === 'social_square' || category === 'social_vertical') {
    return 'marketing still';
  }
  return 'horror illustration';
}

function extractPromptSegment(prompt, label) {
  const match = new RegExp(`${label}:\\s*([^|]+)`, 'i').exec(String(prompt ?? ''));
  return match ? match[1].trim() : null;
}

function openAiImageSizeForAsset(asset) {
  const width = Number(asset.specs?.width) || 1024;
  const height = Number(asset.specs?.height) || 1024;
  if (width > height * 1.15) {
    return '1536x1024';
  }
  if (height > width * 1.15) {
    return '1024x1536';
  }
  return '1024x1024';
}

function openAiImageQualityForAsset(asset) {
  const category = String(asset.category ?? '').toLowerCase();
  if (
    category === 'story_key_art' ||
    category === 'arc_key_art' ||
    category === 'character_portrait' ||
    category === 'villain_portrait' ||
    category === 'page_banner' ||
    category === 'ending_card'
  ) {
    return 'high';
  }
  return 'medium';
}

function buildHighFidelityImagePrompt(asset) {
  const storyTitle = asset.storyTitle ?? asset.storyId ?? 'Website Surface';
  const category = String(asset.category ?? '').toLowerCase();
  const assetType = assetTypeForPrompt(asset);
  const storyHook = extractPromptSegment(asset.prompt, 'Hook') ?? '';
  const location = extractPromptSegment(asset.prompt, 'Location') ?? '';
  const villain = extractPromptSegment(asset.prompt, 'Villain') ?? '';
  const motifs = extractPromptSegment(asset.prompt, 'Motifs') ?? '';
  const subgenre = extractPromptSegment(asset.prompt, 'Subgenre') ?? '';
  const tone = extractPromptSegment(asset.prompt, 'Tone') ?? '';
  const narrative = extractPromptSegment(asset.prompt, 'Narrative') ?? asset.title ?? '';
  const arcFocus = extractPromptSegment(asset.prompt, 'Arc focus') ?? '';
  const sharedDirectives = [
    'Create original premium horror artwork for a commercial alternate reality investigation game.',
    `Subject: ${assetType}.`,
    `Story world: ${storyTitle}.`,
    storyHook ? `Premise: ${storyHook}.` : null,
    location ? `Setting: ${location}.` : null,
    villain ? `Threat presence: ${villain}.` : null,
    motifs ? `Recurring motifs: ${motifs}.` : null,
    subgenre ? `Subgenre: ${subgenre}.` : null,
    tone ? `Tone: ${tone}.` : null,
    arcFocus ? `Arc focus: ${arcFocus}.` : null,
    narrative ? `Immediate scene brief: ${narrative}.` : null,
    'Grounded cinematic horror, photoreal detail, rich atmosphere, practical lighting, believable materials, analog grain, subtle lens bloom, visible depth.',
    'Absolutely no visible letters, words, signage, subtitles, captions, runes, glyphs, pseudo-text, document copy, watermark, logo, title treatment, UI overlay, labels, poster typography, or debug text.'
  ]
    .filter(Boolean)
    .join(' ');

  if (category === 'story_key_art' || category === 'arc_key_art' || category === 'ending_card') {
    return `${sharedDirectives} Compose a high-end key art image with a dominant focal threat, layered foreground and background storytelling, a strong silhouette, and clear thematic clues embedded in the environment. Keep it elegant, unsettling, and market-ready.`;
  }

  if (category === 'character_portrait' || category === 'villain_portrait') {
    return `${sharedDirectives} Create a realistic portrait with wardrobe, posture, facial tension, and environmental context that reveal personality and danger. Avoid floating-head composition. Frame as a prestige horror still, not concept art.`;
  }

  if (category === 'evidence_still') {
    const evidenceDirectives = [
      'Create original premium horror artwork for a commercial alternate reality investigation game.',
      `Subject: ${assetType}.`,
      `Story world: ${storyTitle}.`,
      location ? `Setting: ${location}.` : null,
      motifs ? `Recurring motifs: ${motifs}.` : null,
      subgenre ? `Subgenre: ${subgenre.replace(/slasher/gi, 'winter mystery')}.` : null,
      tone ? `Tone: ${tone}.` : null,
      narrative ? `Immediate scene brief: ${narrative}.` : null,
      'Render a non-graphic investigative still focused on objects, architecture, weather traces, timestamps, clothing fibers, tire tracks, paper records, and scene aftermath.',
      'No bodies, no visible injuries, no attack in progress, no blood spatter, no gore, no active weapon use, no dismemberment.',
      'Grounded cinematic horror, photoreal detail, rich atmosphere, practical lighting, believable materials, analog grain, subtle lens bloom, visible depth.',
      'Absolutely no visible letters, words, signage, subtitles, captions, pseudo-text, document copy, watermark, logo, title treatment, UI overlay, labels, poster typography, or debug text.'
    ]
      .filter(Boolean)
      .join(' ');
    return `${evidenceDirectives} Render as forensic or investigative photography of a real object or environment, with tangible wear, shallow depth of field, and subtle clue placement. If the scene implies documents, screens, labels, or signage, keep them out of frame, occluded, or blurred beyond readability.`;
  }

  if (category === 'puzzle_board' || category === 'puzzle_shard_card') {
    return `${sharedDirectives} Show a physical evidence-board or clue collage with photographs, string, maps, stained paper, and marked surfaces. Prioritize tactile realism over readable text. Do not render any legible handwriting, labels, map text, captions, dossier headings, or faux typography.`;
  }

  if (category === 'background_texture' || category === 'page_banner') {
    return `${sharedDirectives} Build a polished environmental plate for web presentation with strong negative space, atmospheric depth, and clear thematic identity for the story world.`;
  }

  if (category === 'social_square' || category === 'social_vertical') {
    return `${sharedDirectives} Compose a high-contrast marketing still with a clean focal read, premium horror mood, and room for external campaign copy to be added later.`;
  }

  return `${sharedDirectives} Create a dramatic environmental still with human-scale tension, investigative clues, and a slow-burn horror mood.`;
}

function normalizeImageBackendChoice(value) {
  if (!value || value === 'auto') {
    return 'auto';
  }
  if (value === 'local') {
    return 'local';
  }
  if (value === 'pollinations') {
    return 'pollinations';
  }
  if (value === 'openai') {
    return 'openai';
  }
  return value;
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function imageTextQaEnabled() {
  return String(process.env.AGENT_ARMY_DISABLE_OCR_QA ?? '')
    .trim()
    .toLowerCase() !== 'true';
}

function shouldRunImageTextQa(asset) {
  return asset.modality === 'image' && imageTextQaEnabled();
}

async function assertImageTextQa(asset, outputPath) {
  if (!shouldRunImageTextQa(asset)) {
    return null;
  }

  const scan = await scanImageForTextArtifacts(outputPath);
  if (!scan.foundText) {
    return scan;
  }

  const tokenPreview = scan.tokens
    .slice(0, 6)
    .map((token) => `${token.text} (${token.confidence.toFixed(0)})`)
    .join(', ');
  throw new Error(
    `image text artifact detected; regenerate required${tokenPreview ? ` :: ${tokenPreview}` : ''}`
  );
}

function normalizeRole(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('antagonist') || normalized.includes('villain')) {
    return 'antagonist';
  }
  if (normalized.includes('witness') || normalized.includes('suspect')) {
    return 'witness';
  }
  if (normalized.includes('journalist') || normalized.includes('operator') || normalized.includes('handler')) {
    return 'operator';
  }
  if (normalized.includes('detective') || normalized.includes('investigator') || normalized.includes('ally')) {
    return 'investigator';
  }
  return 'narrator';
}

function guessSexFromDisplayName(displayName) {
  const normalized = String(displayName ?? '').trim().toLowerCase();
  const femaleMarkers = [
    'elara',
    'sera',
    'veda',
    'nia',
    'mara',
    'juno',
    'priya',
    'talia',
    'sia',
    'mina',
    'nella',
    'leda',
    'maris',
    'helene',
    'amy',
    'joanna',
    'lin'
  ];
  const maleMarkers = [
    'tomas',
    'cal',
    'bram',
    'owen',
    'eli',
    'omar',
    'micah',
    'cade',
    'ellis',
    'hale',
    'nico',
    'evan',
    'matthew',
    'brian',
    'felix',
    'bram',
    'dorian'
  ];

  if (femaleMarkers.some((marker) => normalized.includes(marker))) {
    return 'female';
  }
  if (maleMarkers.some((marker) => normalized.includes(marker))) {
    return 'male';
  }
  return 'unknown';
}

async function resolveVoiceProfileContext(storyId, displayName) {
  const manifest = await loadVoiceDramaManifest();
  const storyVoiceData = manifest?.stories?.find((story) => story.storyId === storyId) ?? null;
  const voiceProfile =
    storyVoiceData?.profiles?.find((profile) => profile.characterId === displayName) ?? null;
  const npcProfiles = await loadNpcProfiles(storyId);
  const npcProfile = npcProfiles.find((profile) => profile.displayName === displayName) ?? null;
  const storyPackage = await loadStoryPackage(storyId);

  return {
    storyPackage,
    npcProfile,
    voiceProfile,
    locale: voiceProfile?.locale ?? 'en-US',
    region: voiceProfile?.region ?? 'global',
    role:
      normalizeRole(voiceProfile?.role ?? npcProfile?.role ?? (displayName === storyPackage?.villain?.displayName ? 'antagonist' : 'narrator')),
    sex: guessSexFromDisplayName(displayName),
    displayName
  };
}

function uniqueItems(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function findProviderConfig(profileContext, providerName) {
  return (profileContext.voiceProfile?.providerChain ?? []).find(
    (entry) => String(entry.provider ?? '').trim().toUpperCase() === providerName
  );
}

function deterministicVoiceRanking(pool, seedKey) {
  return [...pool]
    .map((voiceId, index) => ({
      voiceId,
      rank: hashString(`${seedKey}:${voiceId}:${index}`)
    }))
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.voiceId);
}

function pickOpenAiVoiceCandidates(profileContext, contextTag = 'profile') {
  const providerVoice = String(findProviderConfig(profileContext, 'OPENAI')?.voiceId ?? '').trim().toLowerCase();
  const rolePool = OPENAI_ROLE_VOICE_POOL[profileContext.role] ?? OPENAI_ROLE_VOICE_POOL.narrator;
  const rankedRoleVoices = deterministicVoiceRanking(
    rolePool,
    `${profileContext.storyPackage?.id ?? profileContext.displayName}:${profileContext.displayName}:${contextTag}:role`
  );
  const rankedGlobalVoices = deterministicVoiceRanking(
    OPENAI_TTS_VOICE_POOL,
    `${profileContext.storyPackage?.id ?? profileContext.displayName}:${profileContext.displayName}:${contextTag}:global`
  );

  return uniqueItems([providerVoice, ...rankedRoleVoices, ...rankedGlobalVoices, ...OPENAI_TTS_VOICE_POOL]);
}

function inferEmotionAdjustments(profileContext) {
  const baselineEmotion = String(profileContext.npcProfile?.baselineEmotion ?? '').toUpperCase();
  const traits = Array.isArray(profileContext.npcProfile?.personalityTraits)
    ? profileContext.npcProfile.personalityTraits.map((item) => String(item).toLowerCase())
    : [];

  let rateDelta = 0;
  let pitchDelta = 0;
  let grain = 0.35;

  if (baselineEmotion.includes('ANXIOUS') || baselineEmotion.includes('PANIC')) {
    rateDelta += 0.06;
    pitchDelta += 0.4;
    grain += 0.1;
  } else if (baselineEmotion.includes('CALM')) {
    rateDelta -= 0.03;
    pitchDelta -= 0.15;
  } else if (baselineEmotion.includes('DEFIANT')) {
    rateDelta += 0.02;
    pitchDelta -= 0.25;
  } else if (baselineEmotion.includes('SUSPICIOUS')) {
    rateDelta -= 0.01;
    pitchDelta -= 0.2;
    grain += 0.08;
  }

  if (traits.includes('guarded')) {
    rateDelta -= 0.02;
    pitchDelta -= 0.15;
  }
  if (traits.includes('reactive')) {
    rateDelta += 0.04;
  }
  if (traits.includes('analytical')) {
    rateDelta -= 0.01;
  }
  if (traits.includes('observant')) {
    grain += 0.05;
  }

  return { rateDelta, pitchDelta, grain };
}

function buildVoiceDesign(profileContext, contextTag = 'profile') {
  const storyId = profileContext.storyPackage?.id ?? 'global';
  const seed = hashString(`${storyId}:${profileContext.displayName}:${profileContext.role}:${contextTag}`);
  const expressionRate = Number(profileContext.voiceProfile?.expression?.rate ?? 1);
  const expressionPitch = Number(profileContext.voiceProfile?.expression?.pitch ?? 0);
  const expressionStyle = Number(profileContext.voiceProfile?.expression?.style ?? 0.5);
  const roleRateDelta =
    profileContext.role === 'antagonist'
      ? -0.05
      : profileContext.role === 'witness'
        ? 0.04
        : profileContext.role === 'operator'
          ? -0.01
          : 0;
  const rolePitchDelta =
    profileContext.role === 'antagonist'
      ? -0.65
      : profileContext.role === 'witness'
        ? 0.35
        : profileContext.role === 'operator'
          ? -0.1
          : 0;
  const emotion = inferEmotionAdjustments(profileContext);
  const microDrift = ((seed % 2000) / 1000 - 1) * 0.035;

  const apiSpeed = clamp(expressionRate + roleRateDelta + emotion.rateDelta + microDrift, 0.84, 1.16);
  const pitchSemitone = clamp(expressionPitch * 0.95 + rolePitchDelta + emotion.pitchDelta, -4.6, 4.2);

  const baseHighpass =
    profileContext.role === 'antagonist' ? 60 : profileContext.role === 'witness' ? 85 : 72;
  const baseLowpass =
    profileContext.role === 'antagonist' ? 5800 : profileContext.role === 'witness' ? 7600 : 7000;

  return {
    apiSpeed,
    pitchSemitone,
    textureAmount: clamp(emotion.grain + expressionStyle * 0.25, 0.25, 0.9),
    highpassHz: clamp(baseHighpass + ((seed >>> 8) % 18), 52, 120),
    lowpassHz: clamp(baseLowpass + ((seed >>> 12) % 460), 5200, 8200),
    presenceGainDb: clamp((expressionStyle - 0.5) * 2.2 + (((seed >>> 4) % 12) - 6) * 0.08, -1.6, 2.4)
  };
}

function buildAtempoChain(speedFactor) {
  let remaining = Math.max(0.2, Number(speedFactor) || 1);
  const nodes = [];
  while (remaining > 2.0) {
    nodes.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    nodes.push('atempo=0.5');
    remaining /= 0.5;
  }
  nodes.push(`atempo=${remaining.toFixed(4)}`);
  return nodes.join(',');
}

function buildVoicePostProcessFilter(role, voiceDesign, sampleRate) {
  const pitchFactor = Math.pow(2, Number(voiceDesign.pitchSemitone ?? 0) / 12);
  const adjustedRate = Number(sampleRate) * pitchFactor;
  const tempoCompensation = buildAtempoChain(1 / pitchFactor);
  const texture = clamp(Number(voiceDesign.textureAmount ?? 0.42), 0.25, 0.9);
  const roleEcho =
    role === 'antagonist'
      ? `aecho=0.82:0.42:${Math.round(42 + texture * 18)}:0.12`
      : `aecho=0.72:0.36:${Math.round(26 + texture * 12)}:0.06`;

  return [
    `asetrate=${adjustedRate.toFixed(2)}`,
    `aresample=${sampleRate}`,
    tempoCompensation,
    `highpass=f=${Math.round(Number(voiceDesign.highpassHz ?? 72))}`,
    `lowpass=f=${Math.round(Number(voiceDesign.lowpassHz ?? 7000))}`,
    'acompressor=threshold=-21dB:ratio=2.9:attack=14:release=180:makeup=3.5',
    'dynaudnorm=f=140:g=9:m=14:s=8:p=0.9',
    `equalizer=f=2950:t=q:w=1.0:g=${Number(voiceDesign.presenceGainDb ?? 0.8).toFixed(2)}`,
    roleEcho,
    'alimiter=limit=0.96'
  ].join(',');
}

function buildVoicePreviewScript(asset, profileContext) {
  const story = profileContext.storyPackage;
  const hook = story?.hook ?? extractPromptSegment(asset.prompt, 'Hook') ?? 'Something is wrong with the case file.';
  const location = story?.location ?? extractPromptSegment(asset.prompt, 'Location') ?? 'the scene';
  const villain = story?.villain?.displayName ?? extractPromptSegment(asset.prompt, 'Villain') ?? 'the threat';
  const motivations = Array.isArray(profileContext.npcProfile?.motivations)
    ? profileContext.npcProfile.motivations.join(' ')
    : extractPromptSegment(asset.prompt, 'Motivations') ?? '';
  const clue = Array.isArray(story?.clueEvidenceList) ? story.clueEvidenceList[0] : 'the evidence drop';

  if (profileContext.role === 'antagonist') {
    return [
      `You keep calling this an investigation, but ${hook.toLowerCase()}`,
      `Stay with ${clue.toLowerCase()}, and decide how much of yourself you are willing to surrender before I reach you at ${location.toLowerCase()}.`,
      `If you hesitate, I collect the debt anyway.`
    ].join(' ');
  }

  if (profileContext.role === 'witness') {
    return [
      `This is ${profileContext.displayName}. I should not be leaving this message.`,
      `Something about ${clue.toLowerCase()} is wrong, and ${villain} wants us to panic before anyone checks the chain of custody.`,
      motivations ? `${motivations} Please move quietly when you come to ${location.toLowerCase()}.` : `Please move quietly when you come to ${location.toLowerCase()}.`
    ].join(' ');
  }

  if (profileContext.role === 'operator') {
    return [
      `This is ${profileContext.displayName}. Keep your channel open and do not answer unknown callbacks.`,
      `${hook} Start with ${clue.toLowerCase()}, then verify every timestamp against ${location.toLowerCase()}.`,
      `If ${villain} contacts you directly, preserve the message before you react.`
    ].join(' ');
  }

  return [
    `This is ${profileContext.displayName}. ${hook}`,
    `Work the case in order: secure ${clue.toLowerCase()}, confirm the scene at ${location.toLowerCase()}, and do not let ${villain} choose the pace.`,
    motivations ? motivations : 'Trust the evidence before you trust the performance.'
  ].join(' ');
}

function allowCommercialLocalFallback() {
  return String(process.env.ALLOW_LOCAL_ARTWORK_FALLBACK ?? '').trim().toLowerCase() === 'true';
}

function renderArtDirectionHtml(asset, seed, width, height) {
  const palette = paletteFromSeed(seed);
  const fragments = promptFragments(asset.prompt);
  const storyLabel = asset.storyTitle ?? asset.storyId ?? 'Website Surface';
  const concept = imageConceptForAsset(asset);
  const stampedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const sidebar = fragments
    .map((fragment, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(fragment)}</strong></li>`)
    .join('');

  const focalMarkup =
    concept === 'portrait'
      ? `
        <div class="portrait-wrap">
          <div class="portrait-aura"></div>
          <div class="portrait-bust"></div>
          <div class="portrait-scratch"></div>
          <div class="portrait-caption">SUBJECT STATUS: UNRELIABLE / OBSERVED AFTER MIDNIGHT</div>
        </div>
      `
      : concept === 'evidence'
        ? `
          <div class="evidence-board">
            <div class="evidence-photo photo-a"></div>
            <div class="evidence-photo photo-b"></div>
            <div class="evidence-note note-a">TIMESTAMP DRIFT +07:13</div>
            <div class="evidence-note note-b">LATENT PRINTS DO NOT MATCH FILED RECORD</div>
            <div class="thread thread-a"></div>
            <div class="thread thread-b"></div>
          </div>
        `
        : concept === 'diagram'
          ? `
            <div class="diagram-surface">
              <div class="grid"></div>
              <div class="route route-a"></div>
              <div class="route route-b"></div>
              <div class="marker marker-a"></div>
              <div class="marker marker-b"></div>
              <div class="diagram-note note-a">ENTRY VECTOR</div>
              <div class="diagram-note note-b">FALSE ROOM</div>
            </div>
          `
          : concept === 'poster'
            ? `
              <div class="poster-scene">
                <div class="poster-glow"></div>
                <div class="poster-horizon"></div>
                <div class="poster-monolith"></div>
                <div class="poster-scratch"></div>
              </div>
            `
            : `
              <div class="scene-surface">
                <div class="scene-corridor"></div>
                <div class="scene-door"></div>
                <div class="scene-light"></div>
                <div class="scene-static"></div>
              </div>
            `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --bg0: ${palette.primary};
        --bg1: ${palette.secondary};
        --accent: ${palette.accent};
        --warn: ${palette.warning};
        --ink: ${palette.ink};
        --muted: ${palette.muted};
        --line: rgba(255, 255, 255, 0.12);
        --paper: rgba(232, 222, 209, 0.07);
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
      body {
        width: ${width}px;
        height: ${height}px;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 18% 14%, rgba(255,255,255,0.08), transparent 32%),
          radial-gradient(circle at 84% 28%, rgba(183, 81, 51, 0.16), transparent 28%),
          radial-gradient(circle at 50% 78%, rgba(74, 95, 123, 0.24), transparent 42%),
          linear-gradient(145deg, var(--bg0), #070b10 54%, var(--bg1));
      }
      body::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 4px),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 4px);
        opacity: 0.25;
        mix-blend-mode: screen;
      }
      body::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.46) 100%),
          linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68));
        pointer-events: none;
      }
      .frame {
        position: relative;
        width: 100%;
        height: 100%;
        padding: ${Math.max(28, Math.floor(width * 0.03))}px;
      }
      .chrome {
        position: absolute;
        inset: 22px;
        border: 1px solid var(--line);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04), 0 20px 80px rgba(0,0,0,0.45);
      }
      .title-block {
        position: absolute;
        top: 34px;
        left: 34px;
        right: 34px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
      }
      .eyebrow, .stamp {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--line);
        background: rgba(6, 7, 12, 0.42);
        padding: 8px 12px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 12px;
      }
      .headline {
        position: absolute;
        left: 34px;
        bottom: 42px;
        width: 54%;
        z-index: 2;
      }
      .headline h1 {
        margin: 0 0 12px;
        font-size: ${Math.max(38, Math.floor(width * 0.038))}px;
        line-height: 0.92;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .headline p {
        margin: 0;
        max-width: 90%;
        font-size: ${Math.max(15, Math.floor(width * 0.011))}px;
        line-height: 1.55;
        color: var(--muted);
      }
      .sidebar {
        position: absolute;
        right: 34px;
        top: 110px;
        width: 28%;
        min-width: 280px;
        padding: 18px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(9, 12, 19, 0.72), rgba(8, 10, 14, 0.36));
        backdrop-filter: blur(8px);
        z-index: 2;
      }
      .sidebar h2 {
        margin: 0 0 12px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }
      .sidebar ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 12px;
      }
      .sidebar li {
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 10px;
        align-items: start;
      }
      .sidebar span {
        color: var(--warn);
        font-size: 12px;
        letter-spacing: 0.18em;
      }
      .sidebar strong {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.45;
        font-weight: 500;
      }
      .scene {
        position: absolute;
        inset: 0;
      }
      .poster-scene, .scene-surface, .diagram-surface, .evidence-board, .portrait-wrap {
        position: absolute;
        inset: 72px 34px 126px 34px;
      }
      .poster-glow, .scene-light, .portrait-aura {
        position: absolute;
        inset: 16% 24% 22% 24%;
        background: radial-gradient(circle, rgba(201, 132, 92, 0.28), transparent 62%);
        filter: blur(24px);
      }
      .poster-horizon {
        position: absolute;
        left: 6%;
        right: 6%;
        bottom: 16%;
        height: 28%;
        background:
          linear-gradient(180deg, transparent, rgba(0,0,0,0.55)),
          linear-gradient(90deg, rgba(255,255,255,0.04), transparent 34%, rgba(255,255,255,0.03) 70%, transparent);
      }
      .poster-monolith {
        position: absolute;
        left: 40%;
        right: 42%;
        top: 20%;
        bottom: 18%;
        background: linear-gradient(180deg, rgba(8,11,17,0.2), rgba(6,8,12,0.92));
        box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 0 30px rgba(0,0,0,0.45);
      }
      .poster-scratch, .scene-static, .portrait-scratch {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(102deg, transparent 18%, rgba(255,255,255,0.03) 20%, transparent 21%),
          linear-gradient(87deg, transparent 48%, rgba(255,255,255,0.02) 49%, transparent 50%),
          repeating-linear-gradient(0deg, transparent 0 18px, rgba(255,255,255,0.02) 18px 19px);
        mix-blend-mode: screen;
        opacity: 0.5;
      }
      .scene-corridor {
        position: absolute;
        inset: 8% 14% 10% 14%;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.06), transparent 18%),
          linear-gradient(90deg, rgba(0,0,0,0.74), rgba(34, 42, 54, 0.22) 18%, rgba(34,42,54,0.12) 82%, rgba(0,0,0,0.74)),
          linear-gradient(180deg, #101620, #06080d 74%);
        clip-path: polygon(18% 0, 82% 0, 100% 100%, 0 100%);
      }
      .scene-door {
        position: absolute;
        left: 43%;
        right: 43%;
        top: 26%;
        bottom: 22%;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(113, 131, 148, 0.22), rgba(0,0,0,0.65));
      }
      .evidence-photo {
        position: absolute;
        width: 38%;
        height: 42%;
        border: 12px solid rgba(236, 228, 214, 0.92);
        background:
          linear-gradient(180deg, rgba(11,16,22,0.1), rgba(0,0,0,0.6)),
          linear-gradient(135deg, rgba(158, 84, 58, 0.32), transparent 48%),
          linear-gradient(180deg, rgba(81, 100, 120, 0.35), rgba(9,11,17,0.92));
        box-shadow: 0 18px 40px rgba(0,0,0,0.46);
      }
      .photo-a { left: 7%; top: 9%; transform: rotate(-5deg); }
      .photo-b { right: 14%; bottom: 14%; transform: rotate(4deg); }
      .evidence-note, .diagram-note, .portrait-caption {
        position: absolute;
        padding: 10px 12px;
        background: rgba(225, 211, 188, 0.92);
        color: #241d18;
        font-size: 12px;
        letter-spacing: 0.08em;
        box-shadow: 0 16px 30px rgba(0,0,0,0.32);
      }
      .note-a { right: 12%; top: 10%; transform: rotate(3deg); }
      .note-b { left: 24%; bottom: 12%; transform: rotate(-2deg); }
      .thread {
        position: absolute;
        height: 2px;
        background: linear-gradient(90deg, rgba(166, 32, 32, 0.9), rgba(166, 32, 32, 0.4));
        transform-origin: left center;
      }
      .thread-a { left: 34%; top: 31%; width: 34%; transform: rotate(-16deg); }
      .thread-b { left: 27%; top: 56%; width: 44%; transform: rotate(12deg); }
      .grid {
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 56px),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 56px),
          linear-gradient(135deg, rgba(101, 133, 148, 0.18), rgba(4, 5, 8, 0.84));
        border: 1px solid rgba(255,255,255,0.08);
      }
      .route {
        position: absolute;
        border-top: 2px solid rgba(189, 81, 81, 0.92);
        transform-origin: left center;
      }
      .route-a { left: 12%; top: 28%; width: 56%; transform: rotate(18deg); }
      .route-b { left: 36%; top: 64%; width: 26%; transform: rotate(-28deg); }
      .marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: var(--warn);
        box-shadow: 0 0 0 8px rgba(166, 55, 55, 0.16);
      }
      .marker-a { left: 14%; top: 24%; }
      .marker-b { left: 58%; top: 60%; }
      .diagram-note.note-a { left: 10%; top: 32%; }
      .diagram-note.note-b { left: 52%; top: 66%; }
      .portrait-bust {
        position: absolute;
        left: 32%;
        right: 32%;
        top: 13%;
        bottom: 10%;
        background:
          radial-gradient(circle at 50% 24%, rgba(236, 226, 214, 0.06), transparent 24%),
          radial-gradient(circle at 50% 19%, rgba(0,0,0,0.88), rgba(0,0,0,0.94) 46%, transparent 47%),
          linear-gradient(180deg, transparent 28%, rgba(0,0,0,0.92) 29% 100%);
        clip-path: polygon(50% 0, 68% 8%, 72% 18%, 78% 34%, 74% 60%, 82% 88%, 66% 100%, 34% 100%, 18% 88%, 26% 60%, 22% 34%, 28% 18%, 32% 8%);
        box-shadow: 0 18px 60px rgba(0,0,0,0.58);
      }
      .portrait-caption {
        left: 50%;
        bottom: 4%;
        transform: translateX(-50%) rotate(-1deg);
        min-width: 320px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="chrome"></div>
      <div class="title-block">
        <div class="eyebrow">${escapeHtml(storyLabel)} / ${escapeHtml(String(asset.category).replaceAll('_', ' '))}</div>
        <div class="stamp">${escapeHtml(stampedAt)}</div>
      </div>
      <div class="scene">${focalMarkup}</div>
      <aside class="sidebar">
        <h2>Case Notes</h2>
        <ul>${sidebar}</ul>
      </aside>
      <section class="headline">
        <h1>${escapeHtml(asset.title)}</h1>
        <p>${escapeHtml(fragments.join(' / '))}</p>
      </section>
    </div>
  </body>
</html>`;
}

function inferEnvironment(asset) {
  const text = `${asset.prompt ?? ''} ${asset.storyId ?? ''} ${asset.storyTitle ?? ''} ${asset.category ?? ''}`.toLowerCase();
  if (/(rail|station|platform|track|turnstile|commuter|subway|signal mast|line broadcasts)/.test(text)) {
    return 'rail';
  }
  if (/(hospital|ward|medical|clinic|surgical|asylum|patient)/.test(text)) {
    return 'hospital';
  }
  if (/(chapel|ledger|occult|ritual|hymn|chaplain|sanctuary)/.test(text)) {
    return 'chapel';
  }
  if (/(forest|watch station|ranger|pine|harvest|field|creek|winter)/.test(text)) {
    return 'forest';
  }
  if (/(apartment|tenant|lockbox|archive|building|hallway|elevator|landlord)/.test(text)) {
    return 'apartment';
  }
  if (/(salt|harbor|pier|ocean|marsh|tide|trawler|chapel of salt)/.test(text)) {
    return 'maritime';
  }
  if (/(tape|camcorder|protocol|server|substation|relay|broadcast|telemetry|network)/.test(text)) {
    return 'industrial';
  }
  return 'industrial';
}

function shortCode(seed) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = seed >>> 0;
  let output = '';
  for (let index = 0; index < 5; index += 1) {
    output += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  return output;
}

function renderThematicArtHtml(asset, seed, width, height) {
  const palette = paletteFromSeed(seed);
  const concept = imageConceptForAsset(asset);
  const environment = inferEnvironment(asset);
  const codeA = `${shortCode(seed)}-${String((seed % 89) + 11).padStart(2, '0')}`;
  const codeB = `${shortCode(seed >>> 3)}-${String((seed % 37) + 3).padStart(2, '0')}`;
  const conceptClass = `concept-${concept}`;
  const envClass = `env-${environment}`;
  const evidenceOverlay =
    concept === 'evidence'
      ? `
        <div class="evidence-layer">
          <div class="polaroid polaroid-a"><div class="inner-shot ${envClass}"></div></div>
          <div class="polaroid polaroid-b"><div class="inner-shot ${envClass} alt"></div></div>
          <div class="marker-tag tag-a">${codeA}</div>
          <div class="marker-tag tag-b">${codeB}</div>
          <div class="thread thread-a"></div>
          <div class="thread thread-b"></div>
        </div>
      `
      : concept === 'diagram'
        ? `
          <div class="diagram-layer">
            <div class="diagram-grid"></div>
            <div class="route route-a"></div>
            <div class="route route-b"></div>
            <div class="marker marker-a"></div>
            <div class="marker marker-b"></div>
            <div class="diagram-chip chip-a">${codeA}</div>
            <div class="diagram-chip chip-b">${codeB}</div>
          </div>
        `
        : concept === 'portrait'
          ? `
            <div class="portrait-layer">
              <div class="portrait-glow"></div>
              <div class="portrait-bust"></div>
              <div class="portrait-cut"></div>
            </div>
          `
          : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --bg0: ${palette.primary};
        --bg1: ${palette.secondary};
        --accent: ${palette.accent};
        --warn: ${palette.warning};
        --ink: ${palette.ink};
        --mist: rgba(224, 214, 201, 0.08);
        --line: rgba(255, 255, 255, 0.09);
        --paper: rgba(229, 220, 205, 0.9);
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
      body {
        width: ${width}px;
        height: ${height}px;
        background:
          radial-gradient(circle at 24% 18%, rgba(255,255,255,0.08), transparent 24%),
          radial-gradient(circle at 78% 24%, rgba(172, 81, 63, 0.18), transparent 28%),
          radial-gradient(circle at 54% 76%, rgba(59, 94, 125, 0.18), transparent 42%),
          linear-gradient(145deg, var(--bg0), #06090d 58%, var(--bg1));
      }
      body::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.018) 3px 4px),
          repeating-linear-gradient(90deg, transparent 0 5px, rgba(255,255,255,0.012) 5px 6px);
        mix-blend-mode: screen;
        opacity: 0.22;
      }
      body::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at center, transparent 34%, rgba(0,0,0,0.52) 100%),
          linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.62));
      }
      .frame {
        position: relative;
        width: 100%;
        height: 100%;
        padding: ${Math.max(22, Math.floor(width * 0.02))}px;
      }
      .matte {
        position: absolute;
        inset: 18px;
        border: 1px solid var(--line);
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.03),
          0 30px 90px rgba(0,0,0,0.42);
      }
      .art {
        position: absolute;
        inset: 36px;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 18%, rgba(255,255,255,0.05), transparent 30%),
          linear-gradient(180deg, rgba(255,255,255,0.02), transparent 26%),
          linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.2));
      }
      .fog, .dust, .flare {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .fog {
        background:
          radial-gradient(circle at 25% 55%, rgba(255,255,255,0.08), transparent 24%),
          radial-gradient(circle at 74% 62%, rgba(255,255,255,0.05), transparent 26%),
          radial-gradient(circle at 52% 28%, rgba(255,255,255,0.05), transparent 22%);
        filter: blur(28px);
      }
      .dust {
        background:
          linear-gradient(104deg, transparent 22%, rgba(255,255,255,0.025) 24%, transparent 25%),
          linear-gradient(84deg, transparent 48%, rgba(255,255,255,0.02) 49%, transparent 50%),
          repeating-linear-gradient(0deg, transparent 0 18px, rgba(255,255,255,0.018) 18px 19px);
        mix-blend-mode: screen;
        opacity: 0.42;
      }
      .flare {
        background: radial-gradient(circle at 52% 16%, rgba(197, 131, 88, 0.18), transparent 24%);
        filter: blur(20px);
      }
      .environment {
        position: absolute;
        inset: 0;
      }
      .ground {
        position: absolute;
        left: -4%;
        right: -4%;
        bottom: -8%;
        height: 42%;
        background: linear-gradient(180deg, rgba(8,10,14,0), rgba(4,6,10,0.98) 34%);
      }
      .concept-poster .ground, .concept-scene .ground { height: 46%; }
      .light-column {
        position: absolute;
        width: 18%;
        top: -6%;
        bottom: 16%;
        background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0));
        filter: blur(18px);
        opacity: 0.35;
      }
      .beam-a { left: 18%; transform: rotate(-8deg); }
      .beam-b { right: 14%; transform: rotate(9deg); }
      .env-rail .track-left,
      .env-rail .track-right {
        position: absolute;
        bottom: -4%;
        width: 2px;
        height: 72%;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(204, 164, 127, 0.46));
        box-shadow: 0 0 0 1px rgba(255,255,255,0.02);
      }
      .env-rail .track-left { left: 37%; transform: rotate(11deg); }
      .env-rail .track-right { right: 37%; transform: rotate(-11deg); }
      .env-rail .platform {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 12%;
        height: 15%;
        background: linear-gradient(180deg, rgba(42,47,57,0.28), rgba(6,8,12,0.92));
        clip-path: polygon(11% 0, 89% 0, 100% 100%, 0 100%);
      }
      .env-rail .signal-post {
        position: absolute;
        right: 24%;
        top: 18%;
        width: 1.1%;
        bottom: 18%;
        background: linear-gradient(180deg, rgba(13, 17, 24, 0.1), rgba(8, 9, 14, 0.96));
      }
      .env-rail .signal-lamp {
        position: absolute;
        right: calc(24% - 14px);
        top: 24%;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(232, 126, 102, 0.95), rgba(113, 18, 12, 0.1) 70%);
        box-shadow: 0 0 26px rgba(224, 101, 80, 0.28);
      }
      .env-rail .clock-ring {
        position: absolute;
        left: 17%;
        top: 14%;
        width: 120px;
        height: 120px;
        border-radius: 999px;
        border: 2px solid rgba(221, 214, 199, 0.22);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
      }
      .env-rail .clock-ring::before,
      .env-rail .clock-ring::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 2px;
        background: rgba(228, 214, 190, 0.54);
        transform-origin: top center;
      }
      .env-rail .clock-ring::before { height: 34px; transform: translate(-50%, -100%) rotate(18deg); }
      .env-rail .clock-ring::after { height: 44px; transform: translate(-50%, -100%) rotate(126deg); }
      .env-hospital .corridor {
        position: absolute;
        inset: 8% 18% 9% 18%;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.04), transparent 16%),
          linear-gradient(90deg, rgba(0,0,0,0.8), rgba(54, 71, 84, 0.18) 20%, rgba(53,71,85,0.12) 80%, rgba(0,0,0,0.8)),
          linear-gradient(180deg, #0d1217, #05070a 72%);
        clip-path: polygon(16% 0, 84% 0, 100% 100%, 0 100%);
      }
      .env-hospital .door {
        position: absolute;
        left: 43%;
        right: 43%;
        top: 24%;
        bottom: 20%;
        background: linear-gradient(180deg, rgba(135, 168, 177, 0.18), rgba(4, 6, 10, 0.9));
        border: 1px solid rgba(255,255,255,0.08);
      }
      .env-hospital .light-bar {
        position: absolute;
        top: 9%;
        width: 22%;
        height: 2%;
        background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(215, 232, 237, 0.46), rgba(255,255,255,0.04));
        filter: blur(2px);
      }
      .env-hospital .light-bar.a { left: 26%; }
      .env-hospital .light-bar.b { right: 26%; }
      .env-hospital .gurney {
        position: absolute;
        left: 30%;
        right: 44%;
        bottom: 18%;
        height: 8%;
        border-top: 3px solid rgba(198, 202, 210, 0.36);
        border-bottom: 2px solid rgba(198, 202, 210, 0.18);
        transform: skewX(-22deg);
      }
      .env-chapel .arch {
        position: absolute;
        left: 31%;
        right: 31%;
        top: 10%;
        bottom: 18%;
        background:
          linear-gradient(180deg, rgba(140, 88, 68, 0.22), rgba(6, 6, 10, 0.92)),
          radial-gradient(circle at 50% 24%, rgba(154, 37, 29, 0.16), transparent 40%);
        clip-path: polygon(50% 0, 88% 24%, 88% 100%, 12% 100%, 12% 24%);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.05);
      }
      .env-chapel .sigil {
        position: absolute;
        left: 39%;
        right: 39%;
        bottom: 18%;
        height: 14%;
        border-radius: 999px;
        border: 2px solid rgba(192, 129, 94, 0.32);
        box-shadow: 0 0 28px rgba(188, 89, 61, 0.16);
      }
      .env-chapel .sigil::before,
      .env-chapel .sigil::after {
        content: "";
        position: absolute;
        inset: 12%;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .env-chapel .candle {
        position: absolute;
        bottom: 22%;
        width: 10px;
        height: 42px;
        background: linear-gradient(180deg, rgba(241, 227, 198, 0.9), rgba(153, 129, 103, 0.5));
      }
      .env-chapel .candle::before {
        content: "";
        position: absolute;
        left: 50%;
        top: -16px;
        width: 14px;
        height: 18px;
        transform: translateX(-50%);
        border-radius: 60% 60% 40% 40%;
        background: radial-gradient(circle at 50% 30%, rgba(255, 230, 171, 0.95), rgba(220, 88, 38, 0.18) 72%);
        box-shadow: 0 0 18px rgba(255, 178, 98, 0.18);
      }
      .env-chapel .candle.a { left: 24%; }
      .env-chapel .candle.b { right: 24%; }
      .env-forest .tree-line {
        position: absolute;
        left: -5%;
        right: -5%;
        bottom: 16%;
        height: 36%;
        background:
          radial-gradient(circle at 12% 100%, rgba(7,8,11,0.96) 0 16%, transparent 17%),
          radial-gradient(circle at 24% 100%, rgba(7,8,11,0.96) 0 14%, transparent 15%),
          radial-gradient(circle at 38% 100%, rgba(7,8,11,0.96) 0 18%, transparent 19%),
          radial-gradient(circle at 52% 100%, rgba(7,8,11,0.96) 0 13%, transparent 14%),
          radial-gradient(circle at 66% 100%, rgba(7,8,11,0.96) 0 17%, transparent 18%),
          radial-gradient(circle at 82% 100%, rgba(7,8,11,0.96) 0 15%, transparent 16%);
      }
      .env-forest .tower {
        position: absolute;
        left: 48%;
        width: 3px;
        top: 16%;
        bottom: 16%;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.96));
      }
      .env-forest .tower::before {
        content: "";
        position: absolute;
        left: 50%;
        top: -10px;
        width: 34px;
        height: 34px;
        transform: translateX(-50%);
        border-radius: 999px;
        border: 2px solid rgba(255,255,255,0.18);
      }
      .env-forest .path {
        position: absolute;
        left: 38%;
        right: 38%;
        bottom: -4%;
        top: 48%;
        background: linear-gradient(180deg, rgba(111, 122, 129, 0.12), rgba(6,7,10,0.88));
        clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
      }
      .env-apartment .windows {
        position: absolute;
        inset: 10% 20% 18% 20%;
        background:
          linear-gradient(90deg, transparent 0 7%, rgba(0,0,0,0.84) 7% 11%, transparent 11% 21%, rgba(0,0,0,0.84) 21% 25%, transparent 25% 39%, rgba(0,0,0,0.84) 39% 43%, transparent 43% 57%, rgba(0,0,0,0.84) 57% 61%, transparent 61% 75%, rgba(0,0,0,0.84) 75% 79%, transparent 79% 93%, rgba(0,0,0,0.84) 93% 97%, transparent 97%),
          linear-gradient(180deg, transparent 0 10%, rgba(0,0,0,0.84) 10% 14%, transparent 14% 31%, rgba(0,0,0,0.84) 31% 35%, transparent 35% 54%, rgba(0,0,0,0.84) 54% 58%, transparent 58% 76%, rgba(0,0,0,0.84) 76% 80%, transparent 80%),
          linear-gradient(180deg, rgba(243, 205, 148, 0.12), rgba(25, 33, 44, 0.2) 34%, rgba(6,8,12,0.94));
        box-shadow: 0 0 0 1px rgba(255,255,255,0.05);
      }
      .env-apartment .figure {
        position: absolute;
        left: 48%;
        right: 44%;
        top: 28%;
        bottom: 20%;
        background:
          radial-gradient(circle at 50% 14%, rgba(0,0,0,0.92) 0 16%, transparent 17%),
          linear-gradient(180deg, transparent 18%, rgba(0,0,0,0.96) 19%);
        clip-path: polygon(50% 0, 72% 12%, 76% 30%, 82% 60%, 66% 100%, 34% 100%, 18% 60%, 24% 30%, 28% 12%);
      }
      .env-maritime .horizon {
        position: absolute;
        left: -4%;
        right: -4%;
        bottom: 26%;
        height: 2px;
        background: rgba(209, 217, 222, 0.18);
      }
      .env-maritime .water {
        position: absolute;
        left: -5%;
        right: -5%;
        bottom: -4%;
        height: 34%;
        background:
          repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px),
          linear-gradient(180deg, rgba(40, 63, 80, 0.42), rgba(3,5,8,0.96));
      }
      .env-maritime .pier {
        position: absolute;
        left: 41%;
        right: 41%;
        bottom: 0;
        top: 42%;
        background: linear-gradient(180deg, rgba(103, 91, 78, 0.18), rgba(5, 6, 10, 0.96));
        clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
      }
      .env-maritime .beacon {
        position: absolute;
        right: 22%;
        top: 18%;
        width: 3px;
        bottom: 26%;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.92));
      }
      .env-maritime .beacon::before {
        content: "";
        position: absolute;
        left: 50%;
        top: -8px;
        width: 30px;
        height: 30px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: radial-gradient(circle, rgba(244, 177, 124, 0.7), rgba(180, 92, 47, 0.08) 72%);
      }
      .env-industrial .stacks {
        position: absolute;
        inset: 10% 18% 18% 18%;
        background:
          linear-gradient(90deg, rgba(0,0,0,0.82) 0 7%, transparent 7% 17%, rgba(0,0,0,0.82) 17% 23%, transparent 23% 34%, rgba(0,0,0,0.82) 34% 40%, transparent 40% 60%, rgba(0,0,0,0.82) 60% 66%, transparent 66% 77%, rgba(0,0,0,0.82) 77% 83%, transparent 83% 93%, rgba(0,0,0,0.82) 93% 100%),
          linear-gradient(180deg, rgba(95, 120, 138, 0.18), rgba(8,10,15,0.94));
      }
      .env-industrial .screen {
        position: absolute;
        left: 24%;
        right: 52%;
        top: 20%;
        height: 12%;
        background: linear-gradient(180deg, rgba(100, 165, 190, 0.22), rgba(8, 20, 28, 0.9));
        box-shadow: 0 0 22px rgba(88, 159, 185, 0.12);
      }
      .env-industrial .coil {
        position: absolute;
        right: 18%;
        top: 18%;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        border: 2px solid rgba(178, 191, 208, 0.1);
        box-shadow: inset 0 0 0 14px rgba(255,255,255,0.02);
      }
      .env-industrial .coil::before,
      .env-industrial .coil::after {
        content: "";
        position: absolute;
        inset: 18%;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .evidence-layer, .diagram-layer, .portrait-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .polaroid {
        position: absolute;
        width: 32%;
        height: 36%;
        padding: 12px;
        background: rgba(241, 233, 220, 0.94);
        box-shadow: 0 18px 42px rgba(0,0,0,0.42);
      }
      .polaroid-a { left: 12%; top: 14%; transform: rotate(-6deg); }
      .polaroid-b { right: 12%; bottom: 16%; transform: rotate(5deg); }
      .inner-shot {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.56));
      }
      .inner-shot.alt { filter: saturate(0.72) brightness(0.9); }
      .inner-shot::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08), transparent 20%),
          linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.36));
      }
      .env-rail.inner-shot { background: linear-gradient(180deg, rgba(35,43,57,0.22), rgba(7,9,13,0.94)); }
      .env-rail.inner-shot::after {
        content: "";
        position: absolute;
        left: 28%;
        right: 28%;
        bottom: -8%;
        top: 38%;
        background:
          linear-gradient(180deg, rgba(193, 160, 114, 0.12), rgba(5,6,9,0.94));
        clip-path: polygon(36% 0, 64% 0, 100% 100%, 0 100%);
      }
      .env-hospital.inner-shot { background: linear-gradient(180deg, rgba(114,144,156,0.16), rgba(5,8,12,0.94)); }
      .env-hospital.inner-shot::after {
        content: "";
        position: absolute;
        left: 42%;
        right: 42%;
        top: 18%;
        bottom: 14%;
        background: linear-gradient(180deg, rgba(170, 196, 204, 0.16), rgba(4,5,8,0.92));
      }
      .env-chapel.inner-shot { background: linear-gradient(180deg, rgba(138,76,60,0.16), rgba(8,7,10,0.94)); }
      .env-chapel.inner-shot::after {
        content: "";
        position: absolute;
        left: 36%;
        right: 36%;
        top: 14%;
        bottom: 14%;
        background: linear-gradient(180deg, rgba(139, 25, 18, 0.2), rgba(5,5,8,0.96));
        clip-path: polygon(50% 0, 88% 24%, 88% 100%, 12% 100%, 12% 24%);
      }
      .env-forest.inner-shot { background: linear-gradient(180deg, rgba(73,96,105,0.18), rgba(5,7,8,0.96)); }
      .env-forest.inner-shot::after {
        content: "";
        position: absolute;
        left: -4%;
        right: -4%;
        bottom: -6%;
        height: 44%;
        background:
          radial-gradient(circle at 12% 100%, rgba(7,8,11,0.96) 0 16%, transparent 17%),
          radial-gradient(circle at 34% 100%, rgba(7,8,11,0.96) 0 18%, transparent 19%),
          radial-gradient(circle at 56% 100%, rgba(7,8,11,0.96) 0 13%, transparent 14%),
          radial-gradient(circle at 78% 100%, rgba(7,8,11,0.96) 0 17%, transparent 18%);
      }
      .env-apartment.inner-shot { background: linear-gradient(180deg, rgba(198,167,119,0.14), rgba(6,8,12,0.96)); }
      .env-apartment.inner-shot::after {
        content: "";
        position: absolute;
        inset: 8% 18%;
        background:
          linear-gradient(90deg, transparent 0 12%, rgba(0,0,0,0.84) 12% 18%, transparent 18% 40%, rgba(0,0,0,0.84) 40% 46%, transparent 46% 68%, rgba(0,0,0,0.84) 68% 74%, transparent 74% 100%),
          linear-gradient(180deg, transparent 0 18%, rgba(0,0,0,0.84) 18% 24%, transparent 24% 50%, rgba(0,0,0,0.84) 50% 56%, transparent 56% 82%, rgba(0,0,0,0.84) 82% 88%, transparent 88%);
      }
      .env-maritime.inner-shot { background: linear-gradient(180deg, rgba(71,95,118,0.18), rgba(5,7,10,0.96)); }
      .env-maritime.inner-shot::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: -4%;
        height: 36%;
        background: linear-gradient(180deg, rgba(45,67,82,0.4), rgba(4,5,8,0.96));
      }
      .env-industrial.inner-shot { background: linear-gradient(180deg, rgba(63,83,95,0.18), rgba(6,8,12,0.96)); }
      .env-industrial.inner-shot::after {
        content: "";
        position: absolute;
        inset: 10% 14%;
        background:
          linear-gradient(90deg, rgba(0,0,0,0.82) 0 10%, transparent 10% 24%, rgba(0,0,0,0.82) 24% 34%, transparent 34% 48%, rgba(0,0,0,0.82) 48% 58%, transparent 58% 72%, rgba(0,0,0,0.82) 72% 82%, transparent 82% 100%);
      }
      .marker-tag, .diagram-chip {
        position: absolute;
        padding: 10px 12px;
        background: rgba(232, 219, 201, 0.94);
        color: #241d17;
        font: 600 12px/1.1 "Courier New", monospace;
        letter-spacing: 0.14em;
        box-shadow: 0 12px 24px rgba(0,0,0,0.26);
      }
      .tag-a { right: 16%; top: 18%; transform: rotate(4deg); }
      .tag-b { left: 20%; bottom: 15%; transform: rotate(-3deg); }
      .thread {
        position: absolute;
        height: 2px;
        background: linear-gradient(90deg, rgba(176, 34, 34, 0.9), rgba(176, 34, 34, 0.35));
        transform-origin: left center;
      }
      .thread-a { left: 34%; top: 33%; width: 36%; transform: rotate(-18deg); }
      .thread-b { left: 24%; top: 59%; width: 40%; transform: rotate(11deg); }
      .diagram-grid {
        position: absolute;
        inset: 10% 12%;
        background:
          repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 56px),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 56px),
          linear-gradient(135deg, rgba(89, 113, 132, 0.2), rgba(5, 7, 11, 0.86));
        border: 1px solid rgba(255,255,255,0.07);
      }
      .route {
        position: absolute;
        height: 2px;
        background: linear-gradient(90deg, rgba(196, 92, 92, 0.94), rgba(196, 92, 92, 0.42));
        transform-origin: left center;
      }
      .route-a { left: 18%; top: 34%; width: 42%; transform: rotate(14deg); }
      .route-b { left: 44%; top: 62%; width: 24%; transform: rotate(-31deg); }
      .marker {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: var(--warn);
        box-shadow: 0 0 0 8px rgba(176, 84, 66, 0.14);
      }
      .marker-a { left: 18%; top: 31%; }
      .marker-b { left: 64%; top: 58%; }
      .chip-a { left: 14%; top: 18%; }
      .chip-b { right: 18%; bottom: 18%; }
      .portrait-layer {
        background: radial-gradient(circle at 50% 38%, rgba(170, 112, 78, 0.14), transparent 28%);
      }
      .portrait-glow {
        position: absolute;
        inset: 16% 28% 14% 28%;
        background: radial-gradient(circle, rgba(190, 133, 88, 0.2), transparent 64%);
        filter: blur(22px);
      }
      .portrait-bust {
        position: absolute;
        left: 34%;
        right: 34%;
        top: 16%;
        bottom: 10%;
        background:
          radial-gradient(circle at 50% 18%, rgba(0,0,0,0.92) 0 18%, transparent 19%),
          linear-gradient(180deg, transparent 22%, rgba(0,0,0,0.96) 23%);
        clip-path: polygon(50% 0, 68% 10%, 74% 26%, 82% 58%, 66% 100%, 34% 100%, 18% 58%, 26% 26%, 32% 10%);
        box-shadow: 0 26px 80px rgba(0,0,0,0.58);
      }
      .portrait-cut {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(103deg, transparent 18%, rgba(255,255,255,0.03) 20%, transparent 21%),
          linear-gradient(0deg, transparent 0 18px, rgba(255,255,255,0.016) 18px 19px);
        mix-blend-mode: screen;
        opacity: 0.36;
      }
      .subtle-stamp {
        position: absolute;
        right: 18px;
        bottom: 18px;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(4, 5, 8, 0.34);
        color: rgba(233, 220, 198, 0.55);
        font: 600 11px/1 "Courier New", monospace;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .concept-poster .subtle-stamp,
      .concept-scene .subtle-stamp,
      .concept-portrait .subtle-stamp {
        opacity: 0.35;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="matte"></div>
      <div class="art ${envClass} ${conceptClass}">
        <div class="environment">
          <div class="light-column beam-a"></div>
          <div class="light-column beam-b"></div>
          <div class="ground"></div>
          <div class="track-left"></div>
          <div class="track-right"></div>
          <div class="platform"></div>
          <div class="signal-post"></div>
          <div class="signal-lamp"></div>
          <div class="clock-ring"></div>
          <div class="corridor"></div>
          <div class="door"></div>
          <div class="light-bar a"></div>
          <div class="light-bar b"></div>
          <div class="gurney"></div>
          <div class="arch"></div>
          <div class="sigil"></div>
          <div class="candle a"></div>
          <div class="candle b"></div>
          <div class="tree-line"></div>
          <div class="tower"></div>
          <div class="path"></div>
          <div class="windows"></div>
          <div class="figure"></div>
          <div class="horizon"></div>
          <div class="water"></div>
          <div class="pier"></div>
          <div class="beacon"></div>
          <div class="stacks"></div>
          <div class="screen"></div>
          <div class="coil"></div>
        </div>
        ${evidenceOverlay}
        <div class="fog"></div>
        <div class="dust"></div>
        <div class="flare"></div>
        <div class="subtle-stamp">${concept === 'evidence' || concept === 'diagram' ? codeA : codeB}</div>
      </div>
    </div>
  </body>
</html>`;
}

async function renderLocalImageAsset(asset, outputPath, seed) {
  const { chromium } = await import('@playwright/test');
  const width = Number(asset.specs?.width) || 1600;
  const height = Number(asset.specs?.height) || 900;
  const html = renderThematicArtHtml(asset, seed, width, height);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: {
        width,
        height
      },
      deviceScaleFactor: 1
    });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({
      path: outputPath,
      type: 'png',
      timeout: 120_000
    });
  } finally {
    await browser.close();
  }
}

function durationToSeconds(input) {
  const match = /Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d{2})/i.exec(input);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function detectImageFormat(buffer) {
  if (buffer.length >= 12) {
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    if (isPng) {
      return 'png';
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (isJpeg) {
      return 'jpg';
    }

    const riff = String.fromCharCode(...buffer.subarray(0, 4));
    const webp = String.fromCharCode(...buffer.subarray(8, 12));
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'webp';
    }
  }

  return null;
}

async function ensureFfmpegBinary() {
  if (!ffmpegBinary) {
    throw new Error('ffmpeg binary not available.');
  }

  if (await fileExists(ffmpegBinary)) {
    return;
  }

  throw new Error(`ffmpeg binary missing at ${String(ffmpegBinary)}`);
}

export async function runProcess(binary, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000;

  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGKILL');
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr: `${stderr}\nTimed out after ${timeoutMs}ms`.trim()
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr
      });
    });
  });
}

export function outputPathForAsset(asset) {
  return join(repoRoot, asset.outputKey);
}

export function thumbnailPathForAsset(asset) {
  if (asset.modality === 'image') {
    return outputPathForAsset(asset).replace(/\.(png|jpg|jpeg|webp)$/i, '.thumb.jpg');
  }
  if (asset.modality === 'video') {
    return outputPathForAsset(asset).replace(/\.(mp4|webm)$/i, '.thumb.jpg');
  }
  return null;
}

export function publicPathForFile(path) {
  const rel = relative(publicRoot, path);
  if (rel.startsWith('..')) {
    return null;
  }
  return `/${rel.replaceAll('\\', '/')}`;
}

function workingPathForFile(path) {
  return path.replace(/(\.[^.]+)$/i, '.work$1');
}

export async function mirrorIntoPublic(path) {
  const rel = relative(productionAgentArmyRoot, path);
  if (rel.startsWith('..')) {
    return null;
  }
  const target = join(publicAgentArmyRoot, rel);
  await ensureDir(dirname(target));
  await copyFile(path, target);
  return target;
}

async function normalizeDownloadedImage(tempInputPath, outputPath) {
  await ensureFfmpegBinary();
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    tempInputPath,
    '-frames:v',
    '1',
    '-pix_fmt',
    'rgba',
    '-y',
    outputPath
  ];

  const result = await runProcess(ffmpegBinary, args, { timeoutMs: 120_000 });
  if (!result.ok) {
    throw new Error(`ffmpeg image normalize failed (${result.code ?? 'unknown'}): ${result.stderr}`);
  }
}

async function generateImageWithOpenAI(asset, outputPath, seed, timeoutMs) {
  const apiKey = String(process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'sk_replace') {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
  const prompt = buildHighFidelityImagePrompt(asset);
  const size = openAiImageSizeForAsset(asset);
  const quality = openAiImageQualityForAsset(asset);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        output_format: 'png'
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        payload?.error?.message ??
        payload?.message ??
        `provider returned ${response.status}`;
      throw new Error(errorMessage);
    }

    const imageData = payload?.data?.[0];
    if (!imageData) {
      throw new Error('OpenAI payload did not include image data');
    }

    let bytes = null;
    if (typeof imageData.b64_json === 'string' && imageData.b64_json.length > 0) {
      bytes = Buffer.from(imageData.b64_json, 'base64');
    } else if (typeof imageData.url === 'string' && imageData.url.length > 0) {
      const download = await fetch(imageData.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'image/*'
        }
      });
      if (!download.ok) {
        throw new Error(`OpenAI image download returned ${download.status}`);
      }
      bytes = Buffer.from(await download.arrayBuffer());
    }

    if (!bytes || bytes.length === 0) {
      throw new Error('OpenAI image response was empty');
    }

    const detected = detectImageFormat(bytes);
    if (!detected) {
      throw new Error('OpenAI payload was not a supported image');
    }

    const tempSource = `${outputPath}.openai.${detected}`;
    await writeFile(tempSource, bytes);
    try {
      await normalizeDownloadedImage(tempSource, outputPath);
    } finally {
      await unlink(tempSource).catch(() => {});
    }

    return {
      toolUsed: `openai:${model}`,
      promptUsed: prompt,
      providerMetadata: {
        model,
        size,
        quality
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function generateImageWithPollinations(asset, outputPath, seed, timeoutMs, attempt) {
  const width = Number(asset.specs?.width) || 1024;
  const height = Number(asset.specs?.height) || 1024;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(buildHighFidelityImagePrompt(asset))}?width=${width}&height=${height}&seed=${seed + attempt}&nologo=true`;
  const tempSource = `${outputPath}.pollinations-${attempt}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'image/*',
        'User-Agent': 'MyHorrorStory/asset-pipeline'
      }
    });
    if (!response.ok) {
      throw new Error(`provider returned ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const detected = detectImageFormat(bytes);
    if (!detected) {
      throw new Error('provider payload was not a supported image');
    }

    const sourcePath = `${tempSource}.${detected}`;
    await writeFile(sourcePath, bytes);
    try {
      await normalizeDownloadedImage(sourcePath, outputPath);
    } finally {
      await unlink(sourcePath).catch(() => {});
    }

    return {
      toolUsed: 'pollinations-free',
      promptUsed: buildHighFidelityImagePrompt(asset),
      providerMetadata: {
        width,
        height,
        seed: seed + attempt
      }
    };
  } finally {
    clearTimeout(timer);
    await unlink(tempSource).catch(() => {});
  }
}

async function generateThumbnail(inputPath, outputPath) {
  await ensureFfmpegBinary();
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    inputPath,
    '-vf',
    'scale=480:-1:force_original_aspect_ratio=decrease',
    '-frames:v',
    '1',
    '-q:v',
    '3',
    '-y',
    outputPath
  ];

  const result = await runProcess(ffmpegBinary, args, { timeoutMs: 120_000 });
  if (!result.ok) {
    throw new Error(`ffmpeg thumbnail generation failed (${result.code ?? 'unknown'}): ${result.stderr}`);
  }
}

async function probeWithFfmpeg(path) {
  await ensureFfmpegBinary();
  const args = ['-hide_banner', '-i', path, '-f', 'null', '-'];
  return runProcess(ffmpegBinary, args, { timeoutMs: 120_000 });
}

export async function validateFileForAsset(asset, outputPath) {
  const extension = extname(outputPath).toLowerCase();
  const outputStat = await stat(outputPath);
  if (outputStat.size <= 0) {
    throw new Error('file size is zero');
  }

  if (asset.modality === 'image') {
    if (!IMAGE_EXTENSIONS.has(extension)) {
      throw new Error(`unexpected image extension: ${extension}`);
    }
    const probe = await probeWithFfmpeg(outputPath);
    if (!probe.ok) {
      throw new Error(`image validation failed: ${probe.stderr}`);
    }
    return {
      fileSize: outputStat.size
    };
  }

  if (asset.modality === 'audio') {
    if (!AUDIO_EXTENSIONS.has(extension)) {
      throw new Error(`unexpected audio extension: ${extension}`);
    }
    const probe = await probeWithFfmpeg(outputPath);
    const durationSeconds = durationToSeconds(probe.stderr);
    if (!probe.ok || !durationSeconds || durationSeconds <= 0) {
      throw new Error(`audio validation failed: ${probe.stderr}`);
    }
    return {
      fileSize: outputStat.size,
      durationSeconds
    };
  }

  if (asset.modality === 'video') {
    if (!VIDEO_EXTENSIONS.has(extension)) {
      throw new Error(`unexpected video extension: ${extension}`);
    }
    const probe = await probeWithFfmpeg(outputPath);
    const durationSeconds = durationToSeconds(probe.stderr);
    const hasAudioTrack = /Audio:/i.test(probe.stderr);
    if (!probe.ok || !durationSeconds || durationSeconds <= 0) {
      throw new Error(`video validation failed: ${probe.stderr}`);
    }
    if (durationSeconds <= 4 || durationSeconds >= 60) {
      throw new Error(
        `video duration out of production range (${durationSeconds.toFixed(
          2
        )}s). Expected >4s and <60s.`
      );
    }
    if (!hasAudioTrack) {
      throw new Error('video validation failed: missing audio track');
    }
    return {
      fileSize: outputStat.size,
      durationSeconds,
      hasAudioTrack
    };
  }

  if (asset.modality === 'artifact' || asset.modality === 'web') {
    const minimum = MIN_SIZE_BY_MODALITY[asset.modality] ?? 128;
    if (outputStat.size < minimum) {
      throw new Error(`file too small: ${outputStat.size} bytes`);
    }
    return {
      fileSize: outputStat.size
    };
  }

  throw new Error(`unsupported modality: ${asset.modality}`);
}

export async function loadPlanAssets() {
  return getPlanAssetsCached();
}

export function filterPlanAssets(assets, filters) {
  const selected = assets.filter((asset) => {
    if (filters.storyId && asset.storyId !== filters.storyId) {
      return false;
    }
    if (filters.assetId && asset.id !== filters.assetId) {
      return false;
    }
    if (filters.modality && asset.modality !== filters.modality) {
      return false;
    }
    if (filters.scope && asset.scope !== filters.scope) {
      return false;
    }
    return true;
  });

  const hasStart = filters.start !== null && filters.start !== undefined;
  const hasLimit = filters.limit !== null && filters.limit !== undefined;
  const start = hasStart && Number.isFinite(Number(filters.start)) ? Math.max(0, Number(filters.start)) : 0;
  const limit = hasLimit && Number.isFinite(Number(filters.limit)) ? Math.max(1, Number(filters.limit)) : null;
  return selected.slice(start, limit ? start + limit : undefined);
}

function resolveAudioFlavor(asset, seed) {
  const prompt = String(asset.prompt ?? '').toLowerCase();
  const category = String(asset.category ?? '').toLowerCase();
  const subgenre = String(extractPromptSegment(asset.prompt, 'Subgenre') ?? '').toLowerCase();
  const tone = String(extractPromptSegment(asset.prompt, 'Tone') ?? '').toLowerCase();
  const base = {
    low: 38 + (seed % 19),
    mid: 172 + (seed % 96),
    high: 740 + (seed % 640),
    shimmer: 2280 + (seed % 1800),
    pulseHz: 1.05 + ((seed % 14) / 12),
    whisperLow: 1700,
    whisperHigh: 4200,
    tension: 0.55,
    wet: 0.22
  };

  if (subgenre.includes('gothic') || prompt.includes('cathedral') || prompt.includes('chapel')) {
    return { ...base, low: 46, mid: 214, high: 702, shimmer: 1880, pulseHz: 0.72, wet: 0.28 };
  }
  if (subgenre.includes('folk') || prompt.includes('forest') || prompt.includes('harvest')) {
    return { ...base, low: 42, mid: 192, high: 620, shimmer: 1760, pulseHz: 0.86, wet: 0.2 };
  }
  if (subgenre.includes('cosmic') || prompt.includes('signal') || prompt.includes('orbit')) {
    return { ...base, low: 31, mid: 158, high: 1280, shimmer: 3420, pulseHz: 0.54, wet: 0.32 };
  }
  if (subgenre.includes('techno') || prompt.includes('grid') || prompt.includes('protocol')) {
    return { ...base, low: 55, mid: 246, high: 1160, shimmer: 3100, pulseHz: 1.44, wet: 0.16 };
  }
  if (subgenre.includes('slasher') || prompt.includes('winter')) {
    return { ...base, low: 48, mid: 206, high: 980, shimmer: 2560, pulseHz: 1.62, wet: 0.14 };
  }
  if (subgenre.includes('institution') || prompt.includes('hospital') || prompt.includes('ward')) {
    return { ...base, low: 36, mid: 220, high: 860, shimmer: 2980, pulseHz: 0.94, wet: 0.24 };
  }
  if (tone.includes('intense')) {
    return { ...base, pulseHz: 1.72, tension: 0.72, wet: 0.18 };
  }
  if (category.includes('ending')) {
    return { ...base, mid: base.mid + 26, high: base.high + 120, pulseHz: Math.max(0.6, base.pulseHz - 0.18), wet: 0.28 };
  }
  return base;
}

function buildHorrorAudioRecipe(asset, seed, durationSeconds) {
  const flavor = resolveAudioFlavor(asset, seed);
  const channels = asset.specs?.channels === 1 ? 1 : 2;
  const isVoice = String(asset.category ?? '').includes('voice');
  const sources = [
    `anoisesrc=color=brown:amplitude=0.26:duration=${durationSeconds}:sample_rate=48000`,
    `anoisesrc=color=white:amplitude=0.08:duration=${durationSeconds}:sample_rate=48000`,
    `sine=frequency=${flavor.low}:sample_rate=48000:duration=${durationSeconds}`,
    `sine=frequency=${flavor.mid}:sample_rate=48000:duration=${durationSeconds}`,
    `sine=frequency=${flavor.high}:sample_rate=48000:duration=${durationSeconds}`,
    `sine=frequency=${flavor.shimmer}:sample_rate=48000:duration=${durationSeconds}`
  ];

  const outputLabel = isVoice ? '[voiceout]' : '[outa]';
  const filterComplex = [
    `[0:a]volume=0.54,lowpass=f=240,highpass=f=18,aecho=0.8:0.92:${Math.round(300 + flavor.wet * 200)}:${(0.11 + flavor.wet).toFixed(2)}[bed]`,
    `[1:a]volume=0.06,highpass=f=${flavor.whisperLow},lowpass=f=${flavor.whisperHigh},tremolo=f=${flavor.pulseHz.toFixed(2)}:d=0.72,aecho=0.6:0.8:90:0.12[whisper]`,
    `[2:a]volume=0.04,lowpass=f=120,highpass=f=18,aecho=0.7:0.92:680:0.18[sub]`,
    `[3:a]volume=0.018,highpass=f=160,lowpass=f=1300,vibrato=f=${(2.2 + flavor.tension * 2.2).toFixed(2)}:d=0.16,aecho=0.7:0.86:200:0.2[motif]`,
    `[4:a]volume=0.013,highpass=f=820,lowpass=f=3300,tremolo=f=${(flavor.pulseHz * 1.35).toFixed(2)}:d=0.82,aecho=0.6:0.78:84:0.14[pulse]`,
    `[5:a]volume=0.007,highpass=f=1700,lowpass=f=7000,vibrato=f=5.4:d=0.05,aecho=0.5:0.72:42:0.12[air]`,
    `[bed][whisper][sub][motif][pulse][air]amix=inputs=6:weights=1 0.38 0.5 0.26 0.18 0.1,volume=0.96,alimiter=limit=0.92${channels === 1 ? ',pan=mono|c0=.5*c0+.5*c1' : ''}${outputLabel}`
  ].join(';');

  return {
    sources,
    filterComplex,
    outputLabel,
    flavor
  };
}

async function loadGeneratedAssetsForStory(storyId, modality) {
  const planAssets = await getPlanAssetsCached();
  const matching = planAssets.filter((asset) => asset.storyId === storyId && asset.modality === modality);
  const entries = [];

  for (const asset of matching) {
    const outputPath = outputPathForAsset(asset);
    const metadataPath = `${outputPath}.meta.json`;
    if (!(await fileExists(outputPath)) || !(await fileExists(metadataPath))) {
      continue;
    }

    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      if (metadata.generatedProxy === true) {
        continue;
      }
      if ((metadata.tool_used ?? metadata.toolUsed) === LOCAL_FALLBACK_TOOL) {
        continue;
      }
      entries.push({ asset, outputPath, metadata });
    } catch {
      // Skip corrupt metadata and let the verifier report it elsewhere.
    }
  }

  return entries;
}

function takeUniquePaths(entries, maximum) {
  const seen = new Set();
  const selected = [];

  for (const entry of entries) {
    if (!entry || seen.has(entry.outputPath)) {
      continue;
    }
    seen.add(entry.outputPath);
    selected.push(entry.outputPath);
    if (selected.length >= maximum) {
      break;
    }
  }

  return selected;
}

async function pickVideoImageInputs(asset) {
  const storyImages = await loadGeneratedAssetsForStory(asset.storyId, 'image');
  const byId = new Map(storyImages.map((entry) => [entry.asset.id, entry]));
  const category = String(asset.category ?? '').toLowerCase();

  if (category === 'beat_transition_video') {
    const sceneId = asset.id.replace(/beat-transition$/i, 'beat-scene');
    return takeUniquePaths(
      [
        byId.get(sceneId),
        storyImages.find((entry) => entry.asset.category === 'evidence_still'),
        storyImages.find((entry) => entry.asset.category === 'story_key_art')
      ],
      3
    );
  }

  if (category === 'arc_teaser_video') {
    const arcSlugMatch = /-(arc-[a-z0-9-]+)-arc-teaser-video$/i.exec(asset.id);
    const arcSlug = arcSlugMatch?.[1] ?? '';
    return takeUniquePaths(
      [
        storyImages.find((entry) => entry.asset.category === 'arc_key_art' && entry.asset.id.includes(arcSlug)),
        ...storyImages.filter((entry) => entry.asset.category === 'beat_scene_art').slice(0, 2),
        storyImages.find((entry) => entry.asset.category === 'villain_portrait')
      ],
      4
    );
  }

  if (category === 'ending_recap_video') {
    const endingSlug = asset.id.replace(/-ending-recap-video$/i, '');
    return takeUniquePaths(
      [
        storyImages.find((entry) => entry.asset.category === 'ending_card' && entry.asset.id.startsWith(endingSlug)),
        storyImages.find((entry) => entry.asset.category === 'story_key_art'),
        storyImages.find((entry) => entry.asset.category === 'villain_portrait'),
        ...storyImages.filter((entry) => entry.asset.category === 'beat_scene_art').slice(-2)
      ],
      4
    );
  }

  return takeUniquePaths(
    [
      storyImages.find((entry) => entry.asset.category === 'story_key_art'),
      ...storyImages.filter((entry) => entry.asset.category === 'arc_key_art').slice(0, 2),
      ...storyImages.filter((entry) => entry.asset.category === 'beat_scene_art').slice(0, 3),
      storyImages.find((entry) => entry.asset.category === 'villain_portrait')
    ],
    6
  );
}

async function pickStoryAmbientAudioPath(storyId, preferredAssetId = null) {
  const storyAudio = await loadGeneratedAssetsForStory(storyId, 'audio');
  if (preferredAssetId) {
    const direct = storyAudio.find((entry) => entry.asset.id === preferredAssetId);
    if (direct) {
      return direct.outputPath;
    }
  }

  return (
    storyAudio.find((entry) => entry.asset.category === 'story_theme_loop')?.outputPath ??
    storyAudio.find((entry) => entry.asset.category === 'arc_ambience')?.outputPath ??
    storyAudio.find((entry) => entry.asset.category === 'ending_score')?.outputPath ??
    null
  );
}

async function pickVideoAudioInput(asset) {
  const category = String(asset.category ?? '').toLowerCase();

  if (category === 'arc_teaser_video') {
    const targetId = asset.id.replace(/arc-teaser-video$/i, 'arc-ambience');
    return pickStoryAmbientAudioPath(asset.storyId, targetId);
  }

  if (category === 'ending_recap_video') {
    const targetId = asset.id.replace(/ending-recap-video$/i, 'ending-score');
    return pickStoryAmbientAudioPath(asset.storyId, targetId);
  }

  return pickStoryAmbientAudioPath(asset.storyId);
}

function resolveVideoDuration(asset, imageCount) {
  const category = String(asset.category ?? '').toLowerCase();
  const planned = Number(asset.specs?.durationSeconds);
  if (Number.isFinite(planned) && planned > 0 && category === 'story_trailer') {
    return clamp(planned, 16, VIDEO_DURATION_MAX_SECONDS);
  }
  if (category === 'beat_transition_video') {
    return 6;
  }
  if (category === 'arc_teaser_video') {
    return 18;
  }
  if (category === 'ending_recap_video') {
    return 24;
  }
  return clamp(Math.max(10, imageCount * 4), VIDEO_DURATION_MIN_SECONDS, 40);
}

async function generateVideoMontageAsset(asset, outputPath, timeoutMs) {
  await ensureFfmpegBinary();
  const imagePaths = await pickVideoImageInputs(asset);
  if (imagePaths.length === 0) {
    throw new Error('no verified image sources available for video montage');
  }

  const width = Number(asset.specs?.width) || 1920;
  const height = Number(asset.specs?.height) || 1080;
  const fps = Number(asset.specs?.fps) || 24;
  const durationSeconds = resolveVideoDuration(asset, imagePaths.length);
  const transitionSeconds = imagePaths.length > 1 ? 0.45 : 0;
  const segmentSeconds =
    imagePaths.length > 1
      ? (durationSeconds + transitionSeconds * (imagePaths.length - 1)) / imagePaths.length
      : durationSeconds;
  const totalFrames = Math.max(1, Math.round(segmentSeconds * fps));
  const audioPath = await pickVideoAudioInput(asset);
  const videoVoicePath = `${outputPath}.voiceover.tmp.wav`;
  let voiceover = null;

  try {
    voiceover = await generateVideoVoiceoverTrack(asset, videoVoicePath, Math.max(timeoutMs, 90_000));
  } catch (error) {
    throw new Error(
      `video voiceover generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const args = ['-hide_banner', '-loglevel', 'error'];
  const filterParts = [];

  for (const imagePath of imagePaths) {
    args.push('-loop', '1', '-t', segmentSeconds.toFixed(3), '-i', imagePath);
  }

  if (audioPath) {
    args.push('-stream_loop', '-1', '-i', audioPath);
  }
  if (voiceover?.outputPath) {
    args.push('-i', voiceover.outputPath);
  }

  imagePaths.forEach((_, index) => {
    filterParts.push(
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(zoom+0.0009,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},trim=duration=${segmentSeconds.toFixed(3)},setpts=PTS-STARTPTS[v${index}]`
    );
  });

  let currentLabel = '[v0]';
  let transitionOffset = segmentSeconds - transitionSeconds;
  for (let index = 1; index < imagePaths.length; index += 1) {
    const nextLabel = `[v${index}]`;
    const outputLabel = `[vx${index}]`;
    filterParts.push(
      `${currentLabel}${nextLabel}xfade=transition=fade:duration=${transitionSeconds.toFixed(3)}:offset=${transitionOffset.toFixed(3)}${outputLabel}`
    );
    currentLabel = outputLabel;
    transitionOffset += segmentSeconds - transitionSeconds;
  }

  filterParts.push(
    `${currentLabel}eq=saturation=0.92:contrast=1.05:brightness=-0.025,noise=alls=8:allf=t+u,vignette=PI/5,format=yuv420p[videoout]`
  );

  const ambientInputIndex = audioPath ? imagePaths.length : null;
  const voiceInputIndex =
    voiceover?.outputPath ? imagePaths.length + (audioPath ? 1 : 0) : null;

  if (ambientInputIndex !== null) {
    filterParts.push(
      `[${ambientInputIndex}:a]atrim=duration=${durationSeconds.toFixed(3)},asetpts=PTS-STARTPTS,volume=0.24,afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(
        durationSeconds - 0.4,
        0.1
      ).toFixed(3)}:d=0.4[ambientbed]`
    );
  }

  if (voiceInputIndex !== null) {
    filterParts.push(
      `[${voiceInputIndex}:a]atrim=duration=${durationSeconds.toFixed(3)},asetpts=PTS-STARTPTS,volume=1.0,acompressor=threshold=-20dB:ratio=2.8:attack=16:release=180,afade=t=in:st=0:d=0.18,afade=t=out:st=${Math.max(
        durationSeconds - 0.32,
        0.1
      ).toFixed(3)}:d=0.32[voiceoverbed]`
    );
  }

  if (ambientInputIndex !== null && voiceInputIndex !== null) {
    filterParts.push(
      `[ambientbed][voiceoverbed]amix=inputs=2:weights='0.30 1.0':normalize=0,alimiter=limit=0.97[audioout]`
    );
  } else if (voiceInputIndex !== null) {
    filterParts.push('[voiceoverbed]anull[audioout]');
  } else if (ambientInputIndex !== null) {
    filterParts.push('[ambientbed]anull[audioout]');
  }

  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[videoout]'
  );

  if (audioPath || voiceover?.outputPath) {
    args.push('-map', '[audioout]');
  } else {
    args.push('-an');
  }

  args.push(
    '-r',
    String(fps),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-shortest',
    '-y',
    outputPath
  );

  try {
    const result = await runProcess(ffmpegBinary, args, { timeoutMs: Math.max(timeoutMs, 180_000) });
    if (!result.ok) {
      throw new Error(`video montage render failed: ${result.stderr}`);
    }

    return {
      toolUsed: VIDEO_TOOL,
      sourceImages: imagePaths,
      sourceAudio: audioPath,
      durationSeconds,
      voiceover: voiceover
        ? {
            enabled: true,
            speaker: voiceover.narrator,
            role: voiceover.role,
            locale: voiceover.locale,
            region: voiceover.region,
            model: voiceover.model,
            voice: voiceover.voice,
            script: voiceover.script,
            design: voiceover.voiceDesign
          }
        : {
            enabled: false
          }
    };
  } finally {
    await unlink(videoVoicePath).catch(() => {});
  }
}

async function postProcessVoiceTrack(rawInputPath, outputPath, asset, timeoutMs, voiceDesign = {}) {
  await ensureFfmpegBinary();
  const role = normalizeRole(asset.category);
  const sampleRate = Number(asset.specs?.sampleRateHz) || 48000;
  const channels = asset.specs?.channels === 1 ? 1 : 2;
  const filter = buildVoicePostProcessFilter(role, voiceDesign, sampleRate);
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    rawInputPath,
    '-af',
    filter,
    '-ar',
    String(sampleRate),
    '-ac',
    String(channels),
    '-c:a',
    'pcm_s16le',
    '-y',
    outputPath
  ];

  const result = await runProcess(ffmpegBinary, args, { timeoutMs: Math.max(timeoutMs, 120_000) });
  if (!result.ok) {
    throw new Error(`voice post-process failed: ${result.stderr}`);
  }
}

async function requestOpenAiSpeech({ apiKey, model, voice, script, speed, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutMs, 60_000));
  try {
    return fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice,
        input: script,
        response_format: 'wav',
        speed: Number(speed)
      })
    });
  } finally {
    clearTimeout(timer);
  }
}

async function synthesizeSpeechTrack(script, profileContext, outputPath, timeoutMs, contextTag = 'profile') {
  const apiKey = String(process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'sk_replace') {
    throw new Error('OPENAI_API_KEY is not configured for voice generation');
  }

  const model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  const voiceDesign = buildVoiceDesign(profileContext, contextTag);
  const voiceCandidates = pickOpenAiVoiceCandidates(profileContext, contextTag);
  const tempSource = `${outputPath}.tts-source.wav`;
  const errors = [];

  try {
    for (const voice of voiceCandidates) {
      const response = await requestOpenAiSpeech({
        apiKey,
        model,
        voice,
        script,
        speed: voiceDesign.apiSpeed,
        timeoutMs
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.error?.message ??
          payload?.message ??
          `voice provider returned ${response.status}`;
        errors.push(`${voice}: ${message}`);
        continue;
      }

      await writeFile(tempSource, Buffer.from(await response.arrayBuffer()));
      await postProcessVoiceTrack(
        tempSource,
        outputPath,
        {
          category: profileContext.role,
          specs: {
            sampleRateHz: 48_000,
            channels: 1
          }
        },
        timeoutMs,
        voiceDesign
      );

      return {
        model,
        voice,
        voiceDesign
      };
    }
  } finally {
    await unlink(tempSource).catch(() => {});
  }

  throw new Error(
    `voice synthesis failed across candidates (${voiceCandidates.join(', ')}): ${errors.join(' | ')}`
  );
}

function pickVideoNarratorName(storyPackage, asset) {
  const characters = Array.isArray(storyPackage?.characters) ? storyPackage.characters : [];
  const villain = String(storyPackage?.villain?.displayName ?? '').trim();
  const category = String(asset.category ?? '').toLowerCase();
  const id = String(asset.id ?? '').toLowerCase();

  if (category === 'ending_recap_video') {
    if (id.includes('corruption') && villain) {
      return villain;
    }
    if (characters[0]) {
      return characters[0];
    }
  }

  if (category === 'arc_teaser_video') {
    if (characters[1]) {
      return characters[1];
    }
    if (characters[0]) {
      return characters[0];
    }
  }

  if (category === 'beat_transition_video') {
    if (characters[0]) {
      return characters[0];
    }
  }

  return characters[0] || villain || 'Case Handler';
}

function buildVideoNarrationScript(asset, storyPackage, narratorName) {
  const hook = storyPackage?.hook ?? extractPromptSegment(asset.prompt, 'Hook') ?? 'A case file breach has begun.';
  const location = storyPackage?.location ?? extractPromptSegment(asset.prompt, 'Location') ?? 'the scene';
  const villain = storyPackage?.villain?.displayName ?? extractPromptSegment(asset.prompt, 'Villain') ?? 'the threat';
  const clue = Array.isArray(storyPackage?.clueEvidenceList)
    ? storyPackage.clueEvidenceList[0]
    : 'the primary evidence drop';
  const title = String(asset.title ?? '').replace(`${storyPackage?.title ?? ''} - `, '').trim();
  const category = String(asset.category ?? '').toLowerCase();

  if (category === 'ending_recap_video') {
    return [
      `${narratorName} reporting. The case closes on ${title.toLowerCase()}.`,
      `The evidence thread started with ${clue.toLowerCase()} and now points directly at ${villain}.`,
      `Review the timeline at ${location.toLowerCase()} before the next transmission goes live.`
    ].join(' ');
  }

  if (category === 'arc_teaser_video') {
    return [
      `${narratorName} to team. ${hook}`,
      `This arc centers on ${title.toLowerCase()}, with pressure building around ${clue.toLowerCase()}.`,
      `Move quietly through ${location.toLowerCase()} and keep your witness channel open.`
    ].join(' ');
  }

  return [
    `${narratorName} briefing. ${title || 'Transition beat'} is now active.`,
    `Start with ${clue.toLowerCase()}, then compare every new message against ${hook.toLowerCase()}.`,
    `If ${villain} reaches you first, archive the contact before you respond.`
  ].join(' ');
}

async function generateVideoVoiceoverTrack(asset, outputPath, timeoutMs) {
  const storyPackage = await loadStoryPackage(asset.storyId);
  const narratorName = pickVideoNarratorName(storyPackage, asset);
  const profileContext = await resolveVoiceProfileContext(asset.storyId, narratorName);
  const script = buildVideoNarrationScript(asset, storyPackage, narratorName);
  const synthesis = await synthesizeSpeechTrack(script, profileContext, outputPath, timeoutMs, `video:${asset.id}`);

  return {
    outputPath,
    script,
    narrator: narratorName,
    role: profileContext.role,
    locale: profileContext.locale,
    region: profileContext.region,
    model: synthesis.model,
    voice: synthesis.voice,
    voiceDesign: synthesis.voiceDesign
  };
}

async function generateVoiceProfileAsset(asset, outputPath, timeoutMs) {
  const storyId = asset.storyId ?? null;
  const profileName =
    asset.title
      .replace(`${asset.storyTitle ?? ''} - `, '')
      .replace(/\s+Voice Profile$/i, '')
      .trim() || asset.title;
  const profileContext = await resolveVoiceProfileContext(storyId, profileName);
  const script = buildVoicePreviewScript(asset, profileContext);
  const synthesis = await synthesizeSpeechTrack(
    script,
    profileContext,
    outputPath,
    timeoutMs,
    `voice-profile:${asset.id}`
  );

  return {
    toolUsed: VOICE_TOOL,
    promptUsed: script,
    providerMetadata: {
      model: synthesis.model,
      voice: synthesis.voice,
      locale: profileContext.locale,
      region: profileContext.region,
      role: profileContext.role,
      sex: profileContext.sex,
      character: profileContext.name,
      design: synthesis.voiceDesign,
      voice_design: synthesis.voiceDesign
    }
  };
}

export async function generateRealAsset(asset, options = {}) {
  const outputPath = outputPathForAsset(asset);
  const thumbnailPath = thumbnailPathForAsset(asset);
  const metadataPath = `${outputPath}.meta.json`;
  const seed = hashString(`${asset.id}:${asset.storyId ?? 'website'}:${asset.category}:${asset.modality}`);
  const timeoutMs = options.timeoutMs ?? 45_000;
  const maxRetries = options.maxRetries ?? 1;
  const imageBackend = options.imageBackend ?? 'auto';
  const regenerate = Boolean(options.regenerate);
  const runContext = options.runContext ?? `real-asset-generation:${new Date().toISOString()}`;

  await ensureDir(dirname(outputPath));

  if (!regenerate && (await fileExists(outputPath)) && (await fileExists(metadataPath))) {
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      if (metadata.generatedProxy === false) {
        const validation = await validateFileForAsset(asset, outputPath);
        return {
          assetId: asset.id,
          storyId: asset.storyId ?? 'website',
          modality: asset.modality,
          status: 'skipped_existing',
          outputPath,
          thumbnailPath,
          toolUsed: metadata.tool_used ?? metadata.toolUsed ?? 'unknown',
          validation
        };
      }
    } catch {
      // Regenerate if existing metadata is not trustworthy.
    }
  }

  if (asset.modality !== 'image') {
    await unlink(outputPath).catch(() => {});
    if (thumbnailPath) {
      await unlink(thumbnailPath).catch(() => {});
    }
    await unlink(metadataPath).catch(() => {});
  }

  if (asset.modality === 'image') {
    const plannedExt = extname(outputPath).toLowerCase();
    const width = Number(asset.specs?.width) || 1024;
    const height = Number(asset.specs?.height) || 1024;
    const workingOutputPath = workingPathForFile(outputPath);
    const workingThumbnailPath = thumbnailPath ? workingPathForFile(thumbnailPath) : null;
    const normalizedBackend = normalizeImageBackendChoice(imageBackend);
    const allowLocalFallback =
      normalizedBackend === 'local' || (normalizedBackend === 'auto' && allowCommercialLocalFallback());
    let providerOrder = ['openai', 'pollinations'];
    if (normalizedBackend === 'openai') {
      providerOrder = ['openai'];
    } else if (normalizedBackend === 'pollinations') {
      providerOrder = ['pollinations'];
    } else if (normalizedBackend === 'local') {
      providerOrder = [];
    }
    let lastError =
      normalizedBackend === 'local'
        ? 'degraded local renderer selected explicitly'
        : 'image generation failed';
    const providerErrors = [];

    await unlink(workingOutputPath).catch(() => {});
    if (workingThumbnailPath) {
      await unlink(workingThumbnailPath).catch(() => {});
    }
    await unlink(metadataPath).catch(() => {});

    for (const provider of providerOrder) {
      for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
          console.log(
            `[real-asset:image] ${JSON.stringify({ assetId: asset.id, attempt, tool: provider, outputPath, width, height })}`
          );
          const providerTimeoutMs = provider === 'local' ? timeoutMs : Math.max(timeoutMs, 180_000);
          const providerResult =
            provider === 'openai'
              ? await generateImageWithOpenAI(asset, workingOutputPath, seed + attempt, providerTimeoutMs)
              : await generateImageWithPollinations(asset, workingOutputPath, seed, providerTimeoutMs, attempt);

          const validation = await validateFileForAsset(asset, workingOutputPath);
          const imageQa = await assertImageTextQa(asset, workingOutputPath);
          let mirroredThumbnail = null;
          if (workingThumbnailPath && thumbnailPath) {
            await generateThumbnail(workingOutputPath, workingThumbnailPath);
          }

          await unlink(outputPath).catch(() => {});
          await rename(workingOutputPath, outputPath);
          if (workingThumbnailPath && thumbnailPath) {
            await unlink(thumbnailPath).catch(() => {});
            await rename(workingThumbnailPath, thumbnailPath);
            mirroredThumbnail = await mirrorIntoPublic(thumbnailPath);
          }

          const checksum = sha1Hex(await readFile(outputPath));
          const mirroredOutput = await mirrorIntoPublic(outputPath);
          const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
          const publicThumbnailPath = mirroredThumbnail ? publicPathForFile(mirroredThumbnail) : null;
          const metadata = {
            story_id: asset.storyId ?? 'website',
            asset_id: asset.id,
            asset_type: asset.category,
            modality: asset.modality,
            prompt_used: providerResult.promptUsed,
            source_prompt: asset.prompt,
            tool_used: providerResult.toolUsed,
            provider_metadata: providerResult.providerMetadata,
            image_qa: imageQa,
            generation_status: 'complete',
            file_path: outputPath,
            public_path: publicPath,
            thumbnail_path: thumbnailPath,
            public_thumbnail_path: publicThumbnailPath,
            created_at: new Date().toISOString(),
            checksum,
            file_size: validation.fileSize,
            generatedProxy: false,
            outputKey: asset.outputKey,
            runContext,
            extension: plannedExt
          };
          await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
          return {
            assetId: asset.id,
            storyId: asset.storyId ?? 'website',
            modality: asset.modality,
            status: 'generated',
            outputPath,
            thumbnailPath,
            toolUsed: providerResult.toolUsed,
            validation
          };
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          providerErrors.push(`${provider}: ${lastError}`);
          await unlink(workingOutputPath).catch(() => {});
          if (workingThumbnailPath) {
            await unlink(workingThumbnailPath).catch(() => {});
          }
          if (attempt < maxRetries) {
            await sleep(provider === 'openai' ? attempt * 2_500 : attempt * 1_500);
          }
        }
      }
    }
    if (!allowLocalFallback) {
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'failed',
        outputPath,
        thumbnailPath,
        error: providerErrors.length > 0 ? providerErrors.join(' | ') : lastError
      };
    }

    try {
      console.log(
        `[real-asset:image-fallback] ${JSON.stringify({ assetId: asset.id, tool: LOCAL_FALLBACK_TOOL, outputPath, width, height, lastError })}`
      );
      await renderLocalImageAsset(asset, workingOutputPath, seed);
      const validation = await validateFileForAsset(asset, workingOutputPath);
      let mirroredThumbnail = null;
      if (workingThumbnailPath && thumbnailPath) {
        await generateThumbnail(workingOutputPath, workingThumbnailPath);
      }

      await unlink(outputPath).catch(() => {});
      await rename(workingOutputPath, outputPath);
      if (workingThumbnailPath && thumbnailPath) {
        await unlink(thumbnailPath).catch(() => {});
        await rename(workingThumbnailPath, thumbnailPath);
        mirroredThumbnail = await mirrorIntoPublic(thumbnailPath);
      }

      const checksum = sha1Hex(await readFile(outputPath));
      const mirroredOutput = await mirrorIntoPublic(outputPath);
      const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
      const publicThumbnailPath = mirroredThumbnail ? publicPathForFile(mirroredThumbnail) : null;
      await writeFile(
        metadataPath,
        JSON.stringify(
          {
            story_id: asset.storyId ?? 'website',
            asset_id: asset.id,
            asset_type: asset.category,
            modality: asset.modality,
            prompt_used: buildHighFidelityImagePrompt(asset),
            source_prompt: asset.prompt,
            tool_used: LOCAL_FALLBACK_TOOL,
            provider_attempted: providerOrder.filter((item) => item !== 'local'),
            provider_error: providerErrors.length > 0 ? providerErrors.join(' | ') : lastError,
            generation_status: 'degraded',
            file_path: outputPath,
            public_path: publicPath,
            thumbnail_path: thumbnailPath,
            public_thumbnail_path: publicThumbnailPath,
            created_at: new Date().toISOString(),
            checksum,
            file_size: validation.fileSize,
            generatedProxy: true,
            quality_tier: 'degraded-fallback',
            outputKey: asset.outputKey,
            runContext,
            extension: plannedExt
          },
          null,
          2
        ),
        'utf8'
      );
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'failed',
        outputPath,
        thumbnailPath,
        toolUsed: LOCAL_FALLBACK_TOOL,
        validation,
        error: DEGRADED_FALLBACK_ERROR
      };
    } catch (fallbackError) {
      await unlink(workingOutputPath).catch(() => {});
      if (workingThumbnailPath) {
        await unlink(workingThumbnailPath).catch(() => {});
      }
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'failed',
        outputPath,
        thumbnailPath,
        error: `${lastError}; fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      };
    }
  }

  if (asset.modality === 'audio') {
    await ensureFfmpegBinary();
    const durationSeconds = clamp(
      Number.isFinite(Number(asset.specs?.durationSeconds)) ? Number(asset.specs.durationSeconds) : 18,
      4,
      75
    );
    const isVoiceProfile = String(asset.category ?? '').toLowerCase().includes('voice_profile');

    try {
      let generationResult;
      if (isVoiceProfile) {
        generationResult = await generateVoiceProfileAsset(asset, outputPath, timeoutMs);
      } else {
        const sampleRate = Number(asset.specs?.sampleRateHz) || 48_000;
        const channels = asset.specs?.channels === 1 ? 1 : 2;
        const recipe = buildHorrorAudioRecipe(asset, seed, durationSeconds);
        const args = ['-hide_banner', '-loglevel', 'error'];

        for (const source of recipe.sources) {
          args.push('-f', 'lavfi', '-i', source);
        }

        args.push(
          '-filter_complex',
          recipe.filterComplex,
          '-map',
          recipe.outputLabel,
          '-ar',
          String(sampleRate),
          '-ac',
          String(channels),
          '-c:a',
          'pcm_s16le',
          '-y',
          outputPath
        );

        const result = await runProcess(ffmpegBinary, args, { timeoutMs: Math.max(timeoutMs, 120_000) });
        if (!result.ok) {
          throw new Error(result.stderr || 'audio render failed');
        }

        generationResult = {
          toolUsed: AUDIO_TOOL,
          promptUsed: asset.prompt,
          providerMetadata: {
            flavor: recipe.flavor,
            durationSeconds,
            sampleRate,
            channels
          }
        };
      }

      const validation = await validateFileForAsset(asset, outputPath);
      const checksum = sha1Hex(await readFile(outputPath));
      const mirroredOutput = await mirrorIntoPublic(outputPath);
      const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
      await writeFile(
        metadataPath,
        JSON.stringify(
          {
            story_id: asset.storyId ?? 'website',
            asset_id: asset.id,
            asset_type: asset.category,
            modality: asset.modality,
            prompt_used: generationResult.promptUsed,
            source_prompt: asset.prompt,
            tool_used: generationResult.toolUsed,
            provider_metadata: generationResult.providerMetadata,
            generation_status: 'complete',
            file_path: outputPath,
            public_path: publicPath,
            thumbnail_path: null,
            public_thumbnail_path: null,
            created_at: new Date().toISOString(),
            checksum,
            file_size: validation.fileSize,
            duration_seconds: validation.durationSeconds,
            generatedProxy: false,
            outputKey: asset.outputKey,
            runContext
          },
          null,
          2
        ),
        'utf8'
      );
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'generated',
        outputPath,
        toolUsed: generationResult.toolUsed,
        validation
      };
    } catch (error) {
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'failed',
        outputPath,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  if (asset.modality === 'video') {
    const workingOutputPath = workingPathForFile(outputPath);
    const workingThumbnailPath = thumbnailPath ? workingPathForFile(thumbnailPath) : null;

    await unlink(workingOutputPath).catch(() => {});
    if (workingThumbnailPath) {
      await unlink(workingThumbnailPath).catch(() => {});
    }
    await unlink(metadataPath).catch(() => {});

    try {
      const providerResult = await generateVideoMontageAsset(asset, workingOutputPath, timeoutMs);
      const validation = await validateFileForAsset(asset, workingOutputPath);
      let mirroredThumbnail = null;

      if (workingThumbnailPath && thumbnailPath) {
        await generateThumbnail(workingOutputPath, workingThumbnailPath);
      }

      await unlink(outputPath).catch(() => {});
      await rename(workingOutputPath, outputPath);
      if (workingThumbnailPath && thumbnailPath) {
        await unlink(thumbnailPath).catch(() => {});
        await rename(workingThumbnailPath, thumbnailPath);
        mirroredThumbnail = await mirrorIntoPublic(thumbnailPath);
      }

      const checksum = sha1Hex(await readFile(outputPath));
      const mirroredOutput = await mirrorIntoPublic(outputPath);
      const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
      const publicThumbnailPath = mirroredThumbnail ? publicPathForFile(mirroredThumbnail) : null;

      await writeFile(
        metadataPath,
        JSON.stringify(
          {
            story_id: asset.storyId ?? 'website',
            asset_id: asset.id,
            asset_type: asset.category,
            modality: asset.modality,
            prompt_used: asset.prompt,
            tool_used: providerResult.toolUsed,
            provider_metadata: {
              source_images: providerResult.sourceImages,
              source_audio: providerResult.sourceAudio,
              duration_seconds: providerResult.durationSeconds,
              voiceover: providerResult.voiceover ?? { enabled: false }
            },
            generation_status: 'complete',
            file_path: outputPath,
            public_path: publicPath,
            thumbnail_path: thumbnailPath,
            public_thumbnail_path: publicThumbnailPath,
            created_at: new Date().toISOString(),
            checksum,
            file_size: validation.fileSize,
            duration_seconds: validation.durationSeconds,
            generatedProxy: false,
            outputKey: asset.outputKey,
            runContext
          },
          null,
          2
        ),
        'utf8'
      );

      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'generated',
        outputPath,
        thumbnailPath,
        toolUsed: providerResult.toolUsed,
        validation
      };
    } catch (error) {
      await unlink(workingOutputPath).catch(() => {});
      if (workingThumbnailPath) {
        await unlink(workingThumbnailPath).catch(() => {});
      }
      return {
        assetId: asset.id,
        storyId: asset.storyId ?? 'website',
        modality: asset.modality,
        status: 'failed',
        outputPath,
        thumbnailPath,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  if (asset.modality === 'artifact') {
    const content = [
      `# ${asset.title}`,
      '',
      `Story: ${asset.storyTitle ?? asset.storyId ?? 'website'}`,
      `Asset: ${asset.id}`,
      `Category: ${asset.category}`,
      '',
      '## Evidence Summary',
      asset.prompt,
      '',
      '## Investigative Notes',
      '- Chain of custody should be confirmed against the surrounding evidence set.',
      '- At least one detail in this document should be cross-checked against another artifact before conclusions are drawn.',
      '- Preserve ambiguity where the case requires deduction rather than explicit explanation.',
      '',
      '## Provenance',
      `Generated by the local asset pipeline at ${new Date().toISOString()}.`,
      `Run context: ${runContext}`
    ].join('\n');
    await writeFile(outputPath, `${content}\n`, 'utf8');
    const validation = await validateFileForAsset(asset, outputPath);
    const checksum = sha1Hex(await readFile(outputPath));
    const mirroredOutput = await mirrorIntoPublic(outputPath);
    const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          story_id: asset.storyId ?? 'website',
          asset_id: asset.id,
          asset_type: asset.category,
          modality: asset.modality,
          prompt_used: asset.prompt,
          tool_used: 'local-markdown-generator',
          generation_status: 'complete',
          file_path: outputPath,
          public_path: publicPath,
          thumbnail_path: null,
          public_thumbnail_path: null,
          created_at: new Date().toISOString(),
          checksum,
          file_size: validation.fileSize,
          generatedProxy: false,
          outputKey: asset.outputKey,
          runContext
        },
        null,
        2
      ),
      'utf8'
    );
    return {
      assetId: asset.id,
      storyId: asset.storyId ?? 'website',
      modality: asset.modality,
      status: 'generated',
      outputPath,
      toolUsed: 'local-markdown-generator',
      validation
    };
  }

  if (asset.modality === 'web') {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${asset.title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #090c11; color: #efe4d1; font-family: Georgia, serif; }
      main { width: min(960px, 92vw); padding: 32px; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; background: rgba(10,13,18,0.85); }
      h1 { margin-top: 0; }
      p { line-height: 1.6; color: #d7c5a8; }
    </style>
  </head>
  <body>
    <main>
      <h1>${asset.title}</h1>
      <p>${asset.prompt.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>
      <p>Generated locally by the real asset pipeline.</p>
    </main>
  </body>
</html>
`;
    await writeFile(outputPath, html, 'utf8');
    const validation = await validateFileForAsset(asset, outputPath);
    const checksum = sha1Hex(await readFile(outputPath));
    const mirroredOutput = await mirrorIntoPublic(outputPath);
    const publicPath = mirroredOutput ? publicPathForFile(mirroredOutput) : null;
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          story_id: asset.storyId ?? 'website',
          asset_id: asset.id,
          asset_type: asset.category,
          modality: asset.modality,
          prompt_used: asset.prompt,
          tool_used: 'local-html-generator',
          generation_status: 'complete',
          file_path: outputPath,
          public_path: publicPath,
          thumbnail_path: null,
          public_thumbnail_path: null,
          created_at: new Date().toISOString(),
          checksum,
          file_size: validation.fileSize,
          generatedProxy: false,
          outputKey: asset.outputKey,
          runContext
        },
        null,
        2
      ),
      'utf8'
    );
    return {
      assetId: asset.id,
      storyId: asset.storyId ?? 'website',
      modality: asset.modality,
      status: 'generated',
      outputPath,
      toolUsed: 'local-html-generator',
      validation
    };
  }

  return {
    assetId: asset.id,
    storyId: asset.storyId ?? 'website',
    modality: asset.modality,
    status: 'failed',
    outputPath,
    error: `unsupported modality: ${asset.modality}`
  };
}

export async function readStatusLedger() {
  if (!(await fileExists(statusLedgerPath))) {
    return {};
  }
  try {
    const raw = await readFile(statusLedgerPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.assetStatuses ?? {};
  } catch {
    return {};
  }
}

export async function writeStatusLedger(results) {
  const current = await readStatusLedger();
  for (const result of results) {
    current[result.assetId] = {
      assetId: result.assetId,
      storyId: result.storyId,
      modality: result.modality,
      status: result.status,
      outputPath: result.outputPath,
      thumbnailPath: result.thumbnailPath ?? null,
      toolUsed: result.toolUsed ?? null,
      error: result.error ?? null,
      lastAttemptAt: new Date().toISOString()
    };
  }

  await ensureDir(dirname(statusLedgerPath));
  await writeFile(
    statusLedgerPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        assetStatuses: current
      },
      null,
      2
    ),
    'utf8'
  );
}

export async function buildVerifiedCatalog(planAssets) {
  const statuses = await readStatusLedger();
  const grouped = new Map();
  const catalogAssets = [];
  const catalogFailures = [];

  for (const asset of planAssets) {
    const storyId = asset.storyId ?? 'website';
    const outputPath = outputPathForAsset(asset);
    const metadataPath = `${outputPath}.meta.json`;
    const storyBucket = grouped.get(storyId) ?? {
      storyId,
      title: asset.storyTitle ?? storyId,
      assets: [],
      failures: []
    };

    if (!(await fileExists(outputPath)) || !(await fileExists(metadataPath))) {
      const inferredStatus = statuses[asset.id]?.status ?? 'missing';
      const failure = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        generation_status: inferredStatus,
        error: statuses[asset.id]?.error ?? 'missing generated file',
        planned_output_path: outputPath,
        last_attempt_at: statuses[asset.id]?.lastAttemptAt ?? null
      };
      storyBucket.failures.push(failure);
      catalogFailures.push(failure);
      grouped.set(storyId, storyBucket);
      continue;
    }

    let metadata;
    try {
      metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    } catch (error) {
      const failure = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        generation_status: 'invalid',
        error: `invalid metadata: ${error instanceof Error ? error.message : String(error)}`,
        planned_output_path: outputPath,
        last_attempt_at: statuses[asset.id]?.lastAttemptAt ?? null
      };
      storyBucket.failures.push(failure);
      catalogFailures.push(failure);
      grouped.set(storyId, storyBucket);
      continue;
    }

    if (metadata.generatedProxy === true) {
      const failure = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        generation_status: 'invalid',
        error: 'proxy output excluded from gallery',
        planned_output_path: outputPath,
        last_attempt_at: statuses[asset.id]?.lastAttemptAt ?? null
      };
      storyBucket.failures.push(failure);
      catalogFailures.push(failure);
      grouped.set(storyId, storyBucket);
      continue;
    }

    if ((metadata.tool_used ?? metadata.toolUsed) === LOCAL_FALLBACK_TOOL) {
      const failure = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        generation_status: 'invalid',
        error: DEGRADED_FALLBACK_ERROR,
        planned_output_path: outputPath,
        last_attempt_at: statuses[asset.id]?.lastAttemptAt ?? null
      };
      storyBucket.failures.push(failure);
      catalogFailures.push(failure);
      grouped.set(storyId, storyBucket);
      continue;
    }

    try {
      const validation = await validateFileForAsset(asset, outputPath);
      const outputStat = await stat(outputPath);
      const checksum = metadata.checksum ?? sha1Hex(await readFile(outputPath));
      const entry = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        title: asset.title,
        prompt_used: metadata.prompt_used ?? asset.prompt,
        tool_used: metadata.tool_used ?? metadata.toolUsed ?? 'unknown',
        generation_status: 'complete',
        file_path: outputPath,
        public_path:
          metadata.public_path ??
          publicPathForFile(join(publicAgentArmyRoot, relative(productionAgentArmyRoot, outputPath))),
        thumbnail_path: metadata.thumbnail_path ?? null,
        public_thumbnail_path: metadata.public_thumbnail_path ?? null,
        created_at: metadata.created_at ?? metadata.generatedAt ?? new Date(outputStat.mtimeMs).toISOString(),
        checksum,
        file_size: outputStat.size,
        duration_seconds: validation.durationSeconds ?? null,
        provider_metadata: metadata.provider_metadata ?? metadata.providerMetadata ?? null
      };
      storyBucket.assets.push(entry);
      catalogAssets.push(entry);
    } catch (error) {
      const failure = {
        story_id: storyId,
        asset_id: asset.id,
        asset_type: asset.category,
        modality: asset.modality,
        generation_status: 'invalid',
        error: error instanceof Error ? error.message : String(error),
        planned_output_path: outputPath,
        last_attempt_at: statuses[asset.id]?.lastAttemptAt ?? null
      };
      storyBucket.failures.push(failure);
      catalogFailures.push(failure);
    }

    grouped.set(storyId, storyBucket);
  }

  const stories = Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      assets: entry.assets.sort((left, right) => left.asset_id.localeCompare(right.asset_id)),
      failures: entry.failures.sort((left, right) => left.asset_id.localeCompare(right.asset_id))
    }))
    .sort((left, right) => left.storyId.localeCompare(right.storyId));

  const catalog = {
    generatedAt: new Date().toISOString(),
    planPath: relative(repoRoot, planPath).replaceAll('\\', '/'),
    stories,
    totals: {
      stories: stories.length,
      completeAssets: catalogAssets.length,
      failedAssets: catalogFailures.filter((item) => item.generation_status === 'failed').length,
      unavailableAssets: catalogFailures.filter((item) => item.generation_status === 'unavailable').length,
      invalidAssets: catalogFailures.filter((item) => item.generation_status === 'invalid').length,
      missingAssets: catalogFailures.filter((item) => item.generation_status === 'missing').length
    }
  };

  await ensureDir(dirname(catalogPath));
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  await ensureDir(storyManifestRoot);
  for (const story of stories) {
    await writeFile(join(storyManifestRoot, `${story.storyId}.json`), JSON.stringify(story, null, 2), 'utf8');
  }
  return catalog;
}
