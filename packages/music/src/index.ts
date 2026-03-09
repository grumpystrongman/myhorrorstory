export type MusicMood =
  | 'cinematic_dread'
  | 'psychological_tension'
  | 'gothic_requiem'
  | 'folk_ritual'
  | 'cosmic_unease'
  | 'supernatural_mystery'
  | 'found_footage_grit'
  | 'occult_conspiracy'
  | 'slasher_pulse'
  | 'institutional_haunt'
  | 'techno_paranormal';

export interface ScoreTrack {
  id: string;
  storyId?: string;
  title: string;
  usage: 'global' | 'story';
  mood: MusicMood;
  bpm: number;
  durationSeconds: number;
  loop: boolean;
  src: string;
}

export interface ScoreManifest {
  version: string;
  globalTrackId: string;
  tracks: ScoreTrack[];
}

export interface ScorePlaybackContext {
  pathname: string;
  storyId?: string | null;
}

export interface StoryScoreSummary {
  storyId: string;
  storyTitle: string;
  introPath: string;
  playPath: string;
  track: ScoreTrack;
  mode: 'launch' | 'short-test';
  targetSessionMinutes: number;
  timelineLabel: string;
}

export interface MusicGenerationRequest {
  trackId: string;
  prompt: string;
  targetSeconds: number;
  mood: MusicMood;
}

export interface MusicGenerationResult {
  trackId: string;
  provider: string;
  assetKey: string;
}

export interface MusicGenerationProvider {
  readonly id: string;
  generate(request: MusicGenerationRequest): Promise<MusicGenerationResult>;
}

export class DeterministicMusicProvider implements MusicGenerationProvider {
  constructor(readonly id: string = 'deterministic') {}

  async generate(request: MusicGenerationRequest): Promise<MusicGenerationResult> {
    return {
      trackId: request.trackId,
      provider: this.id,
      assetKey: `audio/generated/${request.trackId}.${this.id}.wav`
    };
  }
}

export class MusicGenerationOrchestrator {
  constructor(private readonly providers: MusicGenerationProvider[]) {}

  async generate(request: MusicGenerationRequest): Promise<MusicGenerationResult> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.generate(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No music generation provider available.');
  }
}

const storyCatalog: Record<
  string,
  {
    title: string;
    mode: 'launch' | 'short-test';
    targetSessionMinutes: number;
    timelineLabel: string;
  }
> = {
  'static-between-stations': {
    title: 'Static Between Stations',
    mode: 'launch',
    targetSessionMinutes: 95,
    timelineLabel: '2-4 hours'
  },
  'black-chapel-ledger': {
    title: 'Black Chapel Ledger',
    mode: 'launch',
    targetSessionMinutes: 100,
    timelineLabel: '2-4 hours'
  },
  'the-harvest-men': {
    title: 'The Harvest Men',
    mode: 'launch',
    targetSessionMinutes: 85,
    timelineLabel: '2-4 hours'
  },
  'signal-from-kharon-9': {
    title: 'Signal From Kharon-9',
    mode: 'launch',
    targetSessionMinutes: 92,
    timelineLabel: '2-4 hours'
  },
  'the-fourth-tenant': {
    title: 'The Fourth Tenant',
    mode: 'launch',
    targetSessionMinutes: 88,
    timelineLabel: '2-4 hours'
  },
  'tape-17-pinewatch': {
    title: 'Tape 17: Pinewatch',
    mode: 'launch',
    targetSessionMinutes: 80,
    timelineLabel: '2-4 hours'
  },
  'crown-of-salt': {
    title: 'Crown of Salt',
    mode: 'launch',
    targetSessionMinutes: 100,
    timelineLabel: '2-4 hours'
  },
  'red-creek-winter': {
    title: 'Red Creek Winter',
    mode: 'launch',
    targetSessionMinutes: 90,
    timelineLabel: '2-4 hours'
  },
  'ward-1908': {
    title: 'Ward 1908',
    mode: 'launch',
    targetSessionMinutes: 95,
    timelineLabel: '2-4 hours'
  },
  'dead-channel-protocol': {
    title: 'Dead Channel Protocol',
    mode: 'launch',
    targetSessionMinutes: 88,
    timelineLabel: '2-4 hours'
  },
  'midnight-lockbox': {
    title: 'Midnight Lockbox',
    mode: 'short-test',
    targetSessionMinutes: 36,
    timelineLabel: '1-2 days (async test mode)'
  }
};

