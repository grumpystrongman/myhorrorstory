import type {
  CharacterVoiceProfile,
  VoiceArchetype,
  VoiceEmotion,
  VoiceProfileRegistry,
  VoiceProviderPreference,
  VoiceSex,
  VoiceVariation
} from './types.js';
import { hashString, slugify } from './utils.js';

interface ArchetypePreset {
  cadence: string;
  vocabularyTone: string;
  emotionalRange: string;
  defaultEmotion: VoiceEmotion;
  variation: VoiceVariation;
  expressions: CharacterVoiceProfile['expressions'];
}

const ARCHETYPE_PRESETS: Record<VoiceArchetype, ArchetypePreset> = {
  investigator: {
    cadence: 'Measured and deliberate with command presence.',
    vocabularyTone: 'Procedural, evidence-led, concise.',
    emotionalRange: 'Composed baseline with controlled urgency under pressure.',
    defaultEmotion: 'calm',
    variation: { rateJitter: 0.05, pitchJitter: 0.55, styleJitter: 0.08 },
    expressions: {
      neutral: { rate: 1, pitch: -0.2, stability: 0.88, style: 0.32, gainDb: 0 },
      calm: { rate: 0.96, pitch: -0.25, stability: 0.9, style: 0.3, gainDb: 0 },
      urgent: { rate: 1.12, pitch: 0.15, stability: 0.78, style: 0.5, gainDb: 1.1 },
      tense: { rate: 1.06, pitch: 0.05, stability: 0.82, style: 0.46, gainDb: 0.7 },
      relief: { rate: 0.95, pitch: 0, stability: 0.9, style: 0.28, gainDb: -0.4 }
    }
  },
  operator: {
    cadence: 'Crisp dispatch rhythm with clipped pacing.',
    vocabularyTone: 'Operational terminology and system references.',
    emotionalRange: 'Low baseline variance; spikes during active incidents.',
    defaultEmotion: 'neutral',
    variation: { rateJitter: 0.06, pitchJitter: 0.45, styleJitter: 0.07 },
    expressions: {
      neutral: { rate: 1, pitch: 0, stability: 0.9, style: 0.28, gainDb: 0 },
      calm: { rate: 0.94, pitch: -0.05, stability: 0.92, style: 0.24, gainDb: -0.3 },
      urgent: { rate: 1.18, pitch: 0.2, stability: 0.72, style: 0.55, gainDb: 1.8 },
      tense: { rate: 1.09, pitch: 0.1, stability: 0.78, style: 0.48, gainDb: 0.8 }
    }
  },
  witness: {
    cadence: 'Stops and starts with breath-heavy hesitations.',
    vocabularyTone: 'Sensory details, fragmented recall, emotional language.',
    emotionalRange: 'High variance from fear to relief.',
    defaultEmotion: 'fear',
    variation: { rateJitter: 0.11, pitchJitter: 1.25, styleJitter: 0.14 },
    expressions: {
      neutral: { rate: 0.98, pitch: 0.25, stability: 0.66, style: 0.58, gainDb: 0 },
      calm: { rate: 0.92, pitch: 0.15, stability: 0.72, style: 0.44, gainDb: -0.4 },
      fear: { rate: 1.22, pitch: 0.7, stability: 0.42, style: 0.74, gainDb: 1.7 },
      grief: { rate: 0.84, pitch: -0.2, stability: 0.5, style: 0.62, gainDb: -1.1 },
      urgent: { rate: 1.16, pitch: 0.6, stability: 0.48, style: 0.7, gainDb: 1.3 },
      relief: { rate: 0.9, pitch: 0.05, stability: 0.7, style: 0.35, gainDb: -0.8 }
    }
  },
  antagonist: {
    cadence: 'Controlled slow-burn pacing with deliberate pauses.',
    vocabularyTone: 'Metaphor-rich, manipulative, ritualized phrasing.',
    emotionalRange: 'Narrow variance with intentional menace.',
    defaultEmotion: 'ominous',
    variation: { rateJitter: 0.04, pitchJitter: 0.35, styleJitter: 0.06 },
    expressions: {
      neutral: { rate: 0.9, pitch: -0.5, stability: 0.92, style: 0.56, gainDb: -0.2 },
      ominous: { rate: 0.82, pitch: -0.75, stability: 0.95, style: 0.72, gainDb: -0.5 },
      anger: { rate: 1.04, pitch: -0.35, stability: 0.78, style: 0.82, gainDb: 1.9 },
      tense: { rate: 0.88, pitch: -0.55, stability: 0.9, style: 0.66, gainDb: 0.4 },
      calm: { rate: 0.86, pitch: -0.65, stability: 0.94, style: 0.6, gainDb: -0.3 }
    }
  },
  narrator: {
    cadence: 'Cinematic narration with adaptive pacing.',
    vocabularyTone: 'Descriptive, atmospheric, scene-setting language.',
    emotionalRange: 'Moderate range to guide tension curve.',
    defaultEmotion: 'neutral',
    variation: { rateJitter: 0.05, pitchJitter: 0.4, styleJitter: 0.1 },
    expressions: {
      neutral: { rate: 1, pitch: 0, stability: 0.86, style: 0.42, gainDb: 0 },
      calm: { rate: 0.93, pitch: -0.05, stability: 0.9, style: 0.35, gainDb: -0.5 },
      tense: { rate: 1.04, pitch: 0.12, stability: 0.8, style: 0.55, gainDb: 0.6 },
      ominous: { rate: 0.85, pitch: -0.4, stability: 0.9, style: 0.68, gainDb: -0.4 },
      relief: { rate: 0.94, pitch: 0, stability: 0.88, style: 0.32, gainDb: -0.8 }
    }
  }
};

