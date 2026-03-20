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
  ageGateConfirmed: z.literal(true),
  termsVersion: z.string().min(1).default('2026-03-09'),
  privacyVersion: z.string().min(1).default('2026-03-09')
});

export const legalAcceptanceSchema = z.object({
  userId: z.string().uuid(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  ageGateConfirmed: z.literal(true),
  termsVersion: z.string().min(1).default('2026-03-09'),
  privacyVersion: z.string().min(1).default('2026-03-09')
});

export const legalAcceptanceStatusSchema = z.object({
  acceptedTermsAt: z.string().datetime(),
  acceptedPrivacyAt: z.string().datetime(),
  ageGateConfirmedAt: z.string().datetime(),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1)
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128)
});

export const growthLeadCaptureRequestSchema = z.object({
  email: z.string().email(),
  source: z.string().min(1),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  marketingConsent: z.boolean().default(true),
  tags: z.array(z.string().min(1)).default([]),
  country: z.string().min(2).max(2).optional(),
  locale: z.string().min(2).max(10).optional()
});

export const growthLeadCaptureResponseSchema = z.object({
  accepted: z.boolean(),
  segment: z.string().min(1),
  lifecycleEmailQueued: z.boolean(),
  leadId: z.string().min(1)
});

export const lifecycleEventTypeSchema = z.enum([
  'welcome',
  'abandoned_signup',
  'abandoned_case',
  'win_back',
  'upsell',
  'referral_invite',
  'launch_announcement'
]);

export const growthLifecycleEventRequestSchema = z.object({
  email: z.string().email(),
  eventType: lifecycleEventTypeSchema,
  storyId: z.string().min(1).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const growthLifecycleEventResponseSchema = z.object({
  accepted: z.boolean(),
  eventType: lifecycleEventTypeSchema,
  campaignId: z.string().min(1),
  emailQueued: z.boolean()
});

export const growthLeadRecordSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  source: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  marketingConsent: z.boolean(),
  tags: z.array(z.string().min(1)),
  locale: z.string().nullable(),
  country: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLifecycleEvent: lifecycleEventTypeSchema.nullable()
});

export const growthCampaignSummarySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  triggerEvent: lifecycleEventTypeSchema,
  segment: z.string().min(1),
  sendDelayMinutes: z.number().int().min(0)
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(16),
  refreshToken: z.string().min(16),
  expiresInSeconds: z.number().int().positive()
});

export const storyToneSchema = z.enum(['CINEMATIC', 'EERIE', 'GROUNDED', 'INTENSE', 'SLOW_BURN']);

export const deliveryChannelSchema = z.enum([
  'SMS',
  'WHATSAPP',
  'TELEGRAM',
  'SIGNAL',
  'EMAIL',
  'PHONE_CALL',
  'WEB',
  'WEB_PORTAL',
  'VOICE_MESSAGE',
  'NEWS_BROADCAST',
  'SIMULATED_SITE',
  'IMAGE_DROP',
  'DOCUMENT_DROP'
]);

export const playerIntentSchema = z.enum([
  'FEAR',
  'DEFIANCE',
  'BARGAIN',
  'CURIOSITY',
  'DECEPTION',
  'COMPLIANCE',
  'SILENCE',
  'ACCUSATION',
  'QUESTION',
  'THREAT'
]);

export const communicationToneSchema = z.enum([
  'NEUTRAL',
  'EMPATHETIC',
  'SKEPTICAL',
  'HOSTILE',
  'DETACHED',
  'PANICKED'
]);

export const narrativeSceneTypeSchema = z.enum([
  'CRIME_SCENE',
  'SURVEILLANCE_REVIEW',
  'WITNESS_INTERVIEW',
  'RITUAL_SITE',
  'HIDEOUT_BREACH',
  'NIGHT_PATROL',
  'FORBIDDEN_ARCHIVE',
  'EMERGENCY_ALERT',
  'VILLAIN_CONTACT'
]);

