import type { PlayerIntent } from '@myhorrorstory/contracts';

export interface DramaMessage {
  id: string;
  senderName: string;
  role: 'investigator' | 'operator' | 'witness' | 'antagonist' | 'narrator';
  channel: string;
  text: string;
  delaySeconds: number;
  intensity: number;
}

export interface DramaResponseOption {
  id: string;
  label: string;
  intent: PlayerIntent;
  summary: string;
  nextBeatId: string | null;
  progressDelta: number;
  reputationDelta: ReputationState;
  flagUpdates: Record<string, string | number | boolean>;
}

export interface DramaBeat {
  id: string;
  actId: string;
  actTitle: string;
  title: string;
  narrative: string;
  stage: 1 | 2 | 3 | 4;
  unlockAfterSeconds: number;
  revealClueIds: string[];
  incomingMessages: DramaMessage[];
  responseOptions: DramaResponseOption[];
  defaultNextBeatId: string | null;
  backgroundVisual: string;
}

export interface DramaEnding {
  id: string;
  title: string;
  type: 'JUSTICE' | 'PYRRHIC' | 'TRAGIC' | 'CORRUPTION' | 'UNRESOLVED' | 'SECRET';
  summary: string;
  epilogue: string;
  sequelHook: string;
}

export interface DramaPackage {
  id: string;
  title: string;
  version: string;
  hook: string;
  tone: string;
  subgenre: string;
  location: string;
  warnings: string[];
  channels: string[];
  villain: {
    id: string;
    displayName: string;
    archetype: string;
    worldview: string;
    motive: string;
  };
  arcs: Array<{
    id: string;
    title: string;
    stage: string;
    summary: string;
    primaryRuleIds: string[];
  }>;
  beats: DramaBeat[];
  endings: DramaEnding[];
  investigationBoard: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      summary: string;
    }>;
    links: Array<{
      fromId: string;
      toId: string;
      relation: string;
      confidence: number;
    }>;
    timeline: Array<{
      id: string;
      timeLabel: string;
      summary: string;
      relatedNodeIds: string[];
    }>;
  };
  replayHooks: string[];
  sequelHooks: string[];
  branchingMoments: string[];
}

export interface ReputationState {
  trustworthiness: number;
  aggression: number;
  curiosity: number;
  deception: number;
  morality: number;
}

export interface SessionState {
  currentBeatId: string;
  visitedBeatIds: string[];
  discoveredClues: string[];
  reputation: ReputationState;
  flags: Record<string, string | number | boolean>;
  investigationProgress: number;
  selectedResponses: Array<{
    beatId: string;
    optionId: string;
    intent: PlayerIntent;
  }>;
  complete: boolean;
}

export interface SessionAdvanceResult {
  nextState: SessionState;
  nextBeatId: string | null;
}

const REPUTATION_AXES: Array<keyof ReputationState> = [
  'trustworthiness',
  'aggression',
  'curiosity',
  'deception',
  'morality'
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function emptyReputation(): ReputationState {
  return {
    trustworthiness: 0,
    aggression: 0,
    curiosity: 0,
    deception: 0,
    morality: 0
  };
}

export function createInitialSessionState(pack: DramaPackage): SessionState {
  const firstBeat = pack.beats[0];
  if (!firstBeat) {
    throw new Error(`Drama package ${pack.id} has no beats.`);
  }

  return {
    currentBeatId: firstBeat.id,
    visitedBeatIds: [firstBeat.id],
    discoveredClues: [...firstBeat.revealClueIds],
    reputation: emptyReputation(),
    flags: {},
    investigationProgress: clamp(Math.round(100 / Math.max(pack.beats.length, 1)), 5, 20),
    selectedResponses: [],
    complete: false
  };
}

export function beatById(pack: DramaPackage, beatId: string): DramaBeat | undefined {
  return pack.beats.find((beat) => beat.id === beatId);
}

export function applyResponseChoice(
  pack: DramaPackage,
  currentState: SessionState,
  beat: DramaBeat,
  option: DramaResponseOption
): SessionAdvanceResult {
  const nextReputation: ReputationState = {
    ...currentState.reputation
  };
  for (const axis of REPUTATION_AXES) {
    nextReputation[axis] = clamp(nextReputation[axis] + (option.reputationDelta[axis] ?? 0), -100, 100);
  }

  const nextBeatId = option.nextBeatId ?? beat.defaultNextBeatId;
  const discoveredClues = Array.from(new Set([...currentState.discoveredClues, ...beat.revealClueIds]));
  const nextFlags = { ...currentState.flags, ...option.flagUpdates };
  const nextVisited = nextBeatId
    ? Array.from(new Set([...currentState.visitedBeatIds, nextBeatId]))
    : [...currentState.visitedBeatIds];
  const progressFromBeats = (nextVisited.length / Math.max(pack.beats.length, 1)) * 100;
  const progressWithChoice = progressFromBeats + option.progressDelta;
  const complete = !nextBeatId || beatById(pack, nextBeatId) === undefined;

  return {
    nextBeatId,
    nextState: {
      ...currentState,
      currentBeatId: nextBeatId ?? currentState.currentBeatId,
      visitedBeatIds: nextVisited,
      discoveredClues,
      flags: nextFlags,
      reputation: nextReputation,
      investigationProgress: clamp(Math.round(progressWithChoice), 0, 100),
      selectedResponses: [
        ...currentState.selectedResponses,
        {
          beatId: beat.id,
          optionId: option.id,
          intent: option.intent
        }
      ],
      complete
    }
  };
}

function endingByType(pack: DramaPackage, type: DramaEnding['type']): DramaEnding | undefined {
  return pack.endings.find((ending) => ending.type === type);
}

export function resolveSessionEnding(pack: DramaPackage, state: SessionState): DramaEnding {
  const { reputation, investigationProgress } = state;

  if (reputation.morality >= 15 && reputation.trustworthiness >= 5 && investigationProgress >= 80) {
    return endingByType(pack, 'JUSTICE') ?? pack.endings[0]!;
  }

  if (reputation.deception >= 18 || reputation.morality <= -18) {
    return endingByType(pack, 'CORRUPTION') ?? endingByType(pack, 'TRAGIC') ?? pack.endings[0]!;
  }

  if (reputation.aggression >= 22 && investigationProgress >= 65) {
    return endingByType(pack, 'TRAGIC') ?? endingByType(pack, 'PYRRHIC') ?? pack.endings[0]!;
  }

  if (investigationProgress >= 70) {
    return endingByType(pack, 'PYRRHIC') ?? pack.endings[0]!;
  }

  return endingByType(pack, 'UNRESOLVED') ?? pack.endings[0]!;
}

export function sortMessagesForFeed(messages: DramaMessage[]): DramaMessage[] {
  return [...messages].sort((left, right) => left.delaySeconds - right.delaySeconds);
}