export const launchScoreManifest: ScoreManifest = {
  version: 'v1',
  globalTrackId: 'platform-overture',
  tracks: [
    {
      id: 'platform-overture',
      title: 'MHS Platform Overture',
      usage: 'global',
      mood: 'cinematic_dread',
      bpm: 58,
      durationSeconds: 41,
      loop: true,
      src: '/audio/scores/platform-overture.wav'
    },
    {
      id: 'score-static-between-stations',
      storyId: 'static-between-stations',
      title: 'Signal in the Static',
      usage: 'story',
      mood: 'psychological_tension',
      bpm: 62,
      durationSeconds: 43,
      loop: true,
      src: '/audio/scores/static-between-stations.wav'
    },
    {
      id: 'score-black-chapel-ledger',
      storyId: 'black-chapel-ledger',
      title: 'Ledger of Bells',
      usage: 'story',
      mood: 'gothic_requiem',
      bpm: 56,
      durationSeconds: 43,
      loop: true,
      src: '/audio/scores/black-chapel-ledger.wav'
    },
    {
      id: 'score-the-harvest-men',
      storyId: 'the-harvest-men',
      title: 'Harvest Rite',
      usage: 'story',
      mood: 'folk_ritual',
      bpm: 64,
      durationSeconds: 41,
      loop: true,
      src: '/audio/scores/the-harvest-men.wav'
    },
    {
      id: 'score-signal-from-kharon-9',
      storyId: 'signal-from-kharon-9',
      title: 'Cold Signal Array',
      usage: 'story',
      mood: 'cosmic_unease',
      bpm: 54,
      durationSeconds: 40,
      loop: true,
      src: '/audio/scores/signal-from-kharon-9.wav'
    },
    {
      id: 'score-the-fourth-tenant',
      storyId: 'the-fourth-tenant',
      title: 'Hallway at 2AM',
      usage: 'story',
      mood: 'supernatural_mystery',
      bpm: 60,
      durationSeconds: 44,
      loop: true,
      src: '/audio/scores/the-fourth-tenant.wav'
    },
    {
      id: 'score-tape-17-pinewatch',
      storyId: 'tape-17-pinewatch',
      title: 'Tape Hiss and Pines',
      usage: 'story',
      mood: 'found_footage_grit',
      bpm: 66,
      durationSeconds: 44,
      loop: true,
      src: '/audio/scores/tape-17-pinewatch.wav'
    },
    {
      id: 'score-crown-of-salt',
      storyId: 'crown-of-salt',
      title: 'Crown and Catacomb',
      usage: 'story',
      mood: 'occult_conspiracy',
      bpm: 63,
      durationSeconds: 42,
      loop: true,
      src: '/audio/scores/crown-of-salt.wav'
    },
    {
      id: 'score-red-creek-winter',
      storyId: 'red-creek-winter',
      title: 'Snowfall Dispatch',
      usage: 'story',
      mood: 'slasher_pulse',
      bpm: 70,
      durationSeconds: 41,
      loop: true,
      src: '/audio/scores/red-creek-winter.wav'
    },
    {
      id: 'score-ward-1908',
      storyId: 'ward-1908',
      title: 'Ward Echoes',
      usage: 'story',
      mood: 'institutional_haunt',
      bpm: 57,
      durationSeconds: 42,
      loop: true,
      src: '/audio/scores/ward-1908.wav'
    },
    {
      id: 'score-dead-channel-protocol',
      storyId: 'dead-channel-protocol',
      title: 'Dead Channel Flux',
      usage: 'story',
      mood: 'techno_paranormal',
      bpm: 74,
      durationSeconds: 42,
      loop: true,
      src: '/audio/scores/dead-channel-protocol.wav'
    },
    {
      id: 'score-midnight-lockbox',
      storyId: 'midnight-lockbox',
      title: 'Afterhours Unit 331',
      usage: 'story',
      mood: 'supernatural_mystery',
      bpm: 59,
      durationSeconds: 41,
      loop: true,
      src: '/audio/scores/midnight-lockbox.wav'
    }
  ]
};

function normalizeStoryId(value: string): string {
  return value.trim().toLowerCase();
}

export function getTrackById(trackId: string): ScoreTrack | undefined {
  return launchScoreManifest.tracks.find((track) => track.id === trackId);
}

export function getStoryTrack(storyId: string): ScoreTrack | undefined {
  const normalized = normalizeStoryId(storyId);
  return launchScoreManifest.tracks.find((track) => track.storyId === normalized);
}

export function resolveStoryIdFromPath(pathname: string): string | undefined {
  const introMatch = pathname.match(/^\/stories\/([^/]+)\/intro\/?$/i);
  if (introMatch?.[1]) {
    return normalizeStoryId(introMatch[1]);
  }

  return undefined;
}

export function resolveScoreTrack(context: ScorePlaybackContext): ScoreTrack {
  const routeStoryId = resolveStoryIdFromPath(context.pathname);
  const explicitStoryId = context.storyId ? normalizeStoryId(context.storyId) : undefined;
  const storyId = explicitStoryId ?? routeStoryId;

  if (storyId) {
    const storyTrack = getStoryTrack(storyId);
    if (storyTrack) {
      return storyTrack;
    }
  }

  const globalTrack = getTrackById(launchScoreManifest.globalTrackId);
  if (!globalTrack) {
    throw new Error('Global score track is missing from manifest.');
  }

  return globalTrack;
}

export function listStoryScores(): StoryScoreSummary[] {
  return Object.entries(storyCatalog)
    .map(([storyId, story]) => {
      const track = getStoryTrack(storyId);
      if (!track) {
        return null;
      }

      return {
        storyId,
        storyTitle: story.title,
        introPath: `/stories/${storyId}/intro`,
        playPath: `/play?storyId=${storyId}`,
        track,
        mode: story.mode,
        targetSessionMinutes: story.targetSessionMinutes,
        timelineLabel: story.timelineLabel
      } satisfies StoryScoreSummary;
    })
    .filter((item): item is StoryScoreSummary => item !== null);
}

