import {
  nextNarrativeEventResponseSchema,
  type DeliveryChannel,
  type NarrativeConsequence,
  type NarrativeEventCard,
  type NarrativeHiddenClue,
  type NarrativeMediaType,
  type NarrativeResponseOption,
  type NextNarrativeEventRequest,
  type NextNarrativeEventResponse,
  type PlayerIntent,
  type StoryPackage
} from '@myhorrorstory/contracts';

const STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Peripheral Presence',
  2: 'Psychological Contact',
  3: 'Active Interference',
  4: 'Personal Confrontation'
};

const STAGE_PURPOSES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Seed dread through indirect surveillance signals and private references.',
  2: 'Destabilize trust in allies by mixing partial truths with manipulation.',
  3: 'Force immediate decisions through interference, time pressure, and false leads.',
  4: 'Drive personal confrontation that can corrupt, recruit, or break the player.'
};

const MEDIA_POOLS: Record<1 | 2 | 3 | 4, NarrativeMediaType[]> = {
  1: [
    'AI_GENERATED_PHOTOGRAPH',
    'SURVEILLANCE_FOOTAGE',
    'CHAT_LOG',
    'POLICE_REPORT',
    'HANDWRITTEN_NOTE'
  ],
  2: [
    'VOICEMAIL_RECORDING',
    'WITNESS_INTERVIEW',
    'NARRATED_SEGMENT',
    'ENCRYPTED_FILE',
    'SIMULATED_WEBSITE'
  ],
  3: [
    'BODY_CAMERA_VIDEO',
    'LIVESTREAM_FRAGMENT',
    'CORRUPTED_FILE',
    'EMERGENCY_BROADCAST',
    'CHARACTER_VOICE_MESSAGE'
  ],
  4: [
    'PHONE_CAMERA_RECORDING',
    'CINEMATIC_AI_VIDEO_CLIP',
    'CHARACTER_VOICE_MESSAGE',
    'VOICEMAIL_RECORDING',
    'EERIE_MUSIC_SCORE'
  ]
};

const MEDIA_CHANNELS: Record<NarrativeMediaType, DeliveryChannel[]> = {
  CINEMATIC_AI_VIDEO_CLIP: ['WHATSAPP', 'TELEGRAM', 'WEB_PORTAL'],
  SURVEILLANCE_FOOTAGE: ['TELEGRAM', 'WHATSAPP', 'WEB_PORTAL'],
  SECURITY_CAMERA_RECORDING: ['TELEGRAM', 'WHATSAPP', 'WEB_PORTAL'],
  BODY_CAMERA_VIDEO: ['WHATSAPP', 'TELEGRAM', 'EMAIL'],
  PHONE_CAMERA_RECORDING: ['WHATSAPP', 'TELEGRAM', 'SMS'],
  NARRATED_SEGMENT: ['VOICE_MESSAGE', 'EMAIL', 'WEB'],
  CHARACTER_VOICE_MESSAGE: ['VOICE_MESSAGE', 'WHATSAPP', 'TELEGRAM'],
  ENVIRONMENTAL_AMBIENCE_AUDIO: ['VOICE_MESSAGE', 'WEB', 'EMAIL'],
  EERIE_MUSIC_SCORE: ['WEB', 'EMAIL', 'VOICE_MESSAGE'],
  AI_GENERATED_PHOTOGRAPH: ['WHATSAPP', 'TELEGRAM', 'EMAIL'],
  NEWSPAPER_ARTICLE: ['EMAIL', 'WEB_PORTAL', 'WEB'],
  POLICE_REPORT: ['EMAIL', 'DOCUMENT_DROP', 'WEB_PORTAL'],
  WITNESS_INTERVIEW: ['VOICE_MESSAGE', 'EMAIL', 'WEB'],
  HANDWRITTEN_NOTE: ['IMAGE_DROP', 'WHATSAPP', 'EMAIL'],
  JOURNAL_ENTRY: ['DOCUMENT_DROP', 'EMAIL', 'WEB_PORTAL'],
  ENCRYPTED_FILE: ['DOCUMENT_DROP', 'EMAIL', 'WEB_PORTAL'],
  CHAT_LOG: ['TELEGRAM', 'WHATSAPP', 'WEB_PORTAL'],
  CORRUPTED_FILE: ['DOCUMENT_DROP', 'TELEGRAM', 'EMAIL'],
  GPS_COORDINATE_DROP: ['SMS', 'TELEGRAM', 'WHATSAPP'],
  INTERACTIVE_MAP: ['WEB_PORTAL', 'WEB', 'EMAIL'],
  SIMULATED_WEBSITE: ['WEB_PORTAL', 'EMAIL', 'SMS'],
  LIVESTREAM_FRAGMENT: ['WEB_PORTAL', 'TELEGRAM', 'WHATSAPP'],
  VOICEMAIL_RECORDING: ['PHONE_CALL', 'VOICE_MESSAGE', 'SMS'],
  EMERGENCY_BROADCAST: ['NEWS_BROADCAST', 'SMS', 'EMAIL']
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickOne<T>(rng: () => number, values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error('pickOne requires at least one value');
  }
  const index = Math.floor(rng() * values.length);
  return values[index] ?? values[0]!;
}