export const narrativeMediaTypeSchema = z.enum([
  'CINEMATIC_AI_VIDEO_CLIP',
  'SURVEILLANCE_FOOTAGE',
  'SECURITY_CAMERA_RECORDING',
  'BODY_CAMERA_VIDEO',
  'PHONE_CAMERA_RECORDING',
  'NARRATED_SEGMENT',
  'CHARACTER_VOICE_MESSAGE',
  'ENVIRONMENTAL_AMBIENCE_AUDIO',
  'EERIE_MUSIC_SCORE',
  'AI_GENERATED_PHOTOGRAPH',
  'NEWSPAPER_ARTICLE',
  'POLICE_REPORT',
  'WITNESS_INTERVIEW',
  'HANDWRITTEN_NOTE',
  'JOURNAL_ENTRY',
  'ENCRYPTED_FILE',
  'CHAT_LOG',
  'CORRUPTED_FILE',
  'GPS_COORDINATE_DROP',
  'INTERACTIVE_MAP',
  'SIMULATED_WEBSITE',
  'LIVESTREAM_FRAGMENT',
  'VOICEMAIL_RECORDING',
  'EMERGENCY_BROADCAST'
]);

export const reputationAxisSchema = z.enum([
  'trustworthiness',
  'aggression',
  'curiosity',
  'deception',
  'morality'
]);

export const reputationVectorSchema = z.object({
  trustworthiness: z.number().int().min(-100).max(100),
  aggression: z.number().int().min(-100).max(100),
  curiosity: z.number().int().min(-100).max(100),
  deception: z.number().int().min(-100).max(100),
  morality: z.number().int().min(-100).max(100)
});

export const reputationPolicySchema = z.object({
  startingScores: reputationVectorSchema,
  decayPerDay: z.number().int().min(0).max(25).default(0),
  axisGuidance: z.array(
    z.object({
      axis: reputationAxisSchema,
      positiveBehavior: z.string().min(1),
      negativeBehavior: z.string().min(1)
    })
  )
});

export const triggerSourceSchema = z.enum([
  'FLAG',
  'PLAYER_REPUTATION',
  'NPC_TRUST',
  'NPC_EMOTION',
  'HAS_CLUE',
  'EVENT_OCCURRED',
  'INVESTIGATION_PROGRESS',
  'VILLAIN_STAGE',
  'PLAYER_LAST_INTENT',
  'SILENCE_SECONDS',
  'ELAPSED_SECONDS',
  'ALLIANCE_WITH_NPC',
  'ENDING_STATUS'
]);

export const triggerOperatorSchema = z.enum([
  'EQ',
  'NEQ',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'INCLUDES',
  'NOT_INCLUDES'
]);

export const triggerPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

export const triggerPredicateSchema = z.object({
  source: triggerSourceSchema,
  key: z.string().min(1),
  operator: triggerOperatorSchema,
  value: triggerPrimitiveSchema
});

export type TriggerCondition =
  | {
      kind: 'predicate';
      predicate: z.infer<typeof triggerPredicateSchema>;
    }
  | {
      kind: 'all';
      conditions: TriggerCondition[];
    }
  | {
      kind: 'any';
      conditions: TriggerCondition[];
    }
  | {
      kind: 'not';
      condition: TriggerCondition;
    };

export const triggerConditionSchema: z.ZodType<TriggerCondition> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('predicate'),
      predicate: triggerPredicateSchema
    }),
    z.object({
      kind: z.literal('all'),
      conditions: z.array(triggerConditionSchema).min(1)
    }),
    z.object({
      kind: z.literal('any'),
      conditions: z.array(triggerConditionSchema).min(1)
    }),
    z.object({
      kind: z.literal('not'),
      condition: triggerConditionSchema
    })
  ])
);

export const triggerEventTypeSchema = z.enum([
  'SYSTEM_TICK',
  'PLAYER_MESSAGE',
  'PLAYER_ACCUSATION',
  'PLAYER_DELAY',
  'CLUE_DISCOVERED',
  'NPC_TRUST_CHANGED',
  'INVESTIGATION_PROGRESS',
  'COUNTDOWN_EXPIRED',
  'STORY_BRANCH_SELECTED'
]);

export const villainMessageTypeSchema = z.enum([
  'CRYPTIC_CLUE',
  'TAUNT',
  'THREAT',
  'RIDDLE',
  'FALSE_REASSURANCE',
  'PARTIAL_CONFESSION',
  'MORAL_TEST',
  'PERSONAL_OBSERVATION',
  'COUNTDOWN',
  'MEDIA_DROP',
  'MANIPULATIVE_INSTRUCTION'
]);