interface CharacterCastingSeed {
  characterId: string;
  sex: VoiceSex;
  archetype: VoiceArchetype;
}

interface StoryCastingSeed {
  storyId: string;
  region: string;
  locale: string;
  cast: CharacterCastingSeed[];
}

export const launchStoryCastingSeeds: StoryCastingSeed[] = [
  {
    storyId: 'static-between-stations',
    region: 'north_atlantic_us',
    locale: 'en-US',
    cast: [
      { characterId: 'Lead Investigator', sex: 'female', archetype: 'investigator' },
      { characterId: 'Handler', sex: 'male', archetype: 'operator' },
      { characterId: 'Witness', sex: 'female', archetype: 'witness' },
      { characterId: 'Antagonist', sex: 'male', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'black-chapel-ledger',
    region: 'british_cliffside',
    locale: 'en-GB',
    cast: [
      { characterId: 'Canon Archivist', sex: 'male', archetype: 'investigator' },
      { characterId: 'Bell Keeper', sex: 'female', archetype: 'operator' },
      { characterId: 'Choir Witness', sex: 'female', archetype: 'witness' },
      { characterId: 'Debt Collector', sex: 'male', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'the-harvest-men',
    region: 'appalachian_valley',
    locale: 'en-US',
    cast: [
      { characterId: 'Visiting Agronomist', sex: 'female', archetype: 'investigator' },
      { characterId: 'Village Elder', sex: 'male', archetype: 'operator' },
      { characterId: 'Runaway Teen', sex: 'non_binary', archetype: 'witness' },
      { characterId: 'Masked Figure', sex: 'male', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'signal-from-kharon-9',
    region: 'high_desert_observatory',
    locale: 'en-US',
    cast: [
      { characterId: 'Systems Engineer', sex: 'female', archetype: 'operator' },
      { characterId: 'Astrophysicist', sex: 'male', archetype: 'investigator' },
      { characterId: 'Operator', sex: 'female', archetype: 'operator' },
      { characterId: 'Signal Entity', sex: 'unknown', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'the-fourth-tenant',
    region: 'mid_atlantic_flood_district',
    locale: 'en-US',
    cast: [
      { characterId: 'Building Superintendent', sex: 'male', archetype: 'operator' },
      { characterId: 'Lease Broker', sex: 'female', archetype: 'investigator' },
      { characterId: 'Night Tenant', sex: 'female', archetype: 'witness' },
      { characterId: 'Investigator', sex: 'male', archetype: 'investigator' }
    ]
  },
  {
    storyId: 'tape-17-pinewatch',
    region: 'pacific_northwest_wilderness',
    locale: 'en-US',
    cast: [
      { characterId: 'Ranger', sex: 'female', archetype: 'investigator' },
      { characterId: 'Media Forensics Analyst', sex: 'male', archetype: 'operator' },
      { characterId: 'Survivor', sex: 'female', archetype: 'witness' },
      { characterId: 'Unknown Cameraperson', sex: 'unknown', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'crown-of-salt',
    region: 'mediterranean_port',
    locale: 'en-GB',
    cast: [
      { characterId: 'Port Auditor', sex: 'male', archetype: 'investigator' },
      { characterId: 'Smuggler', sex: 'female', archetype: 'antagonist' },
      { characterId: 'Archivist Nun', sex: 'female', archetype: 'operator' },
      { characterId: 'Broker', sex: 'male', archetype: 'antagonist' }
    ]
  },
  {
    storyId: 'red-creek-winter',
    region: 'mountain_logging_town',
    locale: 'en-US',
    cast: [
      { characterId: 'Sheriff', sex: 'female', archetype: 'investigator' },
      { characterId: 'Deputy', sex: 'male', archetype: 'operator' },
      { characterId: 'Local Journalist', sex: 'female', archetype: 'witness' },
      { characterId: 'Survivor', sex: 'male', archetype: 'witness' }
    ]
  },
  {
    storyId: 'ward-1908',
    region: 'new_england_hilltop',
    locale: 'en-US',
    cast: [
      { characterId: 'Archivist', sex: 'male', archetype: 'investigator' },
      { characterId: 'Former Nurse', sex: 'female', archetype: 'operator' },
      { characterId: 'Contractor', sex: 'male', archetype: 'operator' },
      { characterId: 'Record Keeper', sex: 'female', archetype: 'witness' }
    ]
  },
  {
    storyId: 'dead-channel-protocol',
    region: 'smart_city_transit_grid',
    locale: 'en-US',
    cast: [
      { characterId: 'Security Engineer', sex: 'female', archetype: 'investigator' },
      { characterId: 'Streamer', sex: 'male', archetype: 'witness' },
      { characterId: 'Grid Operator', sex: 'female', archetype: 'operator' },
      { characterId: 'Unknown Bot Voice', sex: 'unknown', archetype: 'antagonist' }
    ]
  }
];

function resolvePiperModel(locale: string): string {
  if (locale === 'en-GB') {
    return 'en_GB-alba-medium';
  }

  return 'en_US-lessac-high';
}

function resolveOpenAiVoice(sex: VoiceSex, archetype: VoiceArchetype): string {
  if (sex === 'female' && archetype === 'witness') {
    return 'shimmer';
  }

  if (sex === 'female') {
    return 'nova';
  }

  if (sex === 'male') {
    return archetype === 'antagonist' ? 'onyx' : 'echo';
  }

  return 'alloy';
}

function resolvePollyVoice(locale: string, sex: VoiceSex): string {
  if (locale === 'en-GB') {
    return sex === 'female' ? 'Amy' : 'Brian';
  }

  if (sex === 'female') {
    return 'Joanna';
  }

  if (sex === 'male') {
    return 'Matthew';
  }

  return 'Joey';
}

function createProviderPreferences(input: {
  storyId: string;
  characterId: string;
  locale: string;
  sex: VoiceSex;
  archetype: VoiceArchetype;
}): VoiceProviderPreference[] {
  const baseSlug = slugify(`${input.storyId}-${input.characterId}`);
  const speaker = Number.parseInt(hashString(baseSlug).slice(0, 2), 16) % 12;

  return [
    {
      provider: 'piper',
      voiceId: `piper-${baseSlug}`,
      model: resolvePiperModel(input.locale),
      speaker
    },
    {
      provider: 'elevenlabs',
      voiceId: `elv-${baseSlug}`,
      model: 'eleven_multilingual_v2'
    },
    {
      provider: 'openai',
      voiceId: resolveOpenAiVoice(input.sex, input.archetype),
      model: 'gpt-4o-mini-tts'
    },
    {
      provider: 'polly',
      voiceId: resolvePollyVoice(input.locale, input.sex),
      model: 'neural'
    }
  ];
}

function createProfile(story: StoryCastingSeed, character: CharacterCastingSeed): CharacterVoiceProfile {
  const preset = ARCHETYPE_PRESETS[character.archetype];

  return {
    id: `voice.${story.storyId}.${slugify(character.characterId)}`,
    storyId: story.storyId,
    characterId: character.characterId,
    displayName: character.characterId,
    region: story.region,
    locale: story.locale,
    sex: character.sex,
    archetype: character.archetype,
    cadence: preset.cadence,
    vocabularyTone: preset.vocabularyTone,
    emotionalRange: preset.emotionalRange,
    defaultEmotion: preset.defaultEmotion,
    variation: { ...preset.variation },
    expressions: { ...preset.expressions },
    providerPreferences: createProviderPreferences({
      storyId: story.storyId,
      characterId: character.characterId,
      locale: story.locale,
      sex: character.sex,
      archetype: character.archetype
    })
  };
}

export const launchVoiceProfiles: CharacterVoiceProfile[] = launchStoryCastingSeeds.flatMap((story) => {
  return story.cast.map((character) => createProfile(story, character));
});

export class InMemoryVoiceProfileRegistry implements VoiceProfileRegistry {
  private readonly byProfileId = new Map<string, CharacterVoiceProfile>();
  private readonly byStoryCharacter = new Map<string, CharacterVoiceProfile>();
  private readonly byCharacter = new Map<string, CharacterVoiceProfile>();

  constructor(private readonly profiles: CharacterVoiceProfile[]) {
    for (const profile of profiles) {
      this.byProfileId.set(profile.id, profile);
      this.byStoryCharacter.set(this.storyCharacterKey(profile.storyId, profile.characterId), profile);
      if (!this.byCharacter.has(profile.characterId)) {
        this.byCharacter.set(profile.characterId, profile);
      }
    }
  }

  list(): CharacterVoiceProfile[] {
    return [...this.profiles];
  }

  getByProfileId(profileId: string): CharacterVoiceProfile | undefined {
    return this.byProfileId.get(profileId);
  }

  getByStoryCharacter(storyId: string, characterId: string): CharacterVoiceProfile | undefined {
    return this.byStoryCharacter.get(this.storyCharacterKey(storyId, characterId));
  }

  getDefaultByCharacter(characterId: string): CharacterVoiceProfile | undefined {
    return this.byCharacter.get(characterId);
  }

  private storyCharacterKey(storyId: string, characterId: string): string {
    return `${storyId}::${characterId}`;
  }
}

export function createLaunchVoiceProfileRegistry(): InMemoryVoiceProfileRegistry {
  return new InMemoryVoiceProfileRegistry(launchVoiceProfiles);
}

export function validateUniqueVoiceAssignments(profiles: CharacterVoiceProfile[]): {
  duplicateProfileIds: string[];
  duplicateStoryCharacterKeys: string[];
  duplicatePrimaryVoiceKeys: string[];
} {
  const profileCounts = new Map<string, number>();
  const storyCharacterCounts = new Map<string, number>();
  const primaryVoiceCounts = new Map<string, number>();

  for (const profile of profiles) {
    profileCounts.set(profile.id, (profileCounts.get(profile.id) ?? 0) + 1);

    const storyCharacterKey = `${profile.storyId}::${profile.characterId}`;
    storyCharacterCounts.set(storyCharacterKey, (storyCharacterCounts.get(storyCharacterKey) ?? 0) + 1);

    const primaryPreference = profile.providerPreferences[0];
    if (primaryPreference) {
      const primaryVoiceKey = `${primaryPreference.provider}::${primaryPreference.voiceId}`;
      primaryVoiceCounts.set(primaryVoiceKey, (primaryVoiceCounts.get(primaryVoiceKey) ?? 0) + 1);
    }
  }

  return {
    duplicateProfileIds: [...profileCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
    duplicateStoryCharacterKeys: [...storyCharacterCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
    duplicatePrimaryVoiceKeys: [...primaryVoiceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  };
}