function formatIsoTime(now: Date, addMinutes: number): string {
  const scheduled = new Date(now.getTime() + addMinutes * 60_000);
  return scheduled.toISOString();
}

function getStageLabel(stage: 1 | 2 | 3 | 4): string {
  return STAGE_LABELS[stage];
}

function inferVillainStage(input: NextNarrativeEventRequest): 1 | 2 | 3 | 4 {
  const base = input.runtime.villainStage;
  const highProgress = input.runtime.investigationProgress >= 80;
  const midProgress = input.runtime.investigationProgress >= 55;
  const highPresence = input.context.villainPresence >= 80;
  const midPresence = input.context.villainPresence >= 55;
  const heavyAccusations = input.behavior.suspectsAccused.length >= 3;
  const longSilence = input.behavior.responseDelaySeconds >= 3600;

  let stage = base;

  if (midProgress || midPresence || longSilence) {
    stage = Math.max(stage, 2);
  }

  if (midProgress && midPresence) {
    stage = Math.max(stage, 3);
  }

  if (highProgress || highPresence || heavyAccusations) {
    stage = 4;
  }

  if (
    (input.safety?.threatTone === 'LOW' || (input.safety?.intensityLevel ?? 3) <= 2) &&
    stage > 3
  ) {
    return 3;
  }

  return clamp(stage, 1, 4) as 1 | 2 | 3 | 4;
}

function computeTension(input: NextNarrativeEventRequest, stage: 1 | 2 | 3 | 4): number {
  const baseline =
    input.context.playerTensionLevel * 0.5 +
    input.context.dangerLevel * 0.25 +
    input.context.villainPresence * 0.25;
  const delayPressure = Math.min(15, Math.floor(input.behavior.responseDelaySeconds / 120));
  const accusations = Math.min(12, input.behavior.suspectsAccused.length * 4);
  const aggression = Math.max(0, input.runtime.reputation.aggression);
  const stagePressure = stage * 6;
  const intensityModifier = ((input.safety?.intensityLevel ?? 3) - 3) * 4;

  return clamp(
    Math.round(baseline + delayPressure + accusations + aggression * 0.08 + stagePressure + intensityModifier),
    0,
    100
  );
}

function pickMediaType(
  input: NextNarrativeEventRequest,
  stage: 1 | 2 | 3 | 4,
  tension: number,
  rng: () => number
): NarrativeMediaType {
  const pool = [...MEDIA_POOLS[stage]];

  if (input.context.sceneType === 'RITUAL_SITE') {
    pool.push('CINEMATIC_AI_VIDEO_CLIP', 'EERIE_MUSIC_SCORE');
  }

  if (input.context.sceneType === 'SURVEILLANCE_REVIEW') {
    pool.push('SURVEILLANCE_FOOTAGE', 'SECURITY_CAMERA_RECORDING');
  }

  if (input.context.sceneType === 'EMERGENCY_ALERT' || tension >= 90) {
    pool.push('EMERGENCY_BROADCAST', 'PHONE_CAMERA_RECORDING');
  }

  return pickOne(rng, pool);
}

