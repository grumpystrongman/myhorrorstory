import { z } from 'zod';

export const roleSchema = z.enum([
  'PLAYER',
  'HOST',
  'MODERATOR',
  'CONTENT_EDITOR',
  'SUPPORT_AGENT',
  'MARKETING_MANAGER',
  'ANALYST',
  'ADMIN',
  'SUPER_ADMIN'
]);

export const planTierSchema = z.enum(['FREE', 'TRIAL', 'STANDARD', 'PREMIUM', 'LIFETIME']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2).max(80),
  roles: z.array(roleSchema).min(1),
  tier: planTierSchema,
  acceptedTermsAt: z.string().datetime().nullable(),
  acceptedPrivacyAt: z.string().datetime().nullable(),
  ageGateConfirmedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  displayName: z.string().min(2).max(80),
  marketingConsent: z.boolean().default(false),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  ageGateConfirmed: z.literal(true)
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128)
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(16),
  refreshToken: z.string().min(16),
  expiresInSeconds: z.number().int().positive()
});

export const storyToneSchema = z.enum(['CINEMATIC', 'EERIE', 'GROUNDED', 'INTENSE', 'SLOW_BURN']);

export const storyBranchConditionSchema = z.object({
  type: z.enum(['FLAG', 'SCORE_AT_LEAST', 'HAS_CLUE', 'CHOICE_EQUALS']),
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()])
});

export const storyChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  effects: z.record(z.union([z.string(), z.number(), z.boolean()])),
  nextBeatId: z.string().min(1)
});

export const storyBeatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  narrative: z.string().min(1),
  unlockAfterSeconds: z.number().int().nonnegative().default(0),
  requiredConditions: z.array(storyBranchConditionSchema).default([]),
  choices: z.array(storyChoiceSchema).default([]),
  revealsClueIds: z.array(z.string().min(1)).default([])
});

export const storyActSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  beats: z.array(storyBeatSchema).min(1)
});

export const storyPackageSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^v\d+$/),
  title: z.string().min(1),
  hook: z.string().min(1),
  subgenre: z.string().min(1),
  tone: storyToneSchema,
  targetSessionMinutes: z.number().int().positive(),
  soloSuitability: z.number().int().min(1).max(5),
  partySuitability: z.number().int().min(1).max(5),
  ageWarnings: z.array(z.string()).min(1),
  characters: z.array(z.string()).min(1),
  location: z.string().min(1),
  acts: z.array(storyActSchema).min(1),
  replayHooks: z.array(z.string()).min(1),
  sequelHooks: z.array(z.string()).min(1)
});

export const voiceSexSchema = z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNKNOWN']);

export const voiceEmotionSchema = z.enum([
  'NEUTRAL',
  'CALM',
  'TENSE',
  'URGENT',
  'FEAR',
  'GRIEF',
  'ANGER',
  'OMINOUS',
  'RELIEF'
]);

export const voiceProviderSchema = z.enum([
  'PIPER',
  'ELEVENLABS',
  'OPENAI',
  'POLLY',
  'DETERMINISTIC'
]);

export const voiceExpressionSchema = z.object({
  rate: z.number().min(0.5).max(1.6),
  pitch: z.number().min(-8).max(8),
  stability: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  gainDb: z.number().min(-18).max(12)
});

export const voiceProviderPreferenceSchema = z.object({
  provider: voiceProviderSchema,
  voiceId: z.string().min(1),
  model: z.string().min(1).optional(),
  speaker: z.number().int().nonnegative().optional()
});

export const characterVoiceProfileSchema = z.object({
  id: z.string().min(1),
  storyId: z.string().min(1),
  characterId: z.string().min(1),
  displayName: z.string().min(1),
  region: z.string().min(1),
  locale: z.string().min(2),
  sex: voiceSexSchema,
  archetype: z.enum(['INVESTIGATOR', 'OPERATOR', 'WITNESS', 'ANTAGONIST', 'NARRATOR']),
  cadence: z.string().min(1),
  vocabularyTone: z.string().min(1),
  emotionalRange: z.string().min(1),
  defaultEmotion: voiceEmotionSchema,
  expressions: z.record(z.string(), voiceExpressionSchema),
  variation: z.object({
    rateJitter: z.number().min(0).max(0.4),
    pitchJitter: z.number().min(0).max(3),
    styleJitter: z.number().min(0).max(0.5)
  }),
  providerPreferences: z.array(voiceProviderPreferenceSchema).min(1)
});

export const storyVoiceCastingSchema = z
  .object({
    storyId: z.string().min(1),
    revision: z.number().int().positive().default(1),
    generatedAt: z.string().datetime(),
    characters: z.array(characterVoiceProfileSchema).min(1)
  })
  .superRefine((value, ctx) => {
    const characterIds = new Set<string>();
    const primaryVoices = new Set<string>();

    value.characters.forEach((character, index) => {
      if (character.storyId !== value.storyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `character.storyId must match manifest storyId (${value.storyId})`,
          path: ['characters', index, 'storyId']
        });
      }

      if (characterIds.has(character.characterId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate characterId in voice casting: ${character.characterId}`,
          path: ['characters', index, 'characterId']
        });
      }
      characterIds.add(character.characterId);

      const primary = character.providerPreferences[0];
      if (primary) {
        const key = `${primary.provider}:${primary.voiceId}`;
        if (primaryVoices.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate primary provider voice assignment: ${key}`,
            path: ['characters', index, 'providerPreferences', 0, 'voiceId']
          });
        }
        primaryVoices.add(key);
      }
    });
  });

export const createPartySchema = z.object({
  storyId: z.string().min(1),
  mode: z.enum(['SOLO', 'PARTY']),
  hostless: z.boolean().default(false)
});

export const inviteSchema = z.object({
  partyId: z.string().uuid(),
  inviteCode: z.string().min(6).max(12),
  maxUses: z.number().int().positive().default(8),
  expiresAt: z.string().datetime()
});

export const websocketEventSchema = z.object({
  type: z.enum([
    'session.joined',
    'chapter.revealed',
    'clue.unlocked',
    'vote.submitted',
    'host.command',
    'gm.narration'
  ]),
  partyId: z.string().uuid(),
  payload: z.record(z.unknown()),
  sentAt: z.string().datetime()
});

export type Role = z.infer<typeof roleSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type User = z.infer<typeof userSchema>;
export type StoryPackage = z.infer<typeof storyPackageSchema>;
export type StoryBeat = z.infer<typeof storyBeatSchema>;
export type StoryAct = z.infer<typeof storyActSchema>;
export type CharacterVoiceProfile = z.infer<typeof characterVoiceProfileSchema>;
export type StoryVoiceCasting = z.infer<typeof storyVoiceCastingSchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type WebsocketEvent = z.infer<typeof websocketEventSchema>;
