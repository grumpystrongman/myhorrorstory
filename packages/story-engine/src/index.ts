import type {
  PlayerIntent,
  ReputationVector,
  StoryBeat,
  StoryPackage,
  StoryTriggerRule,
  TriggerAction,
  TriggerCondition,
  TriggerPredicate
} from '@myhorrorstory/contracts';

export interface StoryRuntimeState {
  flags: Record<string, string | number | boolean>;
  clues: Set<string>;
  score: number;
  reputation: ReputationVector;
  npcTrust: Record<string, number>;
  npcEmotion: Record<string, string>;
  events: Set<string>;
  alliances: Set<string>;
  unlockedEndings: Set<string>;
  lockedEndings: Set<string>;
  villainStage: 1 | 2 | 3 | 4;
  investigationProgress: number;
  silenceSeconds: number;
  elapsedSeconds: number;
  lastIntent: PlayerIntent | null;
}

export interface TriggerRuntimeContext {
  eventType?: StoryTriggerRule['eventType'];
  nowSeconds?: number;
  activationCounts?: Record<string, number>;
  lastTriggeredAtSeconds?: Record<string, number>;
}

export interface TriggerExecutionResult {
  triggeredRuleIds: string[];
  actions: TriggerAction[];
  nextState: StoryRuntimeState;
}

const REPUTATION_MIN = -100;
const REPUTATION_MAX = 100;