export function validateScoreManifest(manifest: ScoreManifest): {
  duplicateIds: string[];
  duplicateStoryAssignments: string[];
  hasGlobalTrack: boolean;
} {
  const idCounts = new Map<string, number>();
  const storyCounts = new Map<string, number>();

  for (const track of manifest.tracks) {
    idCounts.set(track.id, (idCounts.get(track.id) ?? 0) + 1);
    if (track.storyId) {
      storyCounts.set(track.storyId, (storyCounts.get(track.storyId) ?? 0) + 1);
    }
  }

  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const duplicateStoryAssignments = [...storyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([storyId]) => storyId);

  return {
    duplicateIds,
    duplicateStoryAssignments,
    hasGlobalTrack: manifest.tracks.some((track) => track.id === manifest.globalTrackId)
  };
}

export function getStoryTitle(storyId: string): string {
  return storyCatalog[storyId]?.title ?? storyId;
}

const TAU = Math.PI * 2;
const DEFAULT_SAMPLE_RATE = 24000;
const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 48000;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 120;
const TARGET_PEAK = 0.9;

const tonalKeys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const scaleIntervals = {
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10]
} as const;

const moodScalePreferences: Record<MusicMood, TonalScale[]> = {
  cinematic_dread: ['natural_minor', 'harmonic_minor'],
  psychological_tension: ['phrygian', 'natural_minor'],
  gothic_requiem: ['harmonic_minor', 'natural_minor'],
  folk_ritual: ['dorian', 'phrygian'],
  cosmic_unease: ['locrian', 'phrygian'],
  supernatural_mystery: ['natural_minor', 'dorian'],
  found_footage_grit: ['phrygian', 'natural_minor'],
  occult_conspiracy: ['harmonic_minor', 'phrygian'],
  slasher_pulse: ['phrygian', 'natural_minor'],
  institutional_haunt: ['dorian', 'natural_minor'],
  techno_paranormal: ['locrian', 'phrygian']
};

const sceneTempoBase: Record<HorrorMusicSceneType, number> = {
  exploration: 52,
  investigation: 58,
  chase: 86,
  confrontation: 78,
  revelation: 66,
  ritual: 60,
  aftermath: 50
};

export type HorrorMusicSceneType =
  | 'exploration'
  | 'investigation'
  | 'chase'
  | 'confrontation'
  | 'revelation'
  | 'ritual'
  | 'aftermath';

export type HorrorMusicLocation =
  | 'forest'
  | 'basement'
  | 'hospital'
  | 'alley'
  | 'ritual_chamber';

export type HorrorLayerStyle =
  | 'dark_ambient_drones'
  | 'eerie_piano_melodies'
  | 'whispering_choir_textures'
  | 'industrial_metallic_echoes'
  | 'suspense_percussion'
  | 'ritualistic_chanting';

export type TonalScale = keyof typeof scaleIntervals;
export type TonalKey = (typeof tonalKeys)[number];

export interface DynamicHorrorMusicInput {
  storyMood: MusicMood;
  sceneType: HorrorMusicSceneType;
  villainPresence: boolean | number;
  playerTensionLevel: number;
  location: HorrorMusicLocation;
  durationSeconds?: number;
  sampleRate?: number;
  seed?: string;
}

export interface LayerParameters {
  style: HorrorLayerStyle;
  gain: number;
  pan: number;
  variation: number;
}

export interface DynamicLoopParameters {
  tempoBpm: number;
  tonalKey: TonalKey;
  scale: TonalScale;
  durationSeconds: number;
  barCount: number;
  villainIntensity: number;
  tensionLevel: number;
  locationTexture: HorrorMusicLocation;
  layerParameters: LayerParameters[];
}

export interface DynamicHorrorMusicResult {
  loopId: string;
  seed: string;
  sampleRate: number;
  durationSeconds: number;
  wavBytes: Uint8Array;
  loopBoundaryDelta: number;
  parameters: DynamicLoopParameters;
}

interface NormalizedInput {
  storyMood: MusicMood;
  sceneType: HorrorMusicSceneType;
  villainIntensity: number;
  tensionLevel: number;
  location: HorrorMusicLocation;
  durationSecondsTarget: number;
  sampleRate: number;
  seed: string;
}