function chooseDeliveryMethod(
  input: NextNarrativeEventRequest,
  mediaType: NarrativeMediaType,
  tension: number,
  stage: 1 | 2 | 3 | 4,
  now: Date
): NarrativeEventCard['deliveryMethod'] {
  const available = input.context.enabledChannels;
  const preferred = MEDIA_CHANNELS[mediaType];
  const channel =
    preferred.find((candidate) => available.includes(candidate)) ??
    available[0] ??
    'SMS';

  const hour = input.context.timeOfNightHour;
  const allowLateNight = input.safety?.allowLateNightMessaging ?? false;
  const lateNightWindow = hour >= 23 || hour <= 4;

  let pacingTag: NarrativeEventCard['deliveryMethod']['pacingTag'] = 'DELAYED';
  if (input.behavior.responseDelaySeconds >= 1800) {
    pacingTag = 'SILENCE_BREAK';
  } else if (stage >= 3 || tension >= 80) {
    pacingTag = 'IMMEDIATE';
  } else if (lateNightWindow && allowLateNight) {
    pacingTag = 'LATE_NIGHT';
  }

  const urgency: NarrativeEventCard['deliveryMethod']['urgency'] =
    tension >= 88 ? 'CRITICAL' : tension >= 70 ? 'HIGH' : tension >= 45 ? 'MEDIUM' : 'LOW';

  let route: NarrativeEventCard['deliveryMethod']['route'] = 'DIRECT_MESSAGE';
  if (mediaType === 'EMERGENCY_BROADCAST') {
    route = 'BROADCAST';
  } else if (channel === 'PHONE_CALL' || mediaType === 'VOICEMAIL_RECORDING') {
    route = 'LIVE_CALL';
  } else if (
    mediaType === 'ENCRYPTED_FILE' ||
    mediaType === 'POLICE_REPORT' ||
    mediaType === 'JOURNAL_ENTRY' ||
    mediaType === 'CORRUPTED_FILE'
  ) {
    route = 'ATTACHMENT_DROP';
  } else if (channel === 'WEB_PORTAL' || mediaType === 'SIMULATED_WEBSITE') {
    route = 'PORTAL_DROP';
  }

  let scheduleAt: string | null = null;
  if (pacingTag === 'DELAYED') {
    scheduleAt = formatIsoTime(now, 8);
  }
  if (pacingTag === 'LATE_NIGHT') {
    scheduleAt = allowLateNight ? formatIsoTime(now, 20) : formatIsoTime(now, 8 * 60);
  }

  const rationale =
    route === 'BROADCAST'
      ? 'Escalate urgency through wide-scope interruption.'
      : route === 'LIVE_CALL'
        ? 'Force immediate emotional reaction with direct voice contact.'
        : route === 'ATTACHMENT_DROP'
          ? 'Deliver analyzable forensic artifact with replay value.'
          : route === 'PORTAL_DROP'
            ? 'Drive players into a controlled web clue environment.'
            : 'Maintain conversational immersion on the active messaging channel.';

  return {
    channel,
    route,
    urgency,
    pacingTag,
    scheduleAt,
    rationale
  };
}

function buildDescription(
  story: StoryPackage,
  input: NextNarrativeEventRequest,
  mediaType: NarrativeMediaType,
  stage: 1 | 2 | 3 | 4,
  rng: () => number
): string {
  const villainTemplate = story.villainMessageTemplates.find((template) => template.stage === stage);
  const npc = pickOne(rng, story.npcProfiles);
  const behaviorCue =
    input.behavior.suspectsAccused.length > 0
      ? `mentions your latest accusation against ${input.behavior.suspectsAccused[0]}.`
      : 'references your private progress with unsettling precision.';

  return `${mediaType.replaceAll('_', ' ')} arrives from ${npc.displayName} and ${behaviorCue} ${
    villainTemplate?.textTemplate ?? 'A hidden observer appears to be steering the case.'
  }`;
}

