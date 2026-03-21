export interface ArgThread {
  id: string;
  type: string;
  title: string;
  premise: string;
  objective: string;
  anchorClues: string[];
}

export interface ArgCampaignWeek {
  week: number;
  label: string;
  dayRange: [number, number];
  objective: string;
}

export interface ArgCampaignManifest {
  id: string;
  version: string;
  title: string;
  hook: string;
  subgenre: string;
  tone: string;
  location: string;
  ageWarnings: string[];
  durationDays: number;
  weeklyStructure: ArgCampaignWeek[];
  threads: ArgThread[];
  progressionFlags: string[];
  fileManifest?: {
    campaign?: string;
    days?: string[];
    npcProfiles?: string;
  };
}

export interface ArgUnlockCondition {
  flag: string;
  operator: 'exists' | 'equals';
  value?: string | number | boolean;
}

export interface ArgInteraction {
  id: string;
  actorId: string;
  role: string;
  channel: string;
  mode: string;
  messageTemplate: string;
  expectedPlayerActions: string[];
}

export interface ArgArtifact {
  id: string;
  title: string;
  type: string;
  threadId: string;
  sourceNpcId: string;
  misleading: boolean;
  reliabilityScore: number;
  summary: string;
}

export interface ArgPuzzle {
  id: string;
  type: string;
  title: string;
  objective: string;
  answerValidation: {
    mode: string;
    acceptedKeywords: string[];
  };
}

export interface ArgDayPackage {
  id: string;
  storyId: string;
  day: number;
  week: number;
  phase: string;
  phaseLabel: string;
  headline: string;
  unlockConditions: {
    requiredCompletedDays: number[];
    requiredFlags: string[];
    requiredInteractions: string[];
    minHoursSincePrevious: number;
    branchConditions: ArgUnlockCondition[];
  };
  narrativeProgression: {
    summary: string;
    beatAnchorId: string;
    beatAnchorTitle: string;
    beatNarrative: string;
    threatEscalation: string;
    playerInvolvementShift: string;
  };
  threadUpdates: Array<{
    threadId: string;
    status: string;
    update: string;
    clueReference?: string | null;
  }>;
  evidenceDrops: ArgArtifact[];
  interactions: ArgInteraction[];
  puzzle: ArgPuzzle | null;
  distraction: {
    id: string;
    title: string;
    summary: string;
    whyItFeelsPlausible: string;
    hiddenFault: string;
  } | null;
  awarenessMoments: Array<{
    trigger: string;
    lineTemplate: string;
  }>;
  progressionEffectsOnCompletion: {
    setFlags: string[];
    setDecisionPlaceholders: string[];
    unlockNextAfterHours: number;
  };
}

export interface ArgSessionState {
  storyId: string;
  currentDay: number;
  completedDays: number[];
  completedInteractionIds: string[];
  flags: Record<string, string | number | boolean>;
  decisions: Record<string, string>;
  availableDays: number[];
  hoursSinceCampaignStart: number;
}

export interface CompleteDayInput {
  day: ArgDayPackage;
  primaryDecision: string;
  completedInteractionIds: string[];
  elapsedHours: number;
}

function asNumberSet(values: number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function hasRequiredFlag(
  flags: Record<string, string | number | boolean>,
  condition: ArgUnlockCondition
): boolean {
  if (condition.operator === 'exists') {
    return condition.flag in flags;
  }

  if (condition.operator === 'equals') {
    return flags[condition.flag] === condition.value;
  }

  return false;
}

export function createInitialArgSession(campaign: ArgCampaignManifest): ArgSessionState {
  return {
    storyId: campaign.id,
    currentDay: 1,
    completedDays: [],
    completedInteractionIds: [],
    flags: {
      'flag.case_opened': true,
      'flag.main_thread_active': true
    },
    decisions: {},
    availableDays: [1],
    hoursSinceCampaignStart: 0
  };
}

export function isDayUnlocked(day: ArgDayPackage, state: ArgSessionState): boolean {
  const completed = new Set(state.completedDays);
  const interactionIds = new Set(state.completedInteractionIds);

  const priorDaysSatisfied = day.unlockConditions.requiredCompletedDays.every((requiredDay) =>
    completed.has(requiredDay)
  );
  if (!priorDaysSatisfied) {
    return false;
  }

  const requiredFlagsSatisfied = day.unlockConditions.requiredFlags.every(
    (requiredFlag) => state.flags[requiredFlag] === true
  );
  if (!requiredFlagsSatisfied) {
    return false;
  }

  const requiredInteractionsSatisfied = day.unlockConditions.requiredInteractions.every((interactionId) =>
    interactionIds.has(interactionId)
  );
  if (!requiredInteractionsSatisfied) {
    return false;
  }

  const branchSatisfied = day.unlockConditions.branchConditions.every((condition) =>
    hasRequiredFlag(state.flags, condition)
  );
  if (!branchSatisfied) {
    return false;
  }

  if (day.day > 1) {
    const previousDay = day.day - 1;
    const previousCompleteFlag = `flag.day_${String(previousDay).padStart(2, '0')}.complete`;
    if (state.flags[previousCompleteFlag] !== true) {
      return false;
    }
  }

  return true;
}

export function computeAvailableDays(days: ArgDayPackage[], state: ArgSessionState): number[] {
  return asNumberSet(
    days.filter((day) => isDayUnlocked(day, state)).map((day) => day.day)
  );
}

export function completeArgDay(
  campaign: ArgCampaignManifest,
  days: ArgDayPackage[],
  state: ArgSessionState,
  input: CompleteDayInput
): ArgSessionState {
  const dayToken = String(input.day.day).padStart(2, '0');
  const decisionFlag = `decision.day_${dayToken}.primary`;

  const nextFlags: Record<string, string | number | boolean> = {
    ...state.flags,
    [decisionFlag]: input.primaryDecision
  };
  for (const flag of input.day.progressionEffectsOnCompletion.setFlags) {
    nextFlags[flag] = true;
  }
  for (const placeholder of input.day.progressionEffectsOnCompletion.setDecisionPlaceholders) {
    if (!(placeholder in nextFlags)) {
      nextFlags[placeholder] = '';
    }
  }

  const nextState: ArgSessionState = {
    ...state,
    currentDay: Math.min(campaign.durationDays, input.day.day + 1),
    completedDays: asNumberSet([...state.completedDays, input.day.day]),
    completedInteractionIds: Array.from(
      new Set([...state.completedInteractionIds, ...input.completedInteractionIds])
    ),
    flags: nextFlags,
    decisions: {
      ...state.decisions,
      [decisionFlag]: input.primaryDecision
    },
    hoursSinceCampaignStart: Math.max(state.hoursSinceCampaignStart, input.elapsedHours)
  };

  return {
    ...nextState,
    availableDays: computeAvailableDays(days, nextState)
  };
}

export function findDayByNumber(days: ArgDayPackage[], dayNumber: number): ArgDayPackage | undefined {
  return days.find((day) => day.day === dayNumber);
}
