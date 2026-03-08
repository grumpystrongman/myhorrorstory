import {
  createLaunchVoiceProfileRegistry,
  InMemoryVoiceProfileRegistry,
  launchVoiceProfiles
} from './casting.js';
import type {
  CharacterVoiceProfile,
  ProviderVoiceResult,
  VoiceEmotion,
  VoiceProfileRegistry,
  VoiceProvider,
  VoiceProviderPreference,
  VoiceRequest,
  VoiceResult,
  VoiceSex
} from './types.js';
import { buildVoiceCacheKey, resolveEmotion, resolveExpression } from './utils.js';

export interface VoiceOrchestratorOptions {
  registry?: VoiceProfileRegistry;
  defaultLocale?: string;
  defaultRegion?: string;
  defaultSex?: VoiceSex;
}

function createFallbackProfile(
  request: VoiceRequest,
  providers: VoiceProvider[],
  options: VoiceOrchestratorOptions
): CharacterVoiceProfile {
  return {
    id: `voice.fallback.${request.storyId ?? request.context?.storyId ?? 'global'}.${request.characterId}`,
    storyId: request.storyId ?? request.context?.storyId ?? 'global',
    characterId: request.characterId,
    displayName: request.characterId,
    region: options.defaultRegion ?? 'global',
    locale: options.defaultLocale ?? 'en-US',
    sex: options.defaultSex ?? 'unknown',
    archetype: 'narrator',
    cadence: 'Default fallback cadence.',
    vocabularyTone: 'Default fallback vocabulary.',
    emotionalRange: 'Default fallback emotional range.',
    defaultEmotion: 'neutral',
    expressions: {
      neutral: { rate: 1, pitch: 0, stability: 0.82, style: 0.45, gainDb: 0 },
      calm: { rate: 0.95, pitch: -0.05, stability: 0.88, style: 0.3, gainDb: -0.4 },
      urgent: { rate: 1.15, pitch: 0.2, stability: 0.72, style: 0.62, gainDb: 1.4 },
      ominous: { rate: 0.84, pitch: -0.35, stability: 0.88, style: 0.72, gainDb: -0.4 }
    },
    variation: {
      rateJitter: 0.05,
      pitchJitter: 0.4,
      styleJitter: 0.08
    },
    providerPreferences: providers.map((provider, index) => ({
      provider: provider.id,
      voiceId: `${request.characterId}-${provider.id}-${index + 1}`
    }))
  };
}

function resolveProfile(
  request: VoiceRequest,
  providers: VoiceProvider[],
  registry: VoiceProfileRegistry,
  options: VoiceOrchestratorOptions
): CharacterVoiceProfile {
  if (request.profile) {
    return request.profile;
  }

  if (request.profileId) {
    const byId = registry.getByProfileId(request.profileId);
    if (byId) {
      return byId;
    }
  }

  const storyId = request.storyId ?? request.context?.storyId;
  if (storyId) {
    const byStoryCharacter = registry.getByStoryCharacter(storyId, request.characterId);
    if (byStoryCharacter) {
      return byStoryCharacter;
    }
  }

  const byCharacter = registry.getDefaultByCharacter(request.characterId);
  if (byCharacter) {
    return byCharacter;
  }

  return createFallbackProfile(request, providers, options);
}

function buildProviderAttemptChain(
  profile: CharacterVoiceProfile,
  providers: VoiceProvider[]
): Array<{ provider: VoiceProvider; preference: VoiceProviderPreference }> {
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const attempts: Array<{ provider: VoiceProvider; preference: VoiceProviderPreference }> = [];

  for (const preference of profile.providerPreferences) {
    const provider = providersById.get(preference.provider);
    if (provider) {
      attempts.push({ provider, preference });
    }
  }

  if (attempts.length === 0) {
    for (const provider of providers) {
      attempts.push({
        provider,
        preference: {
          provider: provider.id,
          voiceId: `${profile.id}.${provider.id}`
        }
      });
    }
  }

  return attempts;
}

function toVoiceResult(
  profile: CharacterVoiceProfile,
  emotion: VoiceEmotion,
  cacheKey: string,
  providerResult: ProviderVoiceResult
): VoiceResult {
  return {
    cacheKey,
    bytes: providerResult.bytes,
    provider: providerResult.provider,
    voiceId: providerResult.voiceId,
    format: providerResult.format,
    profileId: profile.id,
    characterId: profile.characterId,
    emotion,
    region: profile.region,
    sex: profile.sex,
    metadata: providerResult.metadata
  };
}

export class VoiceOrchestrator {
  private readonly registry: VoiceProfileRegistry;

  constructor(
    private readonly providers: VoiceProvider[],
    private readonly options: VoiceOrchestratorOptions = {}
  ) {
    this.registry = options.registry ?? createLaunchVoiceProfileRegistry();
  }

  getVoiceProfiles(): CharacterVoiceProfile[] {
    return this.registry.list();
  }

  getLaunchProfiles(): CharacterVoiceProfile[] {
    return launchVoiceProfiles;
  }

  getRegistry(): VoiceProfileRegistry {
    return this.registry;
  }

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    if (this.providers.length === 0) {
      throw new Error('No voice providers configured.');
    }

    const profile = resolveProfile(request, this.providers, this.registry, this.options);
    const emotion = resolveEmotion(request, profile);
    const expression = resolveExpression(profile, emotion, request);
    const attempts = buildProviderAttemptChain(profile, this.providers);

    let lastError: unknown;

    for (const attempt of attempts) {
      const cacheKey = buildVoiceCacheKey({
        profileId: profile.id,
        storyId: request.storyId ?? request.context?.storyId,
        characterId: profile.characterId,
        provider: attempt.preference.provider,
        voiceId: attempt.preference.voiceId,
        model: attempt.preference.model,
        format: request.format,
        emotion,
        expression,
        text: request.text,
        region: profile.region,
        sex: profile.sex,
        context: request.context
      });

      try {
        const providerResult = await attempt.provider.synthesize({
          cacheKey,
          text: request.text,
          format: request.format,
          emotion,
          context: {
            ...request.context,
            storyId: request.storyId ?? request.context?.storyId
          },
          expression,
          profile,
          providerPreference: attempt.preference
        });

        return toVoiceResult(profile, emotion, cacheKey, providerResult);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No voice provider available for the requested profile.');
  }
}

export const launchVoiceProfileRegistry = new InMemoryVoiceProfileRegistry(launchVoiceProfiles);
