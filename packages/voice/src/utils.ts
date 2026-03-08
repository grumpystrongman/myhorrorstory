import { createHash } from 'node:crypto';
import type {
  CharacterVoiceProfile,
  LegacyVoiceStyle,
  StoryEventType,
  VoiceEmotion,
  VoiceExpression,
  VoiceRequest
} from './types.js';

const LEGACY_STYLE_TO_EMOTION: Record<LegacyVoiceStyle, VoiceEmotion> = {
  calm: 'calm',
  urgent: 'urgent',
  ominous: 'ominous'
};

const EVENT_TO_EMOTION: Record<StoryEventType, VoiceEmotion> = {
  chapter_intro: 'calm',
  chapter_event: 'tense',
  clue_reveal: 'tense',
  voicemail: 'ominous',
  chat: 'neutral',
  final_reveal: 'ominous',
  debrief: 'relief',
  ambient: 'calm'
};

export const DEFAULT_EXPRESSION: VoiceExpression = {
  rate: 1,
  pitch: 0,
  stability: 0.82,
  style: 0.45,
  gainDb: 0
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function seededUnitInterval(seed: string): number {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 8);
  const value = Number.parseInt(hex, 16);
  return value / 0xffffffff;
}

export function resolveEmotion(request: VoiceRequest, profile: CharacterVoiceProfile): VoiceEmotion {
  if (request.emotion) {
    return request.emotion;
  }

  if (request.style) {
    return LEGACY_STYLE_TO_EMOTION[request.style];
  }

  const eventType = request.context?.eventType;
  if (eventType) {
    const mappedEmotion = EVENT_TO_EMOTION[eventType];
    if (mappedEmotion === 'tense') {
      const tension = clamp(request.context?.tension ?? 0.5, 0, 1);
      return tension > 0.75 ? 'urgent' : 'tense';
    }

    return mappedEmotion;
  }

  const urgency = clamp(request.context?.urgency ?? 0.5, 0, 1);
  if (urgency >= 0.75) {
    return 'urgent';
  }

  return profile.defaultEmotion;
}

export function resolveExpression(
  profile: CharacterVoiceProfile,
  emotion: VoiceEmotion,
  request: VoiceRequest
): VoiceExpression {
  const baseExpression =
    profile.expressions[emotion] ??
    profile.expressions[profile.defaultEmotion] ??
    profile.expressions.neutral ??
    DEFAULT_EXPRESSION;

  const tension = clamp(request.context?.tension ?? 0.5, 0, 1);
  const urgency = clamp(request.context?.urgency ?? 0.5, 0, 1);

  const seedRoot = `${profile.id}|${emotion}|${hashString(request.text)}|${request.context?.seed ?? ''}|${request.context?.beatId ?? ''}`;
  const rateDelta = (seededUnitInterval(`${seedRoot}|rate`) * 2 - 1) * profile.variation.rateJitter;
  const pitchDelta = (seededUnitInterval(`${seedRoot}|pitch`) * 2 - 1) * profile.variation.pitchJitter;
  const styleDelta = (seededUnitInterval(`${seedRoot}|style`) * 2 - 1) * profile.variation.styleJitter;

  return {
    rate: clamp(baseExpression.rate + rateDelta + (urgency - 0.5) * 0.18, 0.65, 1.45),
    pitch: clamp(baseExpression.pitch + pitchDelta + (tension - 0.5) * 1.1, -6, 6),
    stability: clamp(baseExpression.stability - (urgency - 0.5) * 0.18, 0.2, 1),
    style: clamp(baseExpression.style + styleDelta + (tension - 0.5) * 0.25, 0, 1),
    gainDb: clamp(baseExpression.gainDb + (urgency - 0.5) * 2.2, -12, 6)
  };
}

export function buildVoiceCacheKey(input: {
  profileId: string;
  storyId?: string;
  characterId: string;
  provider: string;
  voiceId: string;
  model?: string;
  format: string;
  emotion: VoiceEmotion;
  expression: VoiceExpression;
  text: string;
  region: string;
  sex: string;
  context?: VoiceRequest['context'];
}): string {
  const payload = {
    profileId: input.profileId,
    storyId: input.storyId,
    characterId: input.characterId,
    provider: input.provider,
    voiceId: input.voiceId,
    model: input.model,
    format: input.format,
    emotion: input.emotion,
    expression: input.expression,
    textHash: hashString(input.text),
    region: input.region,
    sex: input.sex,
    chapterId: input.context?.chapterId,
    beatId: input.context?.beatId,
    eventType: input.context?.eventType,
    tension: input.context?.tension,
    urgency: input.context?.urgency,
    seed: input.context?.seed
  };

  return hashString(JSON.stringify(payload));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