interface RandomSource {
  next(): number;
  between(min: number, max: number): number;
  integer(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

interface MelodyEvent {
  startNorm: number;
  lengthNorm: number;
  cyclesA: number;
  cyclesB: number;
  velocity: number;
}

interface PercussionEvent {
  startNorm: number;
  lengthNorm: number;
  cyclesA: number;
  cyclesB: number;
  cyclesC: number;
  velocity: number;
}

interface PeriodicTexture {
  harmonics: Array<{
    cycles: number;
    amplitude: number;
    phase: number;
  }>;
}

interface RenderState {
  durationSeconds: number;
  sampleRate: number;
  sampleCount: number;
  barCount: number;
  beatCount: number;
  rootCycles: number;
  rootSubCycles: number;
  choirCyclesA: number;
  choirCyclesB: number;
  chantCycles: number;
  ambientTextureA: PeriodicTexture;
  ambientTextureB: PeriodicTexture;
  ambientTextureC: PeriodicTexture;
  droneTexture: PeriodicTexture;
  choirTexture: PeriodicTexture;
  percussionTexture: PeriodicTexture;
  pianoEvents: MelodyEvent[];
  metallicEvents: PercussionEvent[];
  percussionEvents: PercussionEvent[];
  chantEvents: MelodyEvent[];
}

export interface DynamicHorrorMusicProvider {
  readonly id: string;
  generateLoop(input: DynamicHorrorMusicInput): Promise<DynamicHorrorMusicResult>;
}

export class ProceduralHorrorMusicProvider implements DynamicHorrorMusicProvider {
  constructor(readonly id: string = 'procedural-horror-v1') {}

  async generateLoop(input: DynamicHorrorMusicInput): Promise<DynamicHorrorMusicResult> {
    return generateDynamicHorrorLoop(input);
  }
}

export class DynamicHorrorMusicOrchestrator {
  constructor(private readonly providers: DynamicHorrorMusicProvider[]) {}

  async generateLoop(input: DynamicHorrorMusicInput): Promise<DynamicHorrorMusicResult> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.generateLoop(input);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No dynamic horror music provider available.');
  }
}

export function listSupportedHorrorLayerStyles(): HorrorLayerStyle[] {
  return [
    'dark_ambient_drones',
    'eerie_piano_melodies',
    'whispering_choir_textures',
    'industrial_metallic_echoes',
    'suspense_percussion',
    'ritualistic_chanting'
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeInput(input: DynamicHorrorMusicInput): NormalizedInput {
  const villainIntensity =
    typeof input.villainPresence === 'boolean'
      ? input.villainPresence
        ? 0.78
        : 0.12
      : clamp(input.villainPresence, 0, 1);

  const tensionLevel = clamp(Math.round(input.playerTensionLevel), 0, 100);
  const durationSecondsTarget = clamp(
    input.durationSeconds ?? 24 + tensionLevel * 0.82,
    MIN_DURATION_SECONDS,
    MAX_DURATION_SECONDS
  );
  const sampleRate = clamp(
    Math.round(input.sampleRate ?? DEFAULT_SAMPLE_RATE),
    MIN_SAMPLE_RATE,
    MAX_SAMPLE_RATE
  );

  return {
    storyMood: input.storyMood,
    sceneType: input.sceneType,
    villainIntensity,
    tensionLevel,
    location: input.location,
    durationSecondsTarget,
    sampleRate,
    seed: input.seed ?? `${Date.now()}-${Math.random().toFixed(8)}`
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): RandomSource {
  let state = hashString(seed) || 0xa341316c;

  const next = (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    between(min: number, max: number): number {
      return min + (max - min) * next();
    },
    integer(min: number, max: number): number {
      return Math.floor(this.between(min, max + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty collection.');
      }
      return items[this.integer(0, items.length - 1)] as T;
    }
  };
}

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function quantizedCycles(desiredHz: number, durationSeconds: number): number {
  return Math.max(1, Math.round(desiredHz * durationSeconds));
}

function wrapUnit(value: number): number {
  let next = value % 1;
  if (next < 0) {
    next += 1;
  }
  return next;
}

function phaseSinceStart(loopPosition: number, start: number): number {
  return wrapUnit(loopPosition - start);
}

function eventEnvelope(phase: number, lengthNorm: number, attackNorm: number, decayShape: number): number {
  if (phase > lengthNorm || lengthNorm <= 0) {
    return 0;
  }

  const progress = phase / lengthNorm;
  const attack = clamp(attackNorm <= 0 ? 0.02 : attackNorm, 0.001, 0.7);
  const attackValue = clamp(progress / attack, 0, 1);
  const decayValue = Math.exp(-decayShape * progress);
  return attackValue * decayValue;
}

function selectScale(mood: MusicMood, random: RandomSource): TonalScale {
  const options = moodScalePreferences[mood] ?? ['natural_minor'];
  return random.pick(options);
}

function pickLayerStyles(input: NormalizedInput, random: RandomSource): HorrorLayerStyle[] {
  const selected = new Set<HorrorLayerStyle>(['dark_ambient_drones']);

  if (input.sceneType === 'investigation' || input.sceneType === 'revelation' || input.sceneType === 'aftermath') {
    selected.add('eerie_piano_melodies');
  }

  if (input.villainIntensity >= 0.33) {
    selected.add('whispering_choir_textures');
  }

  if (input.location === 'basement' || input.location === 'alley' || input.location === 'hospital') {
    selected.add('industrial_metallic_echoes');
  }

  if (input.tensionLevel >= 45 || input.sceneType === 'chase' || input.sceneType === 'confrontation') {
    selected.add('suspense_percussion');
  }

  if (input.location === 'ritual_chamber' || input.sceneType === 'ritual') {
    selected.add('ritualistic_chanting');
  }

  const orderedStyles = listSupportedHorrorLayerStyles();
  while (selected.size < 3) {
    selected.add(random.pick(orderedStyles));
  }

  return orderedStyles.filter((style) => selected.has(style));
}

function buildScaleMidi(rootMidi: number, scale: TonalScale, octaves: number): number[] {
  const notes: number[] = [];
  const intervals = scaleIntervals[scale];
  for (let octave = 0; octave < octaves; octave += 1) {
    const base = rootMidi + octave * 12;
    for (const interval of intervals) {
      notes.push(base + interval);
    }
  }
  return notes;
}

function createPeriodicTexture(random: RandomSource, harmonicCount: number, maxCycles: number): PeriodicTexture {
  const harmonics: PeriodicTexture['harmonics'] = [];

  for (let i = 0; i < harmonicCount; i += 1) {
    const cycles = random.integer(1, maxCycles);
    const rolloff = 1 / Math.max(1, Math.sqrt(cycles));
    harmonics.push({
      cycles,
      amplitude: random.between(0.18, 0.95) * rolloff,
      phase: random.between(0, TAU)
    });
  }

  return { harmonics };
}

function sampleTexture(texture: PeriodicTexture, loopPosition: number): number {
  let total = 0;
  for (const harmonic of texture.harmonics) {
    total += Math.sin(TAU * harmonic.cycles * loopPosition + harmonic.phase) * harmonic.amplitude;
  }
  return total;
}

function createMelodyEvents(
  random: RandomSource,
  durationSeconds: number,
  beatCount: number,
  sourceNotes: number[],
  density: number
): MelodyEvent[] {
  const events: MelodyEvent[] = [];
  let beatCursor = 0;
  let noteIndex = random.integer(0, sourceNotes.length - 1);

  while (beatCursor < beatCount) {
    if (random.next() < density) {
      noteIndex = clamp(
        noteIndex + random.integer(-2, 2),
        0,
        sourceNotes.length - 1
      );
      const noteA = sourceNotes[noteIndex] ?? sourceNotes[0] ?? 48;
      const noteB = sourceNotes[clamp(noteIndex + random.integer(1, 3), 0, sourceNotes.length - 1)] ?? noteA + 7;
      const lengthBeats = random.pick([0.5, 1, 1.5, 2]);
      events.push({
        startNorm: beatCursor / beatCount,
        lengthNorm: lengthBeats / beatCount,
        cyclesA: quantizedCycles(midiToHz(noteA), durationSeconds),
        cyclesB: quantizedCycles(midiToHz(noteB), durationSeconds),
        velocity: random.between(0.35, 0.9)
      });
    }
    beatCursor += random.pick([0.5, 1, 1, 1.5]);
  }

  return events;
}

function createPercussionEvents(
  random: RandomSource,
  durationSeconds: number,
  beatCount: number,
  density: number,
  lowHz: number,
  midHz: number,
  highHz: number
): PercussionEvent[] {
  const events: PercussionEvent[] = [];

  for (let beat = 0; beat < beatCount; beat += 0.5) {
    const onBeatBias = beat % 1 === 0 ? 0.24 : 0;
    if (random.next() < density + onBeatBias) {
      events.push({
        startNorm: beat / beatCount,
        lengthNorm: random.pick([0.08, 0.12, 0.16, 0.2]),
        cyclesA: quantizedCycles(lowHz * random.between(0.85, 1.15), durationSeconds),
        cyclesB: quantizedCycles(midHz * random.between(0.85, 1.15), durationSeconds),
        cyclesC: quantizedCycles(highHz * random.between(0.85, 1.15), durationSeconds),
        velocity: random.between(0.3, 1)
      });
    }
  }

  return events;
}

function renderAmbientTexture(location: HorrorMusicLocation, loopPosition: number, state: RenderState): number {
  const n1 = sampleTexture(state.ambientTextureA, loopPosition);
  const n2 = sampleTexture(state.ambientTextureB, loopPosition);
  const n3 = sampleTexture(state.ambientTextureC, loopPosition);

  switch (location) {
    case 'forest': {
      const wind = n1 * 0.18 + n2 * 0.08;
      const chirpGate = Math.max(0, Math.sin(TAU * 11 * loopPosition));
      const chirp = chirpGate * chirpGate * Math.sin(TAU * 900 * loopPosition) * 0.05;
      return wind + chirp + n3 * 0.03;
    }
    case 'basement': {
      const rumble = Math.sin(TAU * state.rootSubCycles * loopPosition) * 0.2;
      const dripGate = Math.max(0, Math.sin(TAU * 17 * loopPosition + 0.5));
      const drip = dripGate * dripGate * Math.sin(TAU * 380 * loopPosition) * 0.04;
      return rumble + n1 * 0.05 + drip;
    }
    case 'hospital': {
      const hum = Math.sin(TAU * 60 * state.durationSeconds * loopPosition) * 0.1;
      const fluorescent = Math.sin(TAU * 120 * state.durationSeconds * loopPosition + 1.1) * 0.05;
      const monitorGate = Math.max(0, Math.sin(TAU * 6 * loopPosition + 0.2));
      const monitor = monitorGate * monitorGate * Math.sin(TAU * 880 * loopPosition) * 0.035;
      return hum + fluorescent + monitor + n2 * 0.04;
    }
    case 'alley': {
      const rain = n1 * 0.16 + n2 * 0.11;
      const neon = Math.sin(TAU * 220 * state.durationSeconds * loopPosition + 0.4) * 0.05;
      const pingGate = Math.max(0, Math.sin(TAU * 9 * loopPosition + 1.2));
      const ping = pingGate * pingGate * Math.sin(TAU * 1300 * loopPosition) * 0.03;
      return rain + neon + ping;
    }
    case 'ritual_chamber': {
      const low = Math.sin(TAU * state.rootSubCycles * loopPosition + 0.9) * 0.18;
      const swell = Math.sin(TAU * 2 * loopPosition + 0.35);
      const swellShape = swell * swell;
      return low + n1 * 0.1 + n2 * 0.05 + swellShape * 0.08;
    }
    default:
      return 0;
  }
}

function renderDrone(loopPosition: number, state: RenderState): number {
  const sway = 0.09 * Math.sin(TAU * 2 * loopPosition + 0.7);
  const deep = Math.sin(TAU * (state.rootSubCycles * loopPosition + sway));
  const body = Math.sin(TAU * (state.rootCycles * loopPosition + 0.04 * Math.sin(TAU * 3 * loopPosition)));
  const air = sampleTexture(state.droneTexture, loopPosition) * 0.18;
  const swell = 0.58 + 0.42 * Math.sin(TAU * loopPosition + 1.2);
  return (deep * 0.55 + body * 0.3 + air) * swell;
}

function renderPiano(loopPosition: number, events: MelodyEvent[]): number {
  let total = 0;
  for (const event of events) {
    const phase = phaseSinceStart(loopPosition, event.startNorm);
    if (phase > event.lengthNorm) {
      continue;
    }
    const envelope = eventEnvelope(phase, event.lengthNorm, 0.08, 6.5);
    const strike = Math.sin(TAU * event.cyclesA * phase);
    const overtone = Math.sin(TAU * event.cyclesB * phase + 0.23);
    total += (strike * 0.72 + overtone * 0.28) * envelope * event.velocity;
  }
  return total;
}

function renderChoir(loopPosition: number, state: RenderState): number {
  const breath = sampleTexture(state.choirTexture, loopPosition);
  const toneA = Math.sin(TAU * state.choirCyclesA * loopPosition + 0.4);
  const toneB = Math.sin(TAU * state.choirCyclesB * loopPosition + 1.1);
  const gate = 0.5 + 0.5 * Math.sin(TAU * 4 * loopPosition + 0.2);
  return (breath * 0.44 + toneA * 0.36 + toneB * 0.2) * gate;
}

function renderMetallicEchoes(loopPosition: number, events: PercussionEvent[]): number {
  let total = 0;
  for (const event of events) {
    const phase = phaseSinceStart(loopPosition, event.startNorm);
    if (phase > event.lengthNorm) {
      continue;
    }
    const envelope = eventEnvelope(phase, event.lengthNorm, 0.04, 11);
    const strike =
      Math.sin(TAU * event.cyclesA * phase) * 0.5 +
      Math.sin(TAU * event.cyclesB * phase + 0.9) * 0.35 +
      Math.sin(TAU * event.cyclesC * phase + 1.6) * 0.15;
    total += strike * envelope * event.velocity;
  }
  return total;
}

function renderPercussion(loopPosition: number, events: PercussionEvent[], state: RenderState): number {
  let total = 0;
  for (const event of events) {
    const phase = phaseSinceStart(loopPosition, event.startNorm);
    if (phase > event.lengthNorm) {
      continue;
    }
    const kickEnv = eventEnvelope(phase, event.lengthNorm, 0.02, 9.5);
    const kick = Math.sin(TAU * event.cyclesA * phase * (1 + 0.35 * (1 - phase / event.lengthNorm)));
    const click = Math.sin(TAU * event.cyclesC * phase) * 0.12;
    const noise = sampleTexture(state.percussionTexture, phase) * 0.1;
    total += (kick * 0.86 + click + noise) * kickEnv * event.velocity;
  }
  return total;
}

function renderChant(loopPosition: number, events: MelodyEvent[], state: RenderState): number {
  let total = 0;
  for (const event of events) {
    const phase = phaseSinceStart(loopPosition, event.startNorm);
    if (phase > event.lengthNorm) {
      continue;
    }
    const envelope = eventEnvelope(phase, event.lengthNorm, 0.12, 4.8);
    const base = Math.sin(TAU * state.chantCycles * phase);
    const throat = Math.sin(TAU * event.cyclesA * phase + 0.8) * 0.38;
    const formant = Math.sin(TAU * event.cyclesB * phase + 1.9) * 0.24;
    total += (base * 0.38 + throat + formant) * envelope * event.velocity;
  }
  return total;
}

function normalizeStereo(left: Float32Array, right: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < left.length; i += 1) {
    peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
  }

  if (peak <= 0.000001) {
    return;
  }

  const scale = TARGET_PEAK / peak;
  for (let i = 0; i < left.length; i += 1) {
    left[i] = clamp((left[i] ?? 0) * scale, -1, 1);
    right[i] = clamp((right[i] ?? 0) * scale, -1, 1);
  }
}

function calculateLoopBoundaryDelta(left: Float32Array, right: Float32Array): number {
  if (left.length < 2 || right.length < 2) {
    return 0;
  }
  const lastIndex = left.length - 1;
  return Math.max(
    Math.abs((left[0] ?? 0) - (left[lastIndex] ?? 0)),
    Math.abs((right[0] ?? 0) - (right[lastIndex] ?? 0))
  );
}

function encodeStereoWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const frames = Math.min(left.length, right.length);
  const channels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, value: string): void => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  let cursor = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    const l = clamp(left[frame] ?? 0, -1, 1);
    const r = clamp(right[frame] ?? 0, -1, 1);
    view.setInt16(cursor, Math.round(l * 32767), true);
    view.setInt16(cursor + 2, Math.round(r * 32767), true);
    cursor += 4;
  }

  return new Uint8Array(buffer);
}

export function generateDynamicHorrorLoop(input: DynamicHorrorMusicInput): DynamicHorrorMusicResult {
  const normalized = normalizeInput(input);
  const random = createRandom(normalized.seed);
  const layerStyles = pickLayerStyles(normalized, random);
  const tonalKey = random.pick(tonalKeys);
  const scale = selectScale(normalized.storyMood, random);
  const keyIndex = tonalKeys.indexOf(tonalKey);
  const rootMidi = 36 + keyIndex;

  const baseTempo = sceneTempoBase[normalized.sceneType];
  const tempoBpm = clamp(
    Math.round(
      baseTempo +
        normalized.tensionLevel * 0.21 +
        normalized.villainIntensity * 8 +
        random.between(-8, 8)
    ),
    42,
    108
  );

  const barSeconds = 240 / tempoBpm;
  const minimumBars = Math.max(1, Math.ceil(MIN_DURATION_SECONDS / barSeconds));
  const maximumBars = Math.max(minimumBars, Math.floor(MAX_DURATION_SECONDS / barSeconds));
  const targetBars = Math.round(normalized.durationSecondsTarget / barSeconds);
  const barCount = clamp(targetBars, minimumBars, maximumBars);
  const durationSeconds = clamp(barCount * barSeconds, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS);
  const beatCount = barCount * 4;
  const sampleCount = Math.max(2, Math.floor(durationSeconds * normalized.sampleRate));

  const scaleNotes = buildScaleMidi(rootMidi, scale, 3);
  const pianoEvents = createMelodyEvents(
    random,
    durationSeconds,
    beatCount,
    scaleNotes,
    clamp(0.25 + normalized.tensionLevel / 180, 0.25, 0.88)
  );
  const metallicEvents = createPercussionEvents(
    random,
    durationSeconds,
    beatCount,
    clamp(0.12 + normalized.villainIntensity * 0.26, 0.12, 0.6),
    210,
    440,
    910
  );
  const percussionEvents = createPercussionEvents(
    random,
    durationSeconds,
    beatCount,
    clamp(0.2 + normalized.tensionLevel / 160, 0.2, 0.9),
    58,
    168,
    1320
  );
  const chantEvents = createMelodyEvents(
    random,
    durationSeconds,
    beatCount,
    buildScaleMidi(rootMidi - 12, scale, 2),
    clamp(0.22 + normalized.villainIntensity * 0.35, 0.22, 0.85)
  );

  const layerParameters = layerStyles.map((style) => ({
    style,
    gain: random.between(0.18, 0.56),
    pan: random.between(-0.65, 0.65),
    variation: random.between(0, 1)
  }));

  const state: RenderState = {
    durationSeconds,
    sampleRate: normalized.sampleRate,
    sampleCount,
    barCount,
    beatCount,
    rootCycles: quantizedCycles(midiToHz(rootMidi), durationSeconds),
    rootSubCycles: quantizedCycles(midiToHz(rootMidi - 24), durationSeconds),
    choirCyclesA: quantizedCycles(midiToHz(rootMidi - 12), durationSeconds),
    choirCyclesB: quantizedCycles(midiToHz(rootMidi + 3), durationSeconds),
    chantCycles: quantizedCycles(midiToHz(rootMidi - 19), durationSeconds),
    ambientTextureA: createPeriodicTexture(random, 8, 29),
    ambientTextureB: createPeriodicTexture(random, 9, 34),
    ambientTextureC: createPeriodicTexture(random, 7, 21),
    droneTexture: createPeriodicTexture(random, 7, 18),
    choirTexture: createPeriodicTexture(random, 12, 41),
    percussionTexture: createPeriodicTexture(random, 8, 23),
    pianoEvents,
    metallicEvents,
    percussionEvents,
    chantEvents
  };

  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const loopPosition = sampleCount <= 1 ? 0 : i / (sampleCount - 1);
    let channelLeft = 0;
    let channelRight = 0;

    const ambient = renderAmbientTexture(normalized.location, loopPosition, state);
    channelLeft += ambient * 0.32;
    channelRight += ambient * 0.32;

    for (const layer of layerParameters) {
      let value = 0;
      switch (layer.style) {
        case 'dark_ambient_drones':
          value = renderDrone(loopPosition, state);
          break;
        case 'eerie_piano_melodies':
          value = renderPiano(loopPosition, state.pianoEvents);
          break;
        case 'whispering_choir_textures':
          value = renderChoir(loopPosition, state);
          break;
        case 'industrial_metallic_echoes':
          value = renderMetallicEchoes(loopPosition, state.metallicEvents);
          break;
        case 'suspense_percussion':
          value = renderPercussion(loopPosition, state.percussionEvents, state);
          break;
        case 'ritualistic_chanting':
          value = renderChant(loopPosition, state.chantEvents, state);
          break;
      }

      const gain = layer.gain * (0.9 + layer.variation * 0.25);
      const panLeft = 0.8 - layer.pan * 0.5;
      const panRight = 0.8 + layer.pan * 0.5;
      channelLeft += value * gain * panLeft;
      channelRight += value * gain * panRight;
    }

    left[i] = channelLeft;
    right[i] = channelRight;
  }

