import { describe, expect, it } from 'vitest';
import {
  AISoundDirector,
  createSoundDirectorLoop,
  DeterministicMusicProvider,
  DynamicHorrorMusicOrchestrator,
  MusicGenerationOrchestrator,
  ProceduralHorrorMusicProvider,
  generateDynamicHorrorLoop,
  getStoryTitle,
  getTrackById,
  listSupportedHorrorLayerStyles,
  launchScoreManifest,
  listStoryScores,
  resolveScoreTrack,
  resolveStoryIdFromPath,
  validateScoreManifest
} from './index.js';

describe('music manifest', () => {
  it('validates launch score manifest integrity', () => {
    const validation = validateScoreManifest(launchScoreManifest);
    expect(validation.hasGlobalTrack).toBe(true);
    expect(validation.duplicateIds).toEqual([]);
    expect(validation.duplicateStoryAssignments).toEqual([]);
  });

  it('resolves story tracks from explicit story id and intro route', () => {
    const byId = resolveScoreTrack({ pathname: '/play', storyId: 'ward-1908' });
    expect(byId.storyId).toBe('ward-1908');

    const byRoute = resolveScoreTrack({ pathname: '/stories/crown-of-salt/intro' });
    expect(byRoute.storyId).toBe('crown-of-salt');
  });

  it('falls back to global track when no story context exists', () => {
    const track = resolveScoreTrack({ pathname: '/' });
    expect(track.id).toBe(launchScoreManifest.globalTrackId);
  });

  it('lists all story score entries for launch catalog', () => {
    const stories = listStoryScores();
    expect(stories).toHaveLength(11);
    expect(stories[0]?.track.usage).toBe('story');
    const shortMode = stories.find((story) => story.storyId === 'midnight-lockbox');
    expect(shortMode?.mode).toBe('short-test');
    expect(shortMode?.timelineLabel).toContain('1-2 days');
  });

  it('maps helper functions correctly', () => {
    expect(resolveStoryIdFromPath('/stories/static-between-stations/intro')).toBe(
      'static-between-stations'
    );
    expect(getStoryTitle('dead-channel-protocol')).toBe('Dead Channel Protocol');
    expect(getTrackById('platform-overture')?.usage).toBe('global');
  });
});

describe('music generation orchestrator', () => {
  it('returns provider output through fallback chain', async () => {
    const orchestrator = new MusicGenerationOrchestrator([new DeterministicMusicProvider('test')]);
    const result = await orchestrator.generate({
      trackId: 'platform-overture',
      prompt: 'Dark drone with analog pulse',
      targetSeconds: 12,
      mood: 'cinematic_dread'
    });

    expect(result.provider).toBe('test');
    expect(result.assetKey).toContain('platform-overture');
  });
});

