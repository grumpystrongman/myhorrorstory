import type { PlayerIntent } from '@myhorrorstory/contracts';
import type { ArgCampaignManifest, ArgDayPackage } from './arg-campaign';
import type {
  DramaBeat,
  DramaCampaignPlan,
  DramaEnding,
  DramaMessage,
  DramaNpcDossier,
  DramaPackage,
  DramaResponseOption
} from './play-session';

export interface ArgNpcProfile {
  id: string;
  role: string;
  displayName: string;
  baselineEmotion: string;
  motivations: string[];
  trustBaseline: number;
  trustCeiling: number;
  secrets: Array<{
    id: string;
    summary: string;
  }>;
}

const ALL_INTENTS: PlayerIntent[] = [
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
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stageFromPhase(phase: string): 1 | 2 | 3 | 4 {
  if (phase === 'DISCOVERY') {
    return 1;
  }
  if (phase === 'ESCALATION') {
    return 2;
  }
  if (phase === 'DANGER') {
    return 3;
  }
  return 4;
}

function roleToDramaRole(role: string): DramaMessage['role'] {
  if (role === 'antagonist') {
    return 'antagonist';
  }
  if (role === 'detective' || role === 'journalist' || role === 'unknown_contact') {
    return 'operator';
  }
  if (role === 'witness') {
    return 'witness';
  }
  return 'narrator';
}

function normalizeTemplate(input: string): string {
  return input
    .replaceAll('{{player_alias}}', 'Operator')
    .replaceAll('{{preferred_channel}}', 'secure thread')
    .replaceAll('{{last_major_choice}}', 'your previous choice')
    .replaceAll('{{trusted_contact}}', 'your trusted contact');
}

function inferIntentFromAction(action: string): PlayerIntent {
  const normalized = action.toLowerCase();
  if (normalized.includes('defy')) {
    return 'DEFIANCE';
  }
  if (normalized.includes('comply')) {
    return 'COMPLIANCE';
  }
  if (normalized.includes('accus') || normalized.includes('report')) {
    return 'ACCUSATION';
  }
  if (normalized.includes('delay') || normalized.includes('silent')) {
    return 'SILENCE';
  }
  if (normalized.includes('protect') || normalized.includes('offer')) {
    return 'BARGAIN';
  }
  if (normalized.includes('decline') || normalized.includes('deny')) {
    return 'DECEPTION';
  }
  if (normalized.includes('threat')) {
    return 'THREAT';
  }
  if (normalized.includes('ask') || normalized.includes('question')) {
    return 'QUESTION';
  }
  if (normalized.includes('fear')) {
    return 'FEAR';
  }
  return 'CURIOSITY';
}

function reputationForIntent(intent: PlayerIntent): DramaResponseOption['reputationDelta'] {
  if (intent === 'DEFIANCE') {
    return { trustworthiness: -1, aggression: 2, curiosity: 0, deception: 0, morality: -1 };
  }
  if (intent === 'COMPLIANCE') {
    return { trustworthiness: 1, aggression: 0, curiosity: 0, deception: 0, morality: 1 };
  }
  if (intent === 'ACCUSATION') {
    return { trustworthiness: -1, aggression: 1, curiosity: 0, deception: 0, morality: 0 };
  }
  if (intent === 'SILENCE') {
    return { trustworthiness: -1, aggression: 0, curiosity: 0, deception: 0, morality: 0 };
  }
  if (intent === 'BARGAIN') {
    return { trustworthiness: 0, aggression: 0, curiosity: 0, deception: 1, morality: -1 };
  }
  if (intent === 'DECEPTION') {
    return { trustworthiness: -2, aggression: 0, curiosity: 0, deception: 2, morality: -1 };
  }
  if (intent === 'QUESTION' || intent === 'CURIOSITY') {
    return { trustworthiness: 0, aggression: 0, curiosity: 2, deception: 0, morality: 0 };
  }
  if (intent === 'THREAT') {
    return { trustworthiness: -2, aggression: 3, curiosity: 0, deception: 0, morality: -2 };
  }
  if (intent === 'FEAR') {
    return { trustworthiness: 0, aggression: -1, curiosity: 0, deception: 0, morality: 0 };
  }
  return { trustworthiness: 0, aggression: 0, curiosity: 0, deception: 0, morality: 0 };
}

function toMessages(day: ArgDayPackage, npcMap: Map<string, ArgNpcProfile>): DramaMessage[] {
  return day.interactions.map((interaction, index) => {
    const actor = npcMap.get(interaction.actorId);
    const delaySeconds = clamp(Math.round((8 + index * 6) + index), 1, 32);
    return {
      id: interaction.id,
      senderName: actor?.displayName ?? interaction.role,
      role: roleToDramaRole(interaction.role),
      channel: interaction.channel,
      text: normalizeTemplate(interaction.messageTemplate),
      delaySeconds,
      intensity: clamp(20 + stageFromPhase(day.phase) * 14 + index * 3, 20, 95)
    };
  });
}

function toResponseOptions(
  day: ArgDayPackage,
  nextBeatId: string | null
): DramaResponseOption[] {
  const actions = Array.from(
    new Set(day.interactions.flatMap((interaction) => interaction.expectedPlayerActions))
  );
  const picked = actions.length > 0 ? actions.slice(0, 3) : ['acknowledge', 'ask_followup'];

  return picked.map((action, index) => {
    const intent = inferIntentFromAction(action);
    const normalizedIntent = ALL_INTENTS.includes(intent) ? intent : 'QUESTION';
    return {
      id: `${day.id}.choice.${index + 1}`,
      label: action.replaceAll('_', ' ').replace(/\b\w/g, (token) => token.toUpperCase()),
      intent: normalizedIntent,
      summary: `Day ${String(day.day).padStart(2, '0')} action: ${action.replaceAll('_', ' ')}`,
      nextBeatId,
      progressDelta: 3,
      reputationDelta: reputationForIntent(normalizedIntent),
      flagUpdates: {
        [`decision.day_${String(day.day).padStart(2, '0')}.primary`]: action
      }
    };
  });
}

function buildCampaignPlan(campaign: ArgCampaignManifest): DramaCampaignPlan {
  return {
    totalDays: campaign.durationDays,
    weeks: campaign.weeklyStructure.map((week) => ({
      week: week.week,
      label: week.label,
      objective: week.objective,
      keyMoments: []
    }))
  };
}

function buildEndings(campaign: ArgCampaignManifest): DramaEnding[] {
  return [
    {
      id: `${campaign.id}-justice`,
      title: 'Documented Justice',
      type: 'JUSTICE',
      summary: 'Evidence survives scrutiny and confirms culpability.',
      epilogue: 'The public record finally aligns with what happened.',
      sequelHook: 'One unresolved file remains sealed.'
    },
    {
      id: `${campaign.id}-pyrrhic`,
      title: 'Pyrrhic Containment',
      type: 'PYRRHIC',
      summary: 'The immediate threat is contained at a difficult cost.',
      epilogue: 'Witnesses are safer, but systemic damage remains.',
      sequelHook: 'Unknown Contact sends a checksum-only message.'
    },
    {
      id: `${campaign.id}-corruption`,
      title: 'Compromised Truth',
      type: 'CORRUPTION',
      summary: 'Outcome is stabilized by accepting manipulated evidence.',
      epilogue: 'Case closure stands, but the archive is tainted.',
      sequelHook: 'The antagonist leaves one final mirror transcript.'
    },
    {
      id: `${campaign.id}-unresolved`,
      title: 'Psychological Break',
      type: 'UNRESOLVED',
      summary: 'No timeline can be proven cleanly enough to close the case.',
      epilogue: 'The board is complete, but certainty collapses.',
      sequelHook: 'A delayed call arrives from an unlisted route.'
    }
  ];
}

export function adaptArgToDramaPackage(
  campaign: ArgCampaignManifest,
  days: ArgDayPackage[],
  npcProfiles: ArgNpcProfile[]
): DramaPackage {
  const npcMap = new Map(npcProfiles.map((npc) => [npc.id, npc]));
  const beats: DramaBeat[] = days.map((day, index) => {
    const nextBeatId = days[index + 1]?.id ?? null;
    const messages = toMessages(day, npcMap);
    return {
      id: day.id,
      actId: day.phase,
      actTitle: day.phaseLabel,
      title: day.headline,
      narrative: day.narrativeProgression.summary,
      stage: stageFromPhase(day.phase),
      unlockAfterSeconds: Math.max(30, day.unlockConditions.minHoursSincePrevious * 60),
      revealClueIds: day.evidenceDrops.map((artifact) => artifact.id),
      incomingMessages:
        messages.length > 0
          ? messages
          : [
              {
                id: `${day.id}.narrator`,
                senderName: 'Case Dispatch',
                role: 'narrator',
                channel: 'DOCUMENT_DROP',
                text: day.narrativeProgression.summary,
                delaySeconds: 1,
                intensity: 24
              }
            ],
      responseOptions: toResponseOptions(day, nextBeatId),
      defaultNextBeatId: nextBeatId,
      backgroundVisual: `/visuals/stories/${campaign.id}.svg`
    };
  });

  const nodes = [
    ...campaign.threads.map((thread) => ({
      id: thread.id,
      type: 'thread',
      label: thread.title,
      summary: thread.premise
    })),
    ...days.flatMap((day) =>
      day.evidenceDrops.map((artifact) => ({
        id: artifact.id,
        type: 'evidence',
        label: artifact.title,
        summary: artifact.summary
      }))
    )
  ];

  return {
    id: campaign.id,
    title: campaign.title,
    version: `${campaign.version}-web-adapter`,
    hook: campaign.hook,
    tone: campaign.tone,
    subgenre: campaign.subgenre,
    location: campaign.location,
    warnings: campaign.ageWarnings,
    channels: ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL', 'EMAIL', 'VOICE_MESSAGE', 'DOCUMENT_DROP'],
    villain: {
      id: `${campaign.id}-villain`,
      displayName: npcProfiles.find((npc) => npc.role === 'antagonist')?.displayName ?? 'Unknown Antagonist',
      archetype: 'manipulator',
      worldview: 'Truth bends under pressure.',
      motive: 'Control the shape of what can be proven.'
    },
    arcs: campaign.weeklyStructure.map((week) => ({
      id: `${campaign.id}-week-${week.week}`,
      title: week.label,
      stage: `WEEK_${week.week}`,
      summary: week.objective,
      primaryRuleIds: [`week_${week.week}_progression`]
    })),
    beats,
    endings: buildEndings(campaign),
    investigationBoard: {
      nodes: nodes.slice(0, 120),
      links: days.flatMap((day) =>
        day.evidenceDrops
          .filter((artifact) => artifact.threadId.length > 0)
          .map((artifact) => ({
            fromId: artifact.id,
            toId: artifact.threadId,
            relation: 'supports',
            confidence: artifact.reliabilityScore
          }))
      ),
      timeline: days.map((day) => ({
        id: `${day.id}.timeline`,
        timeLabel: `Day ${String(day.day).padStart(2, '0')}`,
        summary: day.narrativeProgression.summary,
        relatedNodeIds: day.evidenceDrops.map((artifact) => artifact.id)
      }))
    },
    playerBriefing: {
      roleTitle: 'Case Analyst',
      callSign: 'Operator',
      recruitmentReason:
        'Selected for anomaly-pattern analysis and controlled communication handling.',
      openingIncident:
        'Synchronized drops across channels triggered a live investigative protocol.',
      personalStakes:
        'Adversarial contact adapts to your choices and attempts to fracture trust chains.',
      firstDirective: 'Preserve chain-of-custody and verify contradictions before escalation.'
    },
    campaignPlan: buildCampaignPlan(campaign),
    npcDossiers: npcProfiles.map((npc): DramaNpcDossier => ({
      id: npc.id,
      displayName: npc.displayName,
      role: npc.role,
      baselineEmotion: npc.baselineEmotion,
      motivations: npc.motivations,
      trustBaseline: npc.trustBaseline,
      trustCeiling: npc.trustCeiling,
      notableSecret: npc.secrets[0]?.summary ?? 'Undisclosed'
    })),
    communityPuzzles: days
      .filter((day) => day.puzzle !== null)
      .slice(0, 4)
      .map((day) => ({
        id: day.puzzle?.id ?? `${day.id}.puzzle`,
        title: day.puzzle?.title ?? `Puzzle ${day.day}`,
        objective: day.puzzle?.objective ?? 'Resolve cross-day contradiction.',
        shards: day.evidenceDrops.slice(0, 3).map((artifact, index) => ({
          id: `${day.id}.shard.${index + 1}`,
          heldBy: artifact.type,
          content: artifact.summary
        })),
        rewardClueId: day.puzzle?.answerValidation.acceptedKeywords[0] ?? 'unknown',
        failureConsequence: day.puzzle?.objective ?? 'Escalation risk rises.',
        solutionKeyword: day.puzzle?.answerValidation.acceptedKeywords[0] ?? 'UNKNOWN'
      })),
    visualDeck: {
      heroImage: `/visuals/stories/${campaign.id}.svg`,
      assets: []
    },
    replayHooks: ['Alternative decisions alter trust and pressure dynamics.'],
    sequelHooks: ['Residual contradiction thread remains unresolved post-campaign.'],
    branchingMoments: campaign.weeklyStructure.map((week) => `${week.label} branch anchor`)
  };
}