function buildAiPrompt(
  story: StoryPackage,
  input: NextNarrativeEventRequest,
  mediaType: NarrativeMediaType,
  stage: 1 | 2 | 3 | 4,
  tension: number
): string {
  const threatTone = input.safety?.threatTone ?? 'MODERATE';
  return [
    `Generate ${mediaType.replaceAll('_', ' ').toLowerCase()} for an immersive horror ARG.`,
    `Story: ${story.title}.`,
    `Mood: ${input.context.storyMood}.`,
    `Scene: ${input.context.sceneType}.`,
    `Location: ${input.context.location}.`,
    `Villain stage: ${stage} (${getStageLabel(stage)}).`,
    `Tension level: ${tension}/100.`,
    `Threat tone cap: ${threatTone}.`,
    'Include one subtle hidden clue in timestamps, reflections, symbols, or background audio.',
    'Keep visuals grounded and unsettling, not stylized Hollywood spectacle.'
  ].join(' ');
}

function buildHiddenClues(
  story: StoryPackage,
  input: NextNarrativeEventRequest,
  rng: () => number
): NarrativeHiddenClue[] {
  const discovered = new Set(input.behavior.cluesDiscovered);
  const unresolved = story.clueEvidenceList.filter((clue) => !discovered.has(clue));
  const primary = unresolved[0] ?? story.clueEvidenceList[0] ?? `${story.id}-trace`;
  const secondary = unresolved[1] ?? story.clueEvidenceList[1] ?? `${story.id}-echo`;
  const clueTypes: NarrativeHiddenClue['clueType'][] = ['VISUAL', 'AUDIO', 'TEXTUAL', 'TIMESTAMP', 'GEO'];

  return [
    {
      id: `hidden.${primary}`,
      clueType: pickOne(rng, clueTypes),
      summary: `Subtle reference to ${primary} appears for less than two seconds.`,
      extractionHint: 'Pause, zoom, and compare against known evidence ordering.',
      confidence: Math.round((0.6 + rng() * 0.35) * 100) / 100
    },
    {
      id: `hidden.${secondary}`,
      clueType: pickOne(rng, clueTypes),
      summary: `A mismatched context marker implies ${secondary} was altered.`,
      extractionHint: 'Inspect metadata and background layer continuity frame by frame.',
      confidence: Math.round((0.5 + rng() * 0.4) * 100) / 100
    }
  ];
}