  normalizeStereo(left, right);
  const loopBoundaryDelta = calculateLoopBoundaryDelta(left, right);
  const wavBytes = encodeStereoWav(left, right, normalized.sampleRate);

  const loopId = `dyn-${hashString(
    `${normalized.seed}:${tempoBpm}:${tonalKey}:${scale}:${durationSeconds}:${layerStyles.join(',')}`
  ).toString(16)}`;

  return {
    loopId,
    seed: normalized.seed,
    sampleRate: normalized.sampleRate,
    durationSeconds,
    wavBytes,
    loopBoundaryDelta,
    parameters: {
      tempoBpm,
      tonalKey,
      scale,
      durationSeconds,
      barCount,
      villainIntensity: normalized.villainIntensity,
      tensionLevel: normalized.tensionLevel,
      locationTexture: normalized.location,
      layerParameters
    }
  };
}

export interface SoundDirectorTelemetry {
  playerProgress: number;
  timeOfNightHour: number;
  villainProximity: number;
  dangerLevel: number;
  storyMood: MusicMood;
  location: HorrorMusicLocation;
  sceneTypeHint?: HorrorMusicSceneType;
}

export type SoundDirectorBand = 'calm_ambience' | 'suspense_drones' | 'heartbeat_percussion';

export interface SoundDirectorDecision {
  tension: number;
  tensionBucket: number;
  band: SoundDirectorBand;
  bandLabel: string;
  recommendedSceneType: HorrorMusicSceneType;
  villainIntensity: number;
  targetDurationSeconds: number;
  reason: string;
}

