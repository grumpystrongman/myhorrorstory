import { describe, expect, it } from 'vitest';
import {
  DeterministicVoiceProvider,
  VoiceOrchestrator,
  buildPiperCliArgs,
  createLaunchVoiceProfileRegistry,
  launchVoiceProfiles,
  validateUniqueVoiceAssignments,
  type ProviderVoiceRequest,
  type ProviderVoiceResult,
  type VoiceProvider
} from './index.js';

class SpyVoiceProvider implements VoiceProvider {
  readonly id = 'spy';

  public lastRequest: ProviderVoiceRequest | null = null;

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    this.lastRequest = request;
    return {
      bytes: new TextEncoder().encode('spy-audio'),
      provider: this.id,
      voiceId: request.providerPreference.voiceId,
      format: request.format
    };
  }
}

class FailingProvider implements VoiceProvider {
  readonly id = 'failing';

  async synthesize(): Promise<ProviderVoiceResult> {
    throw new Error('provider unavailable');
  }
}

describe('voice orchestration', () => {
  it('returns deterministic cache key and metadata for legacy style requests', async () => {
    const orchestrator = new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]);
    const output = await orchestrator.synthesize({
      characterId: 'narrator',
      text: 'The line is dead.',
      style: 'ominous',
      format: 'wav'
    });

    expect(output.provider).toBe('deterministic');
    expect(output.cacheKey.length).toBeGreaterThan(20);
    expect(output.emotion).toBe('ominous');
  });

  it('falls back to secondary provider on synthesis failure', async () => {
    const orchestrator = new VoiceOrchestrator([
      new FailingProvider(),
      new DeterministicVoiceProvider('deterministic')
    ]);

    const output = await orchestrator.synthesize({
      storyId: 'static-between-stations',
      characterId: 'Lead Investigator',
      text: 'You are not hearing static.',
      format: 'wav'
    });

    expect(output.provider).toBe('deterministic');
    expect(output.voiceId).toContain('deterministic');
  });

  it('derives emotional variation from story context', async () => {
    const registry = createLaunchVoiceProfileRegistry();
    const spy = new SpyVoiceProvider();
    const orchestrator = new VoiceOrchestrator([spy], { registry });

    await orchestrator.synthesize({
      storyId: 'red-creek-winter',
      characterId: 'Sheriff',
      text: 'All units to ridge road, now.',
      format: 'wav',
      context: {
        storyId: 'red-creek-winter',
        eventType: 'chapter_event',
        tension: 0.95,
        urgency: 0.92,
        beatId: 'beat-3'
      }
    });

    expect(spy.lastRequest?.emotion).toBe('urgent');
    expect(spy.lastRequest?.expression.rate).toBeGreaterThan(1.05);
  });

  it('maintains unique launch voice assignments for story + character pairs', () => {
    const uniqueness = validateUniqueVoiceAssignments(launchVoiceProfiles);
    expect(launchVoiceProfiles.length).toBe(40);
    expect(uniqueness.duplicateProfileIds).toEqual([]);
    expect(uniqueness.duplicateStoryCharacterKeys).toEqual([]);
    expect(uniqueness.duplicatePrimaryVoiceKeys).toEqual([]);
  });

  it('builds Piper CLI arguments from expression controls', () => {
    const args = buildPiperCliArgs({
      binaryPath: 'piper',
      modelPath: 'en_US-lessac-high.onnx',
      outputFile: 'output.wav',
      speakerId: 3,
      text: 'Signal lost',
      format: 'wav',
      expression: {
        rate: 1.2,
        pitch: 0.5,
        stability: 0.7,
        style: 0.8,
        gainDb: 0
      }
    });

    expect(args).toContain('--model');
    expect(args).toContain('en_US-lessac-high.onnx');
    expect(args).toContain('--speaker');
    expect(args).toContain('3');
    expect(args).toContain('--length_scale');
  });
});