export const triggerActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SEND_MESSAGE'),
    channel: deliveryChannelSchema,
    templateId: z.string().min(1),
    delaySeconds: z.number().int().min(0).default(0)
  }),
  z.object({
    type: z.literal('UPDATE_REPUTATION'),
    axis: reputationAxisSchema,
    delta: z.number().int().min(-50).max(50)
  }),
  z.object({
    type: z.literal('UPDATE_NPC_TRUST'),
    npcId: z.string().min(1),
    delta: z.number().int().min(-50).max(50)
  }),
  z.object({
    type: z.literal('SET_FLAG'),
    key: z.string().min(1),
    value: triggerPrimitiveSchema
  }),
  z.object({
    type: z.literal('REVEAL_CLUE'),
    clueId: z.string().min(1)
  }),
  z.object({
    type: z.literal('EMIT_EVENT'),
    eventId: z.string().min(1)
  }),
  z.object({
    type: z.literal('START_COUNTDOWN'),
    countdownId: z.string().min(1),
    durationSeconds: z.number().int().positive(),
    failureEventId: z.string().min(1)
  }),
  z.object({
    type: z.literal('ADVANCE_VILLAIN_STAGE'),
    stage: z.number().int().min(1).max(4)
  }),
  z.object({
    type: z.literal('LOCK_ENDING'),
    endingId: z.string().min(1)
  }),
  z.object({
    type: z.literal('UNLOCK_ENDING'),
    endingId: z.string().min(1)
  })
]);

export const storyTriggerRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  eventType: triggerEventTypeSchema,
  when: triggerConditionSchema,
  actions: z.array(triggerActionSchema).min(1),
  priority: z.number().int().min(1).max(100).default(50),
  cooldownSeconds: z.number().int().min(0).default(0),
  maxActivations: z.number().int().positive().default(1)
});

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

export const npcEmotionStateSchema = z.enum([
  'CALM',
  'ANXIOUS',
  'SUSPICIOUS',
  'HOSTILE',
  'GRIEVING',
  'DEFIANT',
  'RELIEVED',
  'BROKEN'
]);

export const npcRoleSchema = z.enum([
  'ALLY',
  'WITNESS',
  'SUSPECT',
  'RIVAL',
  'HANDLER',
  'VICTIM_CONTACT',
  'EXPERT'
]);

export const npcSecretSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  trustThreshold: z.number().int().min(0).max(100),
  revealCondition: triggerConditionSchema,
  consequenceOnReveal: z.string().min(1)
});

export const npcProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: npcRoleSchema,
  personalityTraits: z.array(z.string().min(1)).min(2),
  baselineEmotion: npcEmotionStateSchema,
  motivations: z.array(z.string().min(1)).min(1),
  trustBaseline: z.number().int().min(0).max(100),
  trustCeiling: z.number().int().min(1).max(100),
  secrets: z.array(npcSecretSchema).min(1),
  responseStyle: z.object({
    accusation: z.string().min(1),
    threat: z.string().min(1),
    questioning: z.string().min(1)
  })
});

export const villainArchetypeSchema = z.enum([
  'CALM_GENIUS_MANIPULATOR',
  'THEATRICAL_MONSTER',
  'INTIMATE_WHISPERER',
  'RIGHTEOUS_ZEALOT',
  'GRIEVING_AVENGER',
  'SEDUCTIVE_CORRUPTER',
  'PLAYFUL_SOCIOPATH'
]);

export const villainEscalationStageSchema = z.object({
  stage: z.number().int().min(1).max(4),
  label: z.string().min(1),
  objective: z.string().min(1),
  entryCondition: triggerConditionSchema,
  allowedMessageTypes: z.array(villainMessageTypeSchema).min(1),
  timing: z.object({
    minIntervalMinutes: z.number().int().positive(),
    maxTouchesPerDay: z.number().int().positive(),
    allowLateNight: z.boolean()
  })
});