function buildResponseOptions(stage: 1 | 2 | 3 | 4): NarrativeResponseOption[] {
  const byStage: Record<1 | 2 | 3 | 4, Array<{ intent: PlayerIntent; summary: string; sampleReply: string }>> =
    {
      1: [
        {
          intent: 'CURIOSITY',
          summary: 'Probe for source details without escalating.',
          sampleReply: 'Where did this recording originate?'
        },
        {
          intent: 'QUESTION',
          summary: 'Request confirmation from allies before acting.',
          sampleReply: 'Can anyone verify this timestamp independently?'
        },
        {
          intent: 'SILENCE',
          summary: 'Hold response to observe who reacts next.',
          sampleReply: '...'
        }
      ],
      2: [
        {
          intent: 'DEFIANCE',
          summary: 'Challenge manipulative framing directly.',
          sampleReply: 'You do not get to define this investigation.'
        },
        {
          intent: 'CURIOSITY',
          summary: 'Ask for proof while keeping emotional distance.',
          sampleReply: 'If this is true, send the raw chain-of-custody file.'
        },
        {
          intent: 'BARGAIN',
          summary: 'Offer limited exchange for verifiable evidence.',
          sampleReply: 'Give me one real location and I will hear you out.'
        }
      ],
      3: [
        {
          intent: 'FEAR',
          summary: 'Prioritize immediate safety and seek delay.',
          sampleReply: 'Stop. I will do what you ask. Just keep them alive.'
        },
        {
          intent: 'DEFIANCE',
          summary: 'Refuse pressure and continue independent pursuit.',
          sampleReply: 'I am not choosing from your staged options.'
        },
        {
          intent: 'COMPLIANCE',
          summary: 'Follow instruction to protect a vulnerable NPC.',
          sampleReply: 'I am going where you said. No police.'
        }
      ],
      4: [
        {
          intent: 'DEFIANCE',
          summary: 'Reject recruitment and force final confrontation.',
          sampleReply: 'This ends tonight, and you know it.'
        },
        {
          intent: 'BARGAIN',
          summary: 'Trade partial truth to buy tactical time.',
          sampleReply: 'I will answer one question if you release the witness.'
        },
        {
          intent: 'DECEPTION',
          summary: 'Offer false compliance to create counterplay.',
          sampleReply: 'I erased the file. Send your next terms.'
        },
        {
          intent: 'COMPLIANCE',
          summary: 'Accept villain conditions for immediate survival.',
          sampleReply: 'I accept. Tell me where to go.'
        }
      ]
    };

  return byStage[stage].map((item, index) => ({
    id: `response.${stage}.${index + 1}`,
    intent: item.intent,
    summary: item.summary,
    sampleReply: item.sampleReply
  }));
}

function endingImpactFromIntent(intent: PlayerIntent): NarrativeConsequence['endingImpact'] {
  switch (intent) {
    case 'CURIOSITY':
    case 'QUESTION':
      return 'OPENS_SECRET_PATH';
    case 'COMPLIANCE':
    case 'FEAR':
      return 'LOCKS_ENDING';
    case 'DEFIANCE':
      return 'UNLOCKS_ENDING';
    default:
      return 'NONE';
  }
}

function consequenceFromIntent(
  intent: PlayerIntent,
  story: StoryPackage,
  stage: 1 | 2 | 3 | 4,
  responseId: string
): NarrativeConsequence {
  const ally = story.npcProfiles[0]?.id ?? 'unknown-ally';

  switch (intent) {
    case 'CURIOSITY':
    case 'QUESTION':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'New trace evidence is unlocked with improved timeline certainty.',
        triggeredEvents: ['clue.unlocked', 'timeline.updated'],
        reputationDelta: {
          curiosity: 8,
          trustworthiness: 4
        },
        npcTrustDelta: [{ npcId: ally, delta: 5 }],
        villainReaction: 'Switches tactic from ambiguity to direct pressure.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'DEFIANCE':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'Villain escalates with harsher contact but exposes operational pattern.',
        triggeredEvents: ['villain.contacted', 'pattern.revealed'],
        reputationDelta: {
          aggression: 10,
          morality: 4
        },
        npcTrustDelta: [{ npcId: ally, delta: -4 }],
        villainReaction: stage >= 3 ? 'Issues ultimatum and targets allied witness.' : 'Taunts and probes weak links.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'COMPLIANCE':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'Immediate threat drops, but the evidence chain becomes compromised.',
        triggeredEvents: ['evidence.corrupted', 'villain.influence.grew'],
        reputationDelta: {
          trustworthiness: -8,
          morality: -6
        },
        npcTrustDelta: [{ npcId: ally, delta: -10 }],
        villainReaction: 'Rewards obedience while embedding false clue trails.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'FEAR':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'A short-term reprieve protects one NPC but loses strategic initiative.',
        triggeredEvents: ['npc.saved', 'initiative.lost'],
        reputationDelta: {
          trustworthiness: -2,
          morality: -3
        },
        npcTrustDelta: [{ npcId: ally, delta: -5 }],
        villainReaction: 'Increases psychological leverage with personalized messages.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'BARGAIN':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'A conditional exchange opens a hidden branch with risky intelligence.',
        triggeredEvents: ['branch.secret.opened', 'villain.deal.pending'],
        reputationDelta: {
          deception: 6,
          curiosity: 4
        },
        npcTrustDelta: [{ npcId: ally, delta: -2 }],
        villainReaction: 'Offers partial confessions tied to moral tests.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'DECEPTION':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'Counterplay succeeds briefly, but risk of retaliatory strike increases.',
        triggeredEvents: ['counterplay.executed', 'retaliation.risk.raised'],
        reputationDelta: {
          deception: 12,
          aggression: 2
        },
        npcTrustDelta: [{ npcId: ally, delta: -6 }],
        villainReaction: 'Tests every future claim for inconsistencies.',
        endingImpact: endingImpactFromIntent(intent)
      };
    case 'SILENCE':
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'Silence triggers uncertainty and may endanger unattended witnesses.',
        triggeredEvents: ['player.delay.detected', 'witness.risk.increased'],
        reputationDelta: {
          trustworthiness: -4
        },
        npcTrustDelta: [{ npcId: ally, delta: -7 }],
        villainReaction: 'Breaks silence with late-night personal contact.',
        endingImpact: endingImpactFromIntent(intent)
      };
    default:
      return {
        id: `consequence.${responseId}`,
        whenResponseId: responseId,
        outcome: 'Story advances on default branch.',
        triggeredEvents: ['story.branch.default'],
        reputationDelta: {},
        npcTrustDelta: [],
        villainReaction: 'Monitors and adapts pacing.',
        endingImpact: 'NONE'
      };
  }
}