export interface SoundDirectorLoopResult {
  decision: SoundDirectorDecision;
  loop: DynamicHorrorMusicResult;
}

function normalizeHour(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.floor(value);
  const wrapped = rounded % 24;
  return wrapped < 0 ? wrapped + 24 : wrapped;
}

function nightPressure(hour: number): number {
  if (hour >= 23 || hour <= 3) {
    return 25;
  }
  if (hour >= 20 || hour <= 5) {
    return 16;
  }
  if (hour >= 18 || hour <= 6) {
    return 10;
  }
  return 3;
}

function moodPressure(mood: MusicMood): number {
  switch (mood) {
    case 'slasher_pulse':
    case 'occult_conspiracy':
    case 'cosmic_unease':
      return 9;
    case 'psychological_tension':
    case 'techno_paranormal':
      return 7;
    case 'gothic_requiem':
    case 'institutional_haunt':
      return 6;
    default:
      return 4;
  }
}

function resolveBand(tension: number): SoundDirectorBand {
  if (tension >= 80) {
    return 'heartbeat_percussion';
  }
  if (tension >= 35) {
    return 'suspense_drones';
  }
  return 'calm_ambience';
}

function bandLabel(band: SoundDirectorBand): string {
  switch (band) {
    case 'heartbeat_percussion':
      return 'Rapid Heartbeat Percussion';
    case 'suspense_drones':
      return 'Suspense Drones';
    case 'calm_ambience':
      return 'Calm Ambience';
  }
}