export const villainProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  archetype: villainArchetypeSchema,
  worldview: z.string().min(1),
  motive: z.string().min(1),
  signatureSpeechStyle: z.string().min(1),
  emotionalVolatility: z.number().min(0).max(1),
  obsessionTarget: z.string().min(1),
  triggerConditions: z.array(z.string().min(1)).min(1),
  manipulationTactics: z.array(z.string().min(1)).min(2),
  riskTolerance: z.number().min(0).max(1),
  humorOrCruelty: z.string().min(1),
  symbolicMotifs: z.array(z.string().min(1)).min(1),
  escalationStages: z.array(villainEscalationStageSchema).length(4)
});

export const villainMessageTemplateSchema = z.object({
  id: z.string().min(1),
  stage: z.number().int().min(1).max(4),
  type: villainMessageTypeSchema,
  channels: z.array(deliveryChannelSchema).min(1),
  textTemplate: z.string().min(1),
  personalizationKeys: z.array(z.string().min(1)).default([]),
  branchEffects: z.array(z.string().min(1)).default([])
});

export const investigationNodeTypeSchema = z.enum(['SUSPECT', 'LOCATION', 'EVIDENCE', 'TIMELINE']);

export const investigationNodeSchema = z.object({
  id: z.string().min(1),
  type: investigationNodeTypeSchema,
  label: z.string().min(1),
  summary: z.string().min(1)
});

export const investigationLinkSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  relation: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const investigationTimelineEventSchema = z.object({
  id: z.string().min(1),
  timeLabel: z.string().min(1),
  summary: z.string().min(1),
  relatedNodeIds: z.array(z.string().min(1)).min(1)
});

export const investigationBoardSchema = z.object({
  nodes: z.array(investigationNodeSchema).min(4),
  links: z.array(investigationLinkSchema).min(3),
  timeline: z.array(investigationTimelineEventSchema).min(3)
});

export const communityPuzzleShardSchema = z.object({
  id: z.string().min(1),
  heldBy: z.enum(['HOST', 'ALLY_A', 'ALLY_B', 'GLOBAL_BROADCAST']),
  content: z.string().min(1)
});

export const communityPuzzleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  shards: z.array(communityPuzzleShardSchema).min(2),
  solvedByRuleId: z.string().min(1),
  rewardClueId: z.string().min(1),
  failureConsequence: z.string().min(1)
});

export const storyArcStageSchema = z.enum(['OPENING', 'MIDDLE', 'LATE_GAME', 'ENDGAME']);

export const storyArcSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  stage: storyArcStageSchema,
  summary: z.string().min(1),
  entryCondition: triggerConditionSchema,
  completionCondition: triggerConditionSchema,
  primaryRuleIds: z.array(z.string().min(1)).min(1)
});

export const storyEndingTypeSchema = z.enum([
  'JUSTICE',
  'PYRRHIC',
  'TRAGIC',
  'CORRUPTION',
  'UNRESOLVED',
  'SECRET'
]);

export const storyEndingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: storyEndingTypeSchema,
  summary: z.string().min(1),
  requiredCondition: triggerConditionSchema,
  blockedCondition: triggerConditionSchema.optional(),
  epilogue: z.string().min(1),
  sequelHook: z.string().min(1)
});

export const channelCadenceSchema = z.object({
  primaryChannels: z.array(deliveryChannelSchema).min(1),
  auxiliaryChannels: z.array(deliveryChannelSchema).min(1),
  lateNightMessagingDefault: z.boolean(),
  maxVillainTouchesPerDay: z.number().int().positive(),
  suspenseSilenceWindowMinutes: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  })
});

export const safetyProfileSchema = z.object({
  intensityLevel: z.number().int().min(1).max(5),
  threatTone: z.enum(['LOW', 'MODERATE', 'HIGH']),
  realismLevel: z.enum(['STYLIZED', 'IMMERSIVE', 'INTENSE']),
  allowLateNightMessaging: z.boolean(),
  supportsOptDown: z.boolean(),
  contentWarnings: z.array(z.string().min(1)).min(1)
});