const DEFAULT_REPUTATION: ReputationVector = {
  trustworthiness: 0,
  aggression: 0,
  curiosity: 0,
  deception: 0,
  morality: 0
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cloneState(state: StoryRuntimeState): StoryRuntimeState {
  return {
    flags: { ...state.flags },
    clues: new Set(state.clues),
    score: state.score,
    reputation: { ...state.reputation },
    npcTrust: { ...state.npcTrust },
    npcEmotion: { ...state.npcEmotion },
    events: new Set(state.events),
    alliances: new Set(state.alliances),
    unlockedEndings: new Set(state.unlockedEndings),
    lockedEndings: new Set(state.lockedEndings),
    villainStage: state.villainStage,
    investigationProgress: state.investigationProgress,
    silenceSeconds: state.silenceSeconds,
    elapsedSeconds: state.elapsedSeconds,
    lastIntent: state.lastIntent
  };
}

function checkCondition(
  condition: StoryBeat['requiredConditions'][number],
  state: StoryRuntimeState
): boolean {
  switch (condition.type) {
    case 'FLAG':
      return state.flags[condition.key] === condition.value;
    case 'SCORE_AT_LEAST':
      return state.score >= Number(condition.value);
    case 'HAS_CLUE':
      return state.clues.has(String(condition.value));
    case 'CHOICE_EQUALS':
      return state.flags[condition.key] === condition.value;
    default:
      return false;
  }
}

function resolvePredicateValue(predicate: TriggerPredicate, state: StoryRuntimeState): unknown {
  switch (predicate.source) {
    case 'FLAG':
      return state.flags[predicate.key];
    case 'PLAYER_REPUTATION': {
      if (predicate.key in state.reputation) {
        return state.reputation[predicate.key as keyof ReputationVector];
      }
      return undefined;
    }
    case 'NPC_TRUST':
      return state.npcTrust[predicate.key];
    case 'NPC_EMOTION':
      return state.npcEmotion[predicate.key];
    case 'HAS_CLUE':
      return state.clues.has(predicate.key);
    case 'EVENT_OCCURRED':
      return state.events.has(predicate.key);
    case 'INVESTIGATION_PROGRESS':
      return state.investigationProgress;
    case 'VILLAIN_STAGE':
      return state.villainStage;
    case 'PLAYER_LAST_INTENT':
      return state.lastIntent;
    case 'SILENCE_SECONDS':
      return state.silenceSeconds;
    case 'ELAPSED_SECONDS':
      return state.elapsedSeconds;
    case 'ALLIANCE_WITH_NPC':
      return state.alliances.has(predicate.key);
    case 'ENDING_STATUS': {
      if (predicate.key.startsWith('locked:')) {
        return state.lockedEndings.has(predicate.key.replace('locked:', ''));
      }
      if (predicate.key.startsWith('unlocked:')) {
        return state.unlockedEndings.has(predicate.key.replace('unlocked:', ''));
      }
      return false;
    }
    default:
      return undefined;
  }
}

function comparePredicate(
  left: unknown,
  operator: TriggerPredicate['operator'],
  right: string | number | boolean
): boolean {
  switch (operator) {
    case 'EQ':
      return left === right;
    case 'NEQ':
      return left !== right;
    case 'GT':
      return Number(left) > Number(right);
    case 'GTE':
      return Number(left) >= Number(right);
    case 'LT':
      return Number(left) < Number(right);
    case 'LTE':
      return Number(left) <= Number(right);
    case 'INCLUDES': {
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      if (left instanceof Set) {
        return left.has(right);
      }
      if (typeof left === 'string') {
        return left.includes(String(right));
      }
      return false;
    }
    case 'NOT_INCLUDES': {
      if (Array.isArray(left)) {
        return !left.includes(right);
      }
      if (left instanceof Set) {
        return !left.has(right);
      }
      if (typeof left === 'string') {
        return !left.includes(String(right));
      }
      return true;
    }
    default:
      return false;
  }
}

function evaluatePredicate(predicate: TriggerPredicate, state: StoryRuntimeState): boolean {
  const left = resolvePredicateValue(predicate, state);
  return comparePredicate(left, predicate.operator, predicate.value);
}

export function evaluateTriggerCondition(condition: TriggerCondition, state: StoryRuntimeState): boolean {
  switch (condition.kind) {
    case 'predicate':
      return evaluatePredicate(condition.predicate, state);
    case 'all':
      return condition.conditions.every((item) => evaluateTriggerCondition(item, state));
    case 'any':
      return condition.conditions.some((item) => evaluateTriggerCondition(item, state));
    case 'not':
      return !evaluateTriggerCondition(condition.condition, state);
    default:
      return false;
  }
}

function isRuleInCooldown(
  rule: StoryTriggerRule,
  context: TriggerRuntimeContext | undefined
): boolean {
  if (rule.cooldownSeconds <= 0) {
    return false;
  }

  if (context?.nowSeconds === undefined || !context.lastTriggeredAtSeconds) {
    return false;
  }

  const lastTriggeredAt = context.lastTriggeredAtSeconds[rule.id];
  if (lastTriggeredAt === undefined) {
    return false;
  }

  return context.nowSeconds - lastTriggeredAt < rule.cooldownSeconds;
}

export function shouldTriggerRule(
  rule: StoryTriggerRule,
  state: StoryRuntimeState,
  context?: TriggerRuntimeContext
): boolean {
  if (context?.eventType && rule.eventType !== context.eventType) {
    return false;
  }

  const activationCount = context?.activationCounts?.[rule.id] ?? 0;
  if (activationCount >= rule.maxActivations) {
    return false;
  }

  if (isRuleInCooldown(rule, context)) {
    return false;
  }

  return evaluateTriggerCondition(rule.when, state);
}

export function getTriggeredRules(
  rules: StoryTriggerRule[],
  state: StoryRuntimeState,
  context?: TriggerRuntimeContext
): StoryTriggerRule[] {
  return rules
    .filter((rule) => shouldTriggerRule(rule, state, context))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
}

export function applyTriggerAction(state: StoryRuntimeState, action: TriggerAction): StoryRuntimeState {
  const next = cloneState(state);

  switch (action.type) {
    case 'SEND_MESSAGE':
      next.flags.lastOutboundTemplate = action.templateId;
      next.flags.lastOutboundChannel = action.channel;
      return next;
    case 'UPDATE_REPUTATION':
      next.reputation[action.axis] = clamp(
        next.reputation[action.axis] + action.delta,
        REPUTATION_MIN,
        REPUTATION_MAX
      );
      return next;
    case 'UPDATE_NPC_TRUST': {
      const currentTrust = next.npcTrust[action.npcId] ?? 50;
      next.npcTrust[action.npcId] = clamp(currentTrust + action.delta, 0, 100);
      return next;
    }
    case 'SET_FLAG':
      next.flags[action.key] = action.value;
      return next;
    case 'REVEAL_CLUE':
      next.clues.add(action.clueId);
      return next;
    case 'EMIT_EVENT':
      next.events.add(action.eventId);
      return next;
    case 'START_COUNTDOWN':
      next.flags[`countdown.${action.countdownId}.durationSeconds`] = action.durationSeconds;
      next.flags[`countdown.${action.countdownId}.failureEventId`] = action.failureEventId;
      return next;
    case 'ADVANCE_VILLAIN_STAGE':
      next.villainStage = clamp(action.stage, 1, 4) as 1 | 2 | 3 | 4;
      return next;
    case 'LOCK_ENDING':
      next.lockedEndings.add(action.endingId);
      next.unlockedEndings.delete(action.endingId);
      return next;
    case 'UNLOCK_ENDING':
      next.unlockedEndings.add(action.endingId);
      next.lockedEndings.delete(action.endingId);
      return next;
    default:
      return next;
  }
}

export function applyTriggerActions(state: StoryRuntimeState, actions: TriggerAction[]): StoryRuntimeState {
  return actions.reduce((current, action) => applyTriggerAction(current, action), state);
}

export function evaluateAndApplyRules(
  rules: StoryTriggerRule[],
  state: StoryRuntimeState,
  context?: TriggerRuntimeContext
): TriggerExecutionResult {
  const triggeredRules = getTriggeredRules(rules, state, context);
  const actions = triggeredRules.flatMap((rule) => rule.actions);
  const nextState = applyTriggerActions(state, actions);

  return {
    triggeredRuleIds: triggeredRules.map((rule) => rule.id),
    actions,
    nextState
  };
}

export function createInitialRuntimeState(
  seed?: Partial<
    Omit<
      StoryRuntimeState,
      'clues' | 'events' | 'alliances' | 'unlockedEndings' | 'lockedEndings' | 'reputation'
    >
  > & {
    clues?: Iterable<string>;
    events?: Iterable<string>;
    alliances?: Iterable<string>;
    unlockedEndings?: Iterable<string>;
    lockedEndings?: Iterable<string>;
    reputation?: Partial<ReputationVector>;
  }
): StoryRuntimeState {
  return {
    flags: { ...(seed?.flags ?? {}) },
    clues: new Set(seed?.clues ?? []),
    score: seed?.score ?? 0,
    reputation: {
      ...DEFAULT_REPUTATION,
      ...(seed?.reputation ?? {})
    },
    npcTrust: { ...(seed?.npcTrust ?? {}) },
    npcEmotion: { ...(seed?.npcEmotion ?? {}) },
    events: new Set(seed?.events ?? []),
    alliances: new Set(seed?.alliances ?? []),
    unlockedEndings: new Set(seed?.unlockedEndings ?? []),
    lockedEndings: new Set(seed?.lockedEndings ?? []),
    villainStage: seed?.villainStage ?? 1,
    investigationProgress: seed?.investigationProgress ?? 0,
    silenceSeconds: seed?.silenceSeconds ?? 0,
    elapsedSeconds: seed?.elapsedSeconds ?? 0,
    lastIntent: seed?.lastIntent ?? null
  };
}

export function isBeatUnlocked(beat: StoryBeat, state: StoryRuntimeState): boolean {
  return beat.requiredConditions.every((condition) => checkCondition(condition, state));
}

export function getUnlockedBeats(story: StoryPackage, state: StoryRuntimeState): StoryBeat[] {
  const beats: StoryBeat[] = [];
  for (const act of story.acts) {
    for (const beat of act.beats) {
      if (isBeatUnlocked(beat, state)) {
        beats.push(beat);
      }
    }
  }

  return beats;
}

export function applyChoice(
  state: StoryRuntimeState,
  effects: Record<string, string | number | boolean>
): StoryRuntimeState {
  const next = cloneState(state);

  for (const [key, value] of Object.entries(effects)) {
    if (key === 'scoreDelta' && typeof value === 'number') {
      next.score += value;
      continue;
    }

    next.flags[key] = value;
  }

  return next;
}

export function revealClues(state: StoryRuntimeState, clueIds: string[]): StoryRuntimeState {
  const next = cloneState(state);
  for (const clueId of clueIds) {
    next.clues.add(clueId);
  }

  return next;
}

export * from './narrative-director.js';
