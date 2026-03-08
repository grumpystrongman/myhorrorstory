export type VoiceFormat = 'mp3' | 'wav' | 'ogg';

export type LegacyVoiceStyle = 'calm' | 'urgent' | 'ominous';

export type VoiceEmotion =
  | 'neutral'
  | 'calm'
  | 'tense'
  | 'urgent'
  | 'fear'
  | 'grief'
  | 'anger'
  | 'ominous'
  | 'relief';

export type VoiceSex = 'female' | 'male' | 'non_binary' | 'unknown';

export type StoryEventType =
  | 'chapter_intro'
  | 'chapter_event'
  | 'clue_reveal'
  | 'voicemail'
  | 'chat'
  | 'final_reveal'
  | 'debrief'
  | 'ambient';

export type VoiceArchetype = 'investigator' | 'operator' | 'witness' | 'antagonist' | 'narrator';

export type VoiceProviderName =
  | 'piper'
  | 'elevenlabs'
  | 'openai'
  | 'polly'
  | 'deterministic'
  | (string & {});

export interface VoiceNarrativeContext {
  storyId?: string;
  chapterId?: string;
  beatId?: string;
  eventType?: StoryEventType;
  tension?: number;
  urgency?: number;
  seed?: string;
}

export interface VoiceExpression {
  rate: number;
  pitch: number;
  stability: number;
  style: number;
  gainDb: number;
}

export interface VoiceVariation {
  rateJitter: number;
  pitchJitter: number;
  styleJitter: number;
}

export interface VoiceProviderPreference {
  provider: VoiceProviderName;
  voiceId: string;
  model?: string;
  speaker?: number;
}

export interface CharacterVoiceProfile {
  id: string;
  storyId: string;
  characterId: string;
  displayName: string;
  region: string;
  locale: string;
  sex: VoiceSex;
  archetype: VoiceArchetype;
  cadence: string;
  vocabularyTone: string;
  emotionalRange: string;
  defaultEmotion: VoiceEmotion;
  expressions: Partial<Record<VoiceEmotion, VoiceExpression>>;
  variation: VoiceVariation;
  providerPreferences: VoiceProviderPreference[];
}

export interface VoiceRequest {
  storyId?: string;
  characterId: string;
  text: string;
  format: VoiceFormat;
  style?: LegacyVoiceStyle;
  emotion?: VoiceEmotion;
  context?: VoiceNarrativeContext;
  profileId?: string;
  profile?: CharacterVoiceProfile;
}

export interface VoiceResult {
  cacheKey: string;
  bytes: Uint8Array;
  provider: VoiceProviderName;
  voiceId: string;
  format: VoiceFormat;
  profileId: string;
  characterId: string;
  emotion: VoiceEmotion;
  region: string;
  sex: VoiceSex;
  metadata?: Record<string, boolean | number | string>;
}

export interface ProviderVoiceRequest {
  cacheKey: string;
  text: string;
  format: VoiceFormat;
  emotion: VoiceEmotion;
  context: VoiceNarrativeContext;
  expression: VoiceExpression;
  profile: CharacterVoiceProfile;
  providerPreference: VoiceProviderPreference;
}

export interface ProviderVoiceResult {
  bytes: Uint8Array;
  provider: VoiceProviderName;
  voiceId: string;
  format: VoiceFormat;
  metadata?: Record<string, boolean | number | string>;
}

export interface VoiceProvider {
  readonly id: VoiceProviderName;
  synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult>;
}

export interface VoiceProfileRegistry {
  list(): CharacterVoiceProfile[];
  getByProfileId(profileId: string): CharacterVoiceProfile | undefined;
  getByStoryCharacter(storyId: string, characterId: string): CharacterVoiceProfile | undefined;
  getDefaultByCharacter(characterId: string): CharacterVoiceProfile | undefined;
}