export const seasonContinuitySchema = z.object({
  seasonId: z.string().min(1),
  returningCharacterIds: z.array(z.string().min(1)).min(1),
  persistedReputationAxes: z.array(reputationAxisSchema).min(1),
  carryForwardFlags: z.array(z.string().min(1)).min(1),
  continuityNotes: z.string().min(1)
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
  sequelHooks: z.array(z.string()).min(1),
  branchingMoments: z.array(z.string().min(1)).min(2),
  clueEvidenceList: z.array(z.string().min(1)).min(4),
  revealVariants: z.array(z.string().min(1)).min(2),
  upsellHooks: z.array(z.string().min(1)).min(1),
  playerReputationModel: reputationPolicySchema,
  channelCadence: channelCadenceSchema,
  npcProfiles: z.array(npcProfileSchema).min(3),
  villain: villainProfileSchema,
  villainMessageTemplates: z.array(villainMessageTemplateSchema).min(6),
  arcMap: z.array(storyArcSchema).min(3),
  triggerRules: z.array(storyTriggerRuleSchema).min(6),
  endingVariants: z.array(storyEndingSchema).min(3),
  communityPuzzles: z.array(communityPuzzleSchema).min(1),
  investigationBoard: investigationBoardSchema,
  seasonContinuity: seasonContinuitySchema,
  safetyProfile: safetyProfileSchema
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
    'gm.narration',
    'message.received',
    'villain.contacted',
    'npc.updated',
    'event.triggered',
    'ending.changed'
  ]),
  partyId: z.string().uuid(),
  payload: z.record(z.unknown()),
  sentAt: z.string().datetime()
});

export const inboundPlayerMessageSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  channel: deliveryChannelSchema,
  message: z.string().min(1),
  inferredIntent: playerIntentSchema.optional(),
  sentAt: z.string().datetime()
});

export const processInboundMessageRequestSchema = z.object({
  event: inboundPlayerMessageSchema,
  runtimeFlags: z.record(triggerPrimitiveSchema).default({})
});

export const processInboundMessageResponseSchema = z.object({
  accepted: z.boolean(),
  recognizedIntent: playerIntentSchema,
  appliedRuleIds: z.array(z.string().min(1)),
  generatedEvents: z.array(z.string().min(1)),
  outgoingMessageCount: z.number().int().nonnegative()
});

export const narrativePlayerBehaviorSnapshotSchema = z.object({
  cluesDiscovered: z.array(z.string().min(1)).default([]),
  suspectsAccused: z.array(z.string().min(1)).default([]),
  alliances: z.array(z.string().min(1)).default([]),
  communicationTone: communicationToneSchema.default('NEUTRAL'),
  moralDecisionTrend: z.number().int().min(-100).max(100).default(0),
  responseDelaySeconds: z.number().int().min(0).default(0),
  investigativeSkill: z.number().int().min(0).max(100).default(50),
  curiosity: z.number().int().min(0).max(100).default(50),
  riskTaking: z.number().int().min(0).max(100).default(50)
});

export const narrativeRuntimeSnapshotSchema = z.object({
  villainStage: z.number().int().min(1).max(4),
  investigationProgress: z.number().min(0).max(100),
  reputation: reputationVectorSchema,
  npcTrust: z.record(z.number().int().min(0).max(100)).default({}),
  unresolvedClues: z.array(z.string().min(1)).default([]),
  flags: z.record(triggerPrimitiveSchema).default({})
});

export const narrativeSafetyPreferenceSchema = z.object({
  intensityLevel: z.number().int().min(1).max(5).default(3),
  threatTone: z.enum(['LOW', 'MODERATE', 'HIGH']).default('MODERATE'),
  realismLevel: z.enum(['STYLIZED', 'IMMERSIVE', 'INTENSE']).default('IMMERSIVE'),
  allowLateNightMessaging: z.boolean().default(false),
  maxTouchesPerHour: z.number().int().min(1).max(12).default(3)
});

export const narrativeEventContextSchema = z.object({
  storyMood: storyToneSchema.default('CINEMATIC'),
  sceneType: narrativeSceneTypeSchema,
  villainPresence: z.number().int().min(0).max(100),
  playerTensionLevel: z.number().int().min(0).max(100),
  dangerLevel: z.number().int().min(0).max(100),
  location: z.string().min(1),
  timeOfNightHour: z.number().int().min(0).max(23),
  enabledChannels: z.array(deliveryChannelSchema).min(1).default(['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL', 'EMAIL'])
});