function computeTrustDisruptionPressure(input: NextNarrativeEventRequest, stage: 1 | 2 | 3 | 4): number {
  const allianceFactor = input.behavior.alliances.length > 0 ? 15 : 0;
  return clamp(
    Math.round(
      input.context.villainPresence * 0.55 +
        input.context.dangerLevel * 0.15 +
        input.behavior.suspectsAccused.length * 6 +
        allianceFactor +
        stage * 5
    ),
    0,
    100
  );
}

export class NarrativeDirectorEngine {
  generateNextEvent(story: StoryPackage, input: NextNarrativeEventRequest): NextNarrativeEventResponse {
    const now = input.nowAt ? new Date(input.nowAt) : new Date();
    const stage = inferVillainStage(input);
    const tension = computeTension(input, stage);
    const seed = hashText(
      `${story.id}:${input.playerId}:${stage}:${input.context.location}:${now.toISOString().slice(0, 16)}`
    );
    const rng = createRng(seed);
    const mediaType = pickMediaType(input, stage, tension, rng);
    const deliveryMethod = chooseDeliveryMethod(input, mediaType, tension, stage, now);
    const possiblePlayerResponses = buildResponseOptions(stage);
    const storyConsequences = possiblePlayerResponses.map((response) =>
      consequenceFromIntent(response.intent, story, stage, response.id)
    );
    const trustDisruptionPressure = computeTrustDisruptionPressure(input, stage);

    const event: NarrativeEventCard = {
      id: `evt.${story.id}.${hashText(`${input.playerId}:${now.toISOString()}`)}`,
      mediaType,
      mediaDescription: buildDescription(story, input, mediaType, stage, rng),
      aiGenerationPrompt: buildAiPrompt(story, input, mediaType, stage, tension),
      narrativePurpose: STAGE_PURPOSES[stage],
      hiddenClues: buildHiddenClues(story, input, rng),
      deliveryMethod,
      possiblePlayerResponses,
      storyConsequences,
      villainStage: stage,
      tensionLevel: tension,
      trustDisruptionPressure,
      generatedAt: now.toISOString()
    };

    return nextNarrativeEventResponseSchema.parse({
      caseId: input.caseId,
      playerId: input.playerId,
      nextVillainStage: stage,
      stageLabel: getStageLabel(stage),
      event
    });
  }
}

export function generateNextNarrativeEvent(
  story: StoryPackage,
  input: NextNarrativeEventRequest
): NextNarrativeEventResponse {
  const engine = new NarrativeDirectorEngine();
  return engine.generateNextEvent(story, input);
}