function chooseSceneType(
  band: SoundDirectorBand,
  progress: number,
  danger: number,
  hint?: HorrorMusicSceneType
): HorrorMusicSceneType {
  if (hint) {
    return hint;
  }

  if (band === 'heartbeat_percussion') {
    return danger >= 85 ? 'chase' : 'confrontation';
  }

  if (band === 'suspense_drones') {
    return progress >= 70 ? 'revelation' : 'investigation';
  }

  return progress >= 75 ? 'aftermath' : 'exploration';
}

function durationForBand(band: SoundDirectorBand, tension: number): number {
  if (band === 'heartbeat_percussion') {
    return clamp(12 + (100 - tension) * 0.1, 10, 18);
  }
  if (band === 'suspense_drones') {
    return clamp(20 + (100 - tension) * 0.2, 16, 32);
  }
  return clamp(32 + (100 - tension) * 0.3, 24, 60);
}

export class AISoundDirector {
  evaluate(telemetry: SoundDirectorTelemetry): SoundDirectorDecision {
    const progress = clamp(telemetry.playerProgress, 0, 100);
    const proximity = clamp(telemetry.villainProximity, 0, 100);
    const danger = clamp(telemetry.dangerLevel, 0, 100);
    const hour = normalizeHour(telemetry.timeOfNightHour);

    const tension = Math.round(
      clamp(
        progress * 0.24 +
          proximity * 0.32 +
          danger * 0.34 +
          nightPressure(hour) +
          moodPressure(telemetry.storyMood),
        0,
        100
      )
    );

    const band = resolveBand(tension);
    const sceneType = chooseSceneType(band, progress, danger, telemetry.sceneTypeHint);
    const villainIntensity = clamp((proximity * 0.7 + danger * 0.3) / 100, 0, 1);
    const targetDurationSeconds = durationForBand(band, tension);

    return {
      tension,
      tensionBucket: Math.floor(tension / 10),
      band,
      bandLabel: bandLabel(band),
      recommendedSceneType: sceneType,
      villainIntensity,
      targetDurationSeconds,
      reason: `progress=${Math.round(progress)} night=${hour} proximity=${Math.round(
        proximity
      )} danger=${Math.round(danger)}`
    };
  }
}

export function createSoundDirectorLoop(
  telemetry: SoundDirectorTelemetry,
  options?: {
    seed?: string;
    sampleRate?: number;
    director?: AISoundDirector;
  }
): SoundDirectorLoopResult {
  const director = options?.director ?? new AISoundDirector();
  const decision = director.evaluate(telemetry);
  const seed =
    options?.seed ??
    `${telemetry.storyMood}:${telemetry.location}:${decision.band}:${decision.tensionBucket}:${normalizeHour(
      telemetry.timeOfNightHour
    )}`;

  const loop = generateDynamicHorrorLoop({
    storyMood: telemetry.storyMood,
    sceneType: decision.recommendedSceneType,
    villainPresence: decision.villainIntensity,
    playerTensionLevel: decision.tension,
    location: telemetry.location,
    durationSeconds: decision.targetDurationSeconds,
    sampleRate: options?.sampleRate ?? DEFAULT_SAMPLE_RATE,
    seed
  });

  return {
    decision,
    loop
  };
}