export const narrativeHiddenClueSchema = z.object({
  id: z.string().min(1),
  clueType: z.enum(['VISUAL', 'AUDIO', 'TEXTUAL', 'TIMESTAMP', 'GEO', 'BEHAVIORAL']),
  summary: z.string().min(1),
  extractionHint: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const narrativeDeliveryMethodSchema = z.object({
  channel: deliveryChannelSchema,
  route: z.enum(['DIRECT_MESSAGE', 'BROADCAST', 'ATTACHMENT_DROP', 'LIVE_CALL', 'PORTAL_DROP']),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  pacingTag: z.enum(['IMMEDIATE', 'DELAYED', 'LATE_NIGHT', 'SILENCE_BREAK']),
  scheduleAt: z.string().datetime().nullable().default(null),
  rationale: z.string().min(1)
});

export const narrativeResponseOptionSchema = z.object({
  id: z.string().min(1),
  intent: playerIntentSchema,
  summary: z.string().min(1),
  sampleReply: z.string().min(1)
});

export const narrativeConsequenceSchema = z.object({
  id: z.string().min(1),
  whenResponseId: z.string().min(1),
  outcome: z.string().min(1),
  triggeredEvents: z.array(z.string().min(1)).min(1),
  reputationDelta: reputationVectorSchema.partial().default({}),
  npcTrustDelta: z
    .array(
      z.object({
        npcId: z.string().min(1),
        delta: z.number().int().min(-25).max(25)
      })
    )
    .default([]),
  villainReaction: z.string().min(1),
  endingImpact: z.enum(['NONE', 'OPENS_SECRET_PATH', 'LOCKS_ENDING', 'UNLOCKS_ENDING']).default('NONE')
});

export const narrativeEventCardSchema = z.object({
  id: z.string().min(1),
  mediaType: narrativeMediaTypeSchema,
  mediaDescription: z.string().min(1),
  aiGenerationPrompt: z.string().min(1),
  narrativePurpose: z.string().min(1),
  hiddenClues: z.array(narrativeHiddenClueSchema).min(1),
  deliveryMethod: narrativeDeliveryMethodSchema,
  possiblePlayerResponses: z.array(narrativeResponseOptionSchema).min(2),
  storyConsequences: z.array(narrativeConsequenceSchema).min(2),
  villainStage: z.number().int().min(1).max(4),
  tensionLevel: z.number().int().min(0).max(100),
  trustDisruptionPressure: z.number().int().min(0).max(100),
  generatedAt: z.string().datetime()
});

export const nextNarrativeEventRequestSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  nowAt: z.string().datetime().optional(),
  behavior: narrativePlayerBehaviorSnapshotSchema,
  runtime: narrativeRuntimeSnapshotSchema,
  context: narrativeEventContextSchema,
  safety: narrativeSafetyPreferenceSchema.optional()
});

export const nextNarrativeEventResponseSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  nextVillainStage: z.number().int().min(1).max(4),
  stageLabel: z.string().min(1),
  event: narrativeEventCardSchema
});

export const evaluateTriggersRequestSchema = z.object({
  caseId: z.string().min(1),
  eventType: triggerEventTypeSchema,
  eventKey: z.string().min(1),
  state: z.object({
    flags: z.record(triggerPrimitiveSchema),
    reputation: reputationVectorSchema,
    npcTrust: z.record(z.number().int().min(0).max(100)),
    clues: z.array(z.string().min(1)),
    events: z.array(z.string().min(1)),
    investigationProgress: z.number().min(0).max(100),
    villainStage: z.number().int().min(1).max(4),
    silenceSeconds: z.number().int().min(0),
    elapsedSeconds: z.number().int().min(0),
    lastIntent: playerIntentSchema.nullable()
  })
});

export const evaluateTriggersResponseSchema = z.object({
  triggeredRuleIds: z.array(z.string().min(1)),
  actions: z.array(triggerActionSchema),
  stateDelta: z.record(z.unknown())
});

export const investigationBoardUpsertSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  board: investigationBoardSchema
});