describe('dynamic horror music generation', () => {
  it('supports all required horror layer styles', () => {
    expect(listSupportedHorrorLayerStyles()).toEqual([
      'dark_ambient_drones',
      'eerie_piano_melodies',
      'whispering_choir_textures',
      'industrial_metallic_echoes',
      'suspense_percussion',
      'ritualistic_chanting'
    ]);
  });

  it('generates loop-safe audio with randomized parameters', () => {
    const loop = generateDynamicHorrorLoop({
      storyMood: 'psychological_tension',
      sceneType: 'investigation',
      villainPresence: true,
      playerTensionLevel: 63,
      location: 'basement',
      durationSeconds: 18,
      sampleRate: 8000,
      seed: 'music-seamless-test'
    });

    expect(loop.durationSeconds).toBeGreaterThanOrEqual(10);
    expect(loop.durationSeconds).toBeLessThanOrEqual(120);
    expect(loop.parameters.tempoBpm).toBeGreaterThanOrEqual(42);
    expect(loop.parameters.tempoBpm).toBeLessThanOrEqual(108);
    expect(loop.wavBytes.length).toBeGreaterThan(44);
    expect(loop.loopBoundaryDelta).toBeLessThan(0.02);
  });

  it('produces unique loop variants across seeds', () => {
    const left = generateDynamicHorrorLoop({
      storyMood: 'occult_conspiracy',
      sceneType: 'ritual',
      villainPresence: 0.9,
      playerTensionLevel: 81,
      location: 'ritual_chamber',
      durationSeconds: 16,
      sampleRate: 8000,
      seed: 'loop-left'
    });

    const right = generateDynamicHorrorLoop({
      storyMood: 'occult_conspiracy',
      sceneType: 'ritual',
      villainPresence: 0.9,
      playerTensionLevel: 81,
      location: 'ritual_chamber',
      durationSeconds: 16,
      sampleRate: 8000,
      seed: 'loop-right'
    });

    expect(left.loopId).not.toBe(right.loopId);
    expect(left.parameters.layerParameters).not.toEqual(right.parameters.layerParameters);
  });

  it('enforces duration bounds and strong ritual/villain layer selections', () => {
    const shortLoop = generateDynamicHorrorLoop({
      storyMood: 'folk_ritual',
      sceneType: 'ritual',
      villainPresence: true,
      playerTensionLevel: 92,
      location: 'ritual_chamber',
      durationSeconds: 4,
      sampleRate: 8000,
      seed: 'duration-short'
    });

    expect(shortLoop.durationSeconds).toBeGreaterThanOrEqual(10);
    expect(shortLoop.durationSeconds).toBeLessThanOrEqual(120);
    const layerStyles = shortLoop.parameters.layerParameters.map((entry) => entry.style);
    expect(layerStyles).toContain('ritualistic_chanting');
    expect(layerStyles).toContain('whispering_choir_textures');
    expect(layerStyles).toContain('suspense_percussion');
  });

  it('runs through provider orchestration', async () => {
    const orchestrator = new DynamicHorrorMusicOrchestrator([
      new ProceduralHorrorMusicProvider('procedural-test')
    ]);
    const loop = await orchestrator.generateLoop({
      storyMood: 'institutional_haunt',
      sceneType: 'aftermath',
      villainPresence: false,
      playerTensionLevel: 38,
      location: 'hospital',
      durationSeconds: 14,
      sampleRate: 8000,
      seed: 'provider-orchestrator'
    });

    expect(loop.loopId).toContain('dyn-');
    expect(loop.parameters.locationTexture).toBe('hospital');
  });
});

describe('AI sound director', () => {
  it('maps low tension telemetry to calm ambience', () => {
    const director = new AISoundDirector();
    const decision = director.evaluate({
      playerProgress: 0,
      timeOfNightHour: 12,
      villainProximity: 0,
      dangerLevel: 0,
      storyMood: 'cinematic_dread',
      location: 'forest'
    });

    expect(decision.tension).toBeLessThan(35);
    expect(decision.band).toBe('calm_ambience');
    expect(decision.bandLabel).toBe('Calm Ambience');
  });

  it('maps mid telemetry to suspense drones', () => {
    const director = new AISoundDirector();
    const decision = director.evaluate({
      playerProgress: 40,
      timeOfNightHour: 21,
      villainProximity: 40,
      dangerLevel: 35,
      storyMood: 'psychological_tension',
      location: 'basement'
    });

    expect(decision.tension).toBeGreaterThanOrEqual(35);
    expect(decision.tension).toBeLessThan(80);
    expect(decision.band).toBe('suspense_drones');
    expect(decision.bandLabel).toBe('Suspense Drones');
  });

  it('maps high telemetry to rapid heartbeat percussion', () => {
    const director = new AISoundDirector();
    const decision = director.evaluate({
      playerProgress: 92,
      timeOfNightHour: 1,
      villainProximity: 95,
      dangerLevel: 96,
      storyMood: 'slasher_pulse',
      location: 'alley'
    });

    expect(decision.tension).toBeGreaterThanOrEqual(80);
    expect(decision.band).toBe('heartbeat_percussion');
    expect(decision.bandLabel).toBe('Rapid Heartbeat Percussion');
  });

  it('creates a dynamic loop directly from director telemetry', () => {
    const output = createSoundDirectorLoop(
      {
        playerProgress: 68,
        timeOfNightHour: 23,
        villainProximity: 73,
        dangerLevel: 77,
        storyMood: 'occult_conspiracy',
        location: 'ritual_chamber'
      },
      {
        sampleRate: 8000,
        seed: 'director-loop'
      }
    );

    expect(output.loop.wavBytes.length).toBeGreaterThan(44);
    expect(output.loop.loopBoundaryDelta).toBeLessThan(0.02);
    expect(output.decision.tension).toBeGreaterThan(0);
  });
});