export type Role = z.infer<typeof roleSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type User = z.infer<typeof userSchema>;
export type LegalAcceptanceStatus = z.infer<typeof legalAcceptanceStatusSchema>;
export type DeliveryChannel = z.infer<typeof deliveryChannelSchema>;
export type PlayerIntent = z.infer<typeof playerIntentSchema>;
export type CommunicationTone = z.infer<typeof communicationToneSchema>;
export type ReputationAxis = z.infer<typeof reputationAxisSchema>;
export type ReputationVector = z.infer<typeof reputationVectorSchema>;
export type TriggerPredicate = z.infer<typeof triggerPredicateSchema>;
export type TriggerAction = z.infer<typeof triggerActionSchema>;
export type StoryTriggerRule = z.infer<typeof storyTriggerRuleSchema>;
export type StoryPackage = z.infer<typeof storyPackageSchema>;
export type StoryBeat = z.infer<typeof storyBeatSchema>;
export type StoryAct = z.infer<typeof storyActSchema>;
export type NpcProfile = z.infer<typeof npcProfileSchema>;
export type VillainProfile = z.infer<typeof villainProfileSchema>;
export type StoryArc = z.infer<typeof storyArcSchema>;
export type StoryEnding = z.infer<typeof storyEndingSchema>;
export type InvestigationBoard = z.infer<typeof investigationBoardSchema>;
export type CharacterVoiceProfile = z.infer<typeof characterVoiceProfileSchema>;
export type StoryVoiceCasting = z.infer<typeof storyVoiceCastingSchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type WebsocketEvent = z.infer<typeof websocketEventSchema>;
export type InboundPlayerMessage = z.infer<typeof inboundPlayerMessageSchema>;
export type ProcessInboundMessageRequest = z.infer<typeof processInboundMessageRequestSchema>;
export type ProcessInboundMessageResponse = z.infer<typeof processInboundMessageResponseSchema>;
export type NarrativePlayerBehaviorSnapshot = z.infer<typeof narrativePlayerBehaviorSnapshotSchema>;
export type NarrativeRuntimeSnapshot = z.infer<typeof narrativeRuntimeSnapshotSchema>;
export type NarrativeSafetyPreference = z.infer<typeof narrativeSafetyPreferenceSchema>;
export type NarrativeEventContext = z.infer<typeof narrativeEventContextSchema>;
export type NarrativeSceneType = z.infer<typeof narrativeSceneTypeSchema>;
export type NarrativeMediaType = z.infer<typeof narrativeMediaTypeSchema>;
export type NarrativeHiddenClue = z.infer<typeof narrativeHiddenClueSchema>;
export type NarrativeDeliveryMethod = z.infer<typeof narrativeDeliveryMethodSchema>;
export type NarrativeResponseOption = z.infer<typeof narrativeResponseOptionSchema>;
export type NarrativeConsequence = z.infer<typeof narrativeConsequenceSchema>;
export type NarrativeEventCard = z.infer<typeof narrativeEventCardSchema>;
export type NextNarrativeEventRequest = z.infer<typeof nextNarrativeEventRequestSchema>;
export type NextNarrativeEventResponse = z.infer<typeof nextNarrativeEventResponseSchema>;
export type EvaluateTriggersRequest = z.infer<typeof evaluateTriggersRequestSchema>;
export type EvaluateTriggersResponse = z.infer<typeof evaluateTriggersResponseSchema>;
export type InvestigationBoardUpsert = z.infer<typeof investigationBoardUpsertSchema>;
export type GrowthLeadCaptureRequest = z.infer<typeof growthLeadCaptureRequestSchema>;
export type GrowthLeadCaptureResponse = z.infer<typeof growthLeadCaptureResponseSchema>;
export type LifecycleEventType = z.infer<typeof lifecycleEventTypeSchema>;
export type GrowthLifecycleEventRequest = z.infer<typeof growthLifecycleEventRequestSchema>;
export type GrowthLifecycleEventResponse = z.infer<typeof growthLifecycleEventResponseSchema>;
export type GrowthLeadRecord = z.infer<typeof growthLeadRecordSchema>;
export type GrowthCampaignSummary = z.infer<typeof growthCampaignSummarySchema>;
