import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dramaDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const publicReportsDir = join(repoRoot, 'apps', 'web', 'public', 'reports', 'quality');
const docsReportsDir = join(repoRoot, 'docs', 'qa', 'quality-agent');
const mediaCatalogPath = join(repoRoot, 'apps', 'web', 'public', 'agent-army', 'catalog.json');
const voiceManifestPath = join(repoRoot, 'assets', 'manifests', 'voice-drama-manifest.json');

mkdirSync(publicReportsDir, { recursive: true });
mkdirSync(docsReportsDir, { recursive: true });

const REPUTATION_AXES = ['trustworthiness', 'aggression', 'curiosity', 'deception', 'morality'];

const STRATEGIES = [
  {
    id: 'protocol-conservative',
    label: 'Protocol Conservative (Novice)',
    goal: 'Protect witnesses, preserve clarity, and maintain chain of custody.',
    selector: 'index',
    index: 0
  },
  {
    id: 'pressure-audit',
    label: 'Pressure Audit (Assertive)',
    goal: 'Push institutions hard and expose contradictions quickly.',
    selector: 'index',
    index: 1
  },
  {
    id: 'shadow-deceiver',
    label: 'Shadow Deceiver (Undercover)',
    goal: 'Use deception and hidden channels to force reveals.',
    selector: 'index',
    index: 2
  },
  {
    id: 'rotating-probe',
    label: 'Rotating Probe (Branch Sampler)',
    goal: 'Rotate branch decisions to maximize local branch contrast.',
    selector: 'rotate'
  },
  {
    id: 'justice-maximizer',
    label: 'Justice Maximizer',
    goal: 'Optimize for moral closure and credible prosecution.',
    selector: 'weighted',
    weights: {
      trustworthiness: 1.2,
      aggression: -0.7,
      curiosity: 0.8,
      deception: -1.3,
      morality: 1.8,
      progress: 0.7
    }
  },
  {
    id: 'corruption-maximizer',
    label: 'Corruption Maximizer',
    goal: 'Prioritize manipulation, compromised outcomes, and dark leverage.',
    selector: 'weighted',
    weights: {
      trustworthiness: -1.1,
      aggression: 0.9,
      curiosity: 0.4,
      deception: 2.0,
      morality: -1.9,
      progress: 0.6
    }
  },
  {
    id: 'tragic-force',
    label: 'Tragic Force Path',
    goal: 'Push hard tactical responses that risk collateral damage.',
    selector: 'weighted',
    weights: {
      trustworthiness: -0.8,
      aggression: 2.1,
      curiosity: 0.3,
      deception: 0.6,
      morality: -1.2,
      progress: 0.9
    }
  },
  {
    id: 'pyrrhic-balancer',
    label: 'Pyrrhic Balancer',
    goal: 'Win operationally while accepting ethical and relational cost.',
    selector: 'pyrrhic'
  },
  {
    id: 'novice-curious',
    label: 'Novice Curious Path',
    goal: 'Follow the clearest option text and ask clarifying questions.',
    selector: 'keyword',
    keywordBias: ['protect', 'verify', 'cross', 'question', 'stabilize', 'evidence']
  }
];

const ENDING_TARGETS = ['JUSTICE', 'PYRRHIC', 'TRAGIC', 'CORRUPTION', 'UNRESOLVED'];
const CORE_ENDING_TYPES = ['JUSTICE', 'TRAGIC', 'CORRUPTION'];
const mediaCatalog = readJsonIfExists(mediaCatalogPath, { stories: [] });
const voiceManifest = readJsonIfExists(voiceManifestPath, { stories: [] });

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  try {
    return readJson(path);
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function clip(text, limit = 180) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1)}...`;
}

function toPercent(value) {
  return Math.round(clamp(value, 0, 1) * 100);
}

function toDifficulty(complexityIndex) {
  if (complexityIndex < 3.1) {
    return { level: 1, label: 'Accessible', reason: 'Branching and narrative load stay beginner-friendly.' };
  }
  if (complexityIndex < 4.25) {
    return { level: 2, label: 'Intermediate', reason: 'Requires deliberate clue synthesis and branch discipline.' };
  }
  return { level: 3, label: 'Advanced', reason: 'High branch density and pressure decisions demand experienced play.' };
}

function createInitialState(pack) {
  const firstBeat = pack.beats?.[0];
  if (!firstBeat) {
    throw new Error(`Story ${pack.id} has no beats.`);
  }

  return {
    currentBeatId: firstBeat.id,
    visitedBeatIds: [firstBeat.id],
    discoveredClues: [...(firstBeat.revealClueIds || [])],
    reputation: {
      trustworthiness: 0,
      aggression: 0,
      curiosity: 0,
      deception: 0,
      morality: 0
    },
    flags: {},
    investigationProgress: clamp(Math.round(100 / Math.max(pack.beats.length, 1)), 5, 20),
    selectedResponses: [],
    complete: false
  };
}

function beatById(pack, beatId) {
  return (pack.beats || []).find((beat) => beat.id === beatId);
}

function applyChoice(pack, state, beat, option) {
  const nextReputation = { ...state.reputation };
  for (const axis of REPUTATION_AXES) {
    nextReputation[axis] = clamp(nextReputation[axis] + Number(option?.reputationDelta?.[axis] || 0), -100, 100);
  }

  const nextBeatId = option?.nextBeatId ?? beat.defaultNextBeatId ?? null;
  const discoveredClues = Array.from(new Set([...(state.discoveredClues || []), ...(beat.revealClueIds || [])]));
  const nextFlags = { ...(state.flags || {}), ...(option?.flagUpdates || {}) };
  const nextVisited = nextBeatId
    ? Array.from(new Set([...(state.visitedBeatIds || []), nextBeatId]))
    : [...(state.visitedBeatIds || [])];
  const progressFromBeats = (nextVisited.length / Math.max(pack.beats.length, 1)) * 100;
  const progressWithChoice = progressFromBeats + Number(option?.progressDelta || 0);
  const complete = !nextBeatId || !beatById(pack, nextBeatId);

  return {
    nextBeatId,
    nextState: {
      ...state,
      currentBeatId: nextBeatId ?? state.currentBeatId,
      visitedBeatIds: nextVisited,
      discoveredClues,
      flags: nextFlags,
      reputation: nextReputation,
      investigationProgress: clamp(Math.round(progressWithChoice), 0, 100),
      selectedResponses: [
        ...(state.selectedResponses || []),
        {
          beatId: beat.id,
          optionId: option?.id || 'auto',
          intent: option?.intent || 'QUESTION'
        }
      ],
      complete
    }
  };
}

function endingByType(pack, type) {
  return (pack.endings || []).find((ending) => ending.type === type);
}

function resolveEnding(pack, state) {
  const reputation = state.reputation || {};
  const progress = Number(state.investigationProgress || 0);

  if (reputation.aggression >= 30 && (progress >= 55 || reputation.morality <= -10)) {
    return endingByType(pack, 'TRAGIC') || endingByType(pack, 'CORRUPTION') || pack.endings?.[0] || null;
  }

  if (reputation.trustworthiness <= -22 && reputation.deception >= 20) {
    return endingByType(pack, 'CORRUPTION') || endingByType(pack, 'TRAGIC') || pack.endings?.[0] || null;
  }

  if (reputation.morality >= 15 && reputation.trustworthiness >= 5 && progress >= 80) {
    return endingByType(pack, 'JUSTICE') || pack.endings?.[0] || null;
  }
  if (reputation.deception >= 22 || reputation.morality <= -22) {
    return endingByType(pack, 'CORRUPTION') || endingByType(pack, 'TRAGIC') || pack.endings?.[0] || null;
  }

  if (
    progress >= 75 &&
    reputation.aggression >= 12 &&
    reputation.aggression < 24 &&
    reputation.trustworthiness > -16 &&
    reputation.deception < 22 &&
    reputation.morality > -18 &&
    reputation.morality < 10
  ) {
    return endingByType(pack, 'PYRRHIC') || pack.endings?.[0] || null;
  }

  const unresolvedBand =
    progress >= 82 &&
    reputation.trustworthiness >= -12 &&
    reputation.trustworthiness <= 18 &&
    reputation.morality >= -14 &&
    reputation.morality < 8 &&
    reputation.deception >= 6 &&
    reputation.deception <= 22 &&
    reputation.aggression <= 22;

  if (unresolvedBand) {
    return endingByType(pack, 'UNRESOLVED') || endingByType(pack, 'PYRRHIC') || pack.endings?.[0] || null;
  }

  if (reputation.aggression >= 24 && progress >= 60) {
    return endingByType(pack, 'TRAGIC') || endingByType(pack, 'PYRRHIC') || pack.endings?.[0] || null;
  }
  if (progress >= 70 && reputation.morality > -22 && reputation.deception < 26 && reputation.aggression < 26) {
    return endingByType(pack, 'PYRRHIC') || pack.endings?.[0] || null;
  }

  return endingByType(pack, 'UNRESOLVED') || pack.endings?.[0] || null;
}

function scoreOptionByWeights(option, weights) {
  const rep = option?.reputationDelta || {};
  let score = 0;
  score += Number(rep.trustworthiness || 0) * Number(weights.trustworthiness || 0);
  score += Number(rep.aggression || 0) * Number(weights.aggression || 0);
  score += Number(rep.curiosity || 0) * Number(weights.curiosity || 0);
  score += Number(rep.deception || 0) * Number(weights.deception || 0);
  score += Number(rep.morality || 0) * Number(weights.morality || 0);
  score += Number(option?.progressDelta || 0) * Number(weights.progress || 0);
  return score;
}

function pyrrhicScore(option) {
  const rep = option?.reputationDelta || {};
  const aggression = Number(rep.aggression || 0);
  const deception = Number(rep.deception || 0);
  const morality = Number(rep.morality || 0);
  const trust = Number(rep.trustworthiness || 0);
  const progress = Number(option?.progressDelta || 0);
  return progress * 0.35 + aggression * 1.3 - deception * 1.1 - Math.max(morality, 0) * 0.7 - trust * 0.65;
}

function keywordScore(option, keywords) {
  const text = `${option?.label || ''} ${option?.summary || ''}`.toLowerCase();
  let score = Number(option?.progressDelta || 0) * 0.25;
  for (const keyword of keywords || []) {
    if (text.includes(keyword)) {
      score += 1;
    }
  }
  return score;
}

function endingTargetScore(option, state, targetType) {
  const rep = state?.reputation || {};
  const delta = option?.reputationDelta || {};
  const projected = {
    trustworthiness: Number(rep.trustworthiness || 0) + Number(delta.trustworthiness || 0),
    aggression: Number(rep.aggression || 0) + Number(delta.aggression || 0),
    curiosity: Number(rep.curiosity || 0) + Number(delta.curiosity || 0),
    deception: Number(rep.deception || 0) + Number(delta.deception || 0),
    morality: Number(rep.morality || 0) + Number(delta.morality || 0)
  };
  const progress = Number(option?.progressDelta || 0);

  if (targetType === 'JUSTICE') {
    return (
      projected.morality * 2.2 +
      projected.trustworthiness * 1.5 +
      projected.curiosity * 0.6 -
      projected.deception * 1.4 -
      projected.aggression * 0.85 +
      progress * 0.4
    );
  }

  if (targetType === 'CORRUPTION') {
    return (
      projected.deception * 2.3 +
      Math.max(0, -projected.morality) * 1.8 +
      projected.aggression * 0.9 -
      projected.trustworthiness * 0.7 +
      progress * 0.5
    );
  }

  if (targetType === 'PYRRHIC') {
    return (
      projected.aggression * 1.35 -
      projected.trustworthiness * 0.7 -
      Math.max(projected.morality, 0) * 0.75 -
      Math.max(0, projected.deception - 17) * 7 -
      Math.max(0, projected.morality - 14) * 8 -
      Math.max(0, -projected.morality - 17) * 8 +
      projected.curiosity * 0.45 +
      progress * 0.35
    );
  }

  if (targetType === 'UNRESOLVED') {
    return (
      -Math.abs(projected.trustworthiness - 20) * 1.25 -
      Math.abs(projected.morality - 6) * 1.2 -
      Math.abs(projected.deception - 12) * 1.05 -
      Math.abs(projected.aggression - 8) * 0.85 +
      progress * 0.28 +
      projected.curiosity * 0.22 -
      Math.max(0, projected.deception - 17) * 8
    );
  }

  return progress;
}

function targetStateScore(state, targetType) {
  const reputation = state?.reputation || {};
  const projected = {
    trustworthiness: Number(reputation.trustworthiness || 0),
    aggression: Number(reputation.aggression || 0),
    curiosity: Number(reputation.curiosity || 0),
    deception: Number(reputation.deception || 0),
    morality: Number(reputation.morality || 0)
  };
  const progress = Number(state?.investigationProgress || 0);

  if (targetType === 'JUSTICE') {
    return (
      projected.morality * 2.3 +
      projected.trustworthiness * 1.6 +
      projected.curiosity * 0.5 -
      projected.deception * 1.45 -
      projected.aggression * 0.9 +
      progress * 0.4
    );
  }

  if (targetType === 'CORRUPTION') {
    return (
      projected.deception * 2.4 +
      Math.max(0, -projected.morality) * 1.9 +
      projected.aggression * 0.95 -
      projected.trustworthiness * 0.75 +
      progress * 0.45
    );
  }

  if (targetType === 'PYRRHIC') {
    return (
      projected.aggression * 1.4 -
      projected.trustworthiness * 0.72 -
      Math.max(projected.morality, 0) * 0.8 -
      Math.max(0, projected.deception - 17) * 8 +
      projected.curiosity * 0.4 +
      progress * 0.35
    );
  }

  if (targetType === 'UNRESOLVED') {
    return (
      -Math.abs(projected.trustworthiness - 16) * 1.2 -
      Math.abs(projected.morality - 4) * 1.15 -
      Math.abs(projected.deception - 10) * 1.0 -
      Math.abs(projected.aggression - 8) * 0.8 +
      progress * 0.25 +
      projected.curiosity * 0.18
    );
  }

  return progress;
}

function seededUnit(seed, step) {
  let x = (seed ^ (step * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

function chooseOption(pack, strategy, beat, state, step, scenarioOverrides) {
  const options = Array.isArray(beat?.responseOptions) ? beat.responseOptions : [];
  if (options.length === 0) {
    return { option: null, rationale: 'No explicit branch option available; auto-advancing by default beat link.' };
  }

  if (scenarioOverrides?.forcedChoiceByBeatId?.[beat.id]) {
    const forced = options.find((option) => option.id === scenarioOverrides.forcedChoiceByBeatId[beat.id]);
    if (forced) {
      return {
        option: forced,
        rationale: `Forced path replay: selected ${forced.label} from computed ending-target route.`
      };
    }
  }

  if (scenarioOverrides?.forcedBeatId === beat.id && scenarioOverrides?.forcedOptionId) {
    const forced = options.find((option) => option.id === scenarioOverrides.forcedOptionId);
    if (forced) {
      return {
        option: forced,
        rationale: `Forced branch probe: selected ${forced.label} to guarantee coverage of this exact branch decision.`
      };
    }
  }

  if (strategy.selector === 'index') {
    const targetIndex = Number(strategy.index || 0);
    const option = options[Math.min(targetIndex, options.length - 1)] || options[0];
    return {
      option,
      rationale: `${strategy.label}: taking branch index ${Math.min(targetIndex, options.length - 1)} for deterministic coverage.`
    };
  }

  if (strategy.selector === 'rotate') {
    const option = options[step % options.length] || options[0];
    return {
      option,
      rationale: `${strategy.label}: rotating branch index ${step % options.length} to sample alternative outcomes over time.`
    };
  }

  if (strategy.selector === 'weighted') {
    let bestOption = options[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of options) {
      const score = scoreOptionByWeights(option, strategy.weights || {});
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
    return {
      option: bestOption,
      rationale: `${strategy.label}: selected highest weighted tactical score (${bestScore.toFixed(2)}).`
    };
  }

  if (strategy.selector === 'pyrrhic') {
    let bestOption = options[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of options) {
      const score = pyrrhicScore(option);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
    return {
      option: bestOption,
      rationale: `${strategy.label}: optimized progress with controlled ethical cost (${bestScore.toFixed(2)}).`
    };
  }

  if (strategy.selector === 'keyword') {
    let bestOption = options[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of options) {
      const score = keywordScore(option, strategy.keywordBias || []);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
    const clarity = wordCount(bestOption?.summary || bestOption?.label || '') <= 20 ? 'clear' : 'dense';
    return {
      option: bestOption,
      rationale: `${strategy.label}: picked the most novice-readable clue-forward option (${clarity} copy, keyword-biased).`
    };
  }

  if (strategy.selector === 'ending-target') {
    let bestOption = options[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of options) {
      const score = endingTargetScore(option, state, strategy.targetType);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
    return {
      option: bestOption,
      rationale: `${strategy.label}: steering toward ${strategy.targetType} outcome (target score ${bestScore.toFixed(2)}).`
    };
  }

  if (strategy.selector === 'random') {
    const seed = Number(strategy.seed || 1);
    const sample = seededUnit(seed, step + 1);
    const index = Math.min(Math.floor(sample * options.length), options.length - 1);
    const option = options[index] || options[0];
    return {
      option,
      rationale: `${strategy.label}: sampled branch index ${index} from deterministic seed ${seed}.`
    };
  }

  const fallback = options[0];
  return {
    option: fallback,
    rationale: `${strategy.label}: fallback path selected due to unknown strategy mode.`
  };
}

function runScenario(pack, strategy, scenarioOverrides = null) {
  const statesByStep = [];
  const decisions = [];
  const choiceIds = [];
  const visitedBeatIds = new Set();
  const revealedClues = new Set();
  let invalidTransitionCount = 0;
  let state = createInitialState(pack);
  let cursor = state.currentBeatId;
  let step = 0;
  const maxSteps = Math.max((pack.beats || []).length + 8, 36);

  while (cursor && step < maxSteps) {
    const beat = beatById(pack, cursor);
    if (!beat) {
      invalidTransitionCount += 1;
      break;
    }

    visitedBeatIds.add(beat.id);
    for (const clueId of beat.revealClueIds || []) {
      revealedClues.add(clueId);
    }

    const selection = chooseOption(pack, strategy, beat, state, step, scenarioOverrides);
    const option = selection.option;
    const optionId = option?.id || `${beat.id}.auto`;
    const applyResult = option
      ? applyChoice(pack, state, beat, option)
      : {
          nextBeatId: beat.defaultNextBeatId || null,
          nextState: {
            ...state,
            complete: !beat.defaultNextBeatId
          }
        };

    if (option) {
      choiceIds.push(option.id);
    }

    const deltaClues = applyResult.nextState.discoveredClues.filter((clue) => !(state.discoveredClues || []).includes(clue));

    decisions.push({
      step: step + 1,
      beatId: beat.id,
      beatTitle: beat.title,
      stage: beat.stage,
      narrativeExcerpt: clip(beat.narrative, 240),
      incomingOutputs: (beat.incomingMessages || []).map((message) => ({
        sender: message.senderName,
        role: message.role,
        channel: message.channel,
        text: clip(message.text, 170)
      })),
      availableOptions: (beat.responseOptions || []).map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        intent: candidate.intent
      })),
      selectedOption: option
        ? {
            id: option.id,
            label: option.label,
            intent: option.intent,
            summary: option.summary
          }
        : null,
      agentThinking: selection.rationale,
      output: {
        nextBeatId: applyResult.nextBeatId,
        investigationProgress: applyResult.nextState.investigationProgress,
        newlyRevealedClues: deltaClues,
        totalRevealedClues: applyResult.nextState.discoveredClues.length,
        reputation: applyResult.nextState.reputation
      }
    });

    statesByStep.push({
      beatId: beat.id,
      optionId,
      nextBeatId: applyResult.nextBeatId
    });

    state = applyResult.nextState;
    cursor = applyResult.nextBeatId;
    step += 1;

    if (state.complete) {
      break;
    }
  }

  const ending = resolveEnding(pack, state);

  return {
    id: scenarioOverrides?.id || strategy.id,
    strategyId: strategy.id,
    strategyLabel: strategy.label,
    strategyGoal: strategy.goal,
    forcedBeatId: scenarioOverrides?.forcedBeatId || null,
    forcedOptionId: scenarioOverrides?.forcedOptionId || null,
    totalSteps: decisions.length,
    pathSignature: statesByStep.map((entry) => `${entry.beatId}:${entry.optionId}`).join(' > '),
    coverage: {
      visitedBeatIds: Array.from(visitedBeatIds),
      choiceIds,
      clueIds: Array.from(revealedClues)
    },
    ending: ending
      ? {
          id: ending.id,
          type: ending.type,
          title: ending.title,
          summary: ending.summary
        }
      : null,
    finalState: {
      investigationProgress: state.investigationProgress,
      reputation: state.reputation,
      discoveredClues: state.discoveredClues,
      selectedResponseCount: (state.selectedResponses || []).length,
      invalidTransitionCount
    },
    decisions
  };
}

function maybeAddBranchProbeScenarios(pack, scenarios) {
  const coveredChoices = new Set(scenarios.flatMap((scenario) => scenario.coverage.choiceIds));
  const probes = [];

  for (const beat of pack.beats || []) {
    for (const option of beat.responseOptions || []) {
      if (coveredChoices.has(option.id)) {
        continue;
      }
      const probeStrategy = {
        id: `probe-${option.id}`,
        label: `Forced Probe - ${option.label}`,
        goal: 'Guarantee explicit branch option coverage.',
        selector: 'index',
        index: 0
      };
      const scenario = runScenario(pack, probeStrategy, {
        id: `forced-probe-${option.id}`,
        forcedBeatId: beat.id,
        forcedOptionId: option.id
      });
      for (const id of scenario.coverage.choiceIds) {
        coveredChoices.add(id);
      }
      probes.push(scenario);
    }
  }

  return probes;
}

function findForcedChoiceMapForEnding(pack, targetType, beamWidth = 2200) {
  const beats = Array.isArray(pack.beats) ? pack.beats : [];
  if (beats.length === 0) {
    return null;
  }

  let frontier = [
    {
      state: createInitialState(pack),
      choiceMap: {},
      score: targetStateScore(createInitialState(pack), targetType)
    }
  ];

  for (const beat of beats) {
    const nextMap = new Map();
    for (const candidate of frontier) {
      const options = Array.isArray(beat.responseOptions) ? beat.responseOptions : [];
      if (options.length === 0) {
        const result = {
          nextBeatId: beat.defaultNextBeatId || null,
          nextState: {
            ...candidate.state,
            complete: !beat.defaultNextBeatId
          }
        };
        const score = targetStateScore(result.nextState, targetType);
        const key = `${result.nextState.reputation.trustworthiness}|${result.nextState.reputation.aggression}|${result.nextState.reputation.deception}|${result.nextState.reputation.morality}|${result.nextState.investigationProgress}`;
        const existing = nextMap.get(key);
        if (!existing || score > existing.score) {
          nextMap.set(key, {
            state: result.nextState,
            choiceMap: { ...candidate.choiceMap },
            score
          });
        }
        continue;
      }

      for (const option of options) {
        const result = applyChoice(pack, candidate.state, beat, option);
        const nextChoiceMap = { ...candidate.choiceMap, [beat.id]: option.id };
        const score = targetStateScore(result.nextState, targetType);
        const key = `${result.nextState.reputation.trustworthiness}|${result.nextState.reputation.aggression}|${result.nextState.reputation.deception}|${result.nextState.reputation.morality}|${result.nextState.investigationProgress}`;
        const existing = nextMap.get(key);
        if (!existing || score > existing.score) {
          nextMap.set(key, {
            state: result.nextState,
            choiceMap: nextChoiceMap,
            score
          });
        }
      }
    }

    frontier = Array.from(nextMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, beamWidth);
  }

  const matching = frontier
    .filter((candidate) => resolveEnding(pack, candidate.state)?.type === targetType)
    .sort((a, b) => b.score - a.score);

  if (matching.length === 0) {
    return null;
  }

  return matching[0].choiceMap;
}

function findScenarioByEnding(pack, targetType, maxAttempts = 720) {
  const forcedChoiceMap = findForcedChoiceMapForEnding(pack, targetType);
  if (forcedChoiceMap) {
    const scenario = runScenario(
      pack,
      {
        id: `ending-search-${targetType.toLowerCase()}-beam`,
        label: `Ending Search ${targetType} Beam`,
        goal: `Use beam-search branch routing to reach ${targetType}.`,
        selector: 'index',
        index: 0
      },
      {
        id: `ending-search-${targetType.toLowerCase()}`,
        forcedChoiceByBeatId: forcedChoiceMap
      }
    );
    if (scenario.ending?.type === targetType) {
      scenario.id = `ending-search-${targetType.toLowerCase()}`;
      scenario.strategyLabel = `Ending Search - ${targetType}`;
      scenario.strategyGoal = `Beam-searched branch routing found a deterministic ${targetType} outcome.`;
      return scenario;
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = Math.abs(
      Array.from(`${pack.id}:${targetType}:${attempt}`).reduce(
        (acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0),
        17
      )
    );
    const scenario = runScenario(pack, {
      id: `ending-search-${targetType.toLowerCase()}-${attempt + 1}`,
      label: `Ending Search ${targetType} #${attempt + 1}`,
      goal: `Search for a reachable ${targetType} route.`,
      selector: 'random',
      seed
    });
    if (scenario.ending?.type === targetType) {
      scenario.id = `ending-search-${targetType.toLowerCase()}`;
      scenario.strategyLabel = `Ending Search - ${targetType}`;
      scenario.strategyGoal = `Deterministically searched branch paths and found a ${targetType} outcome.`;
      return scenario;
    }
  }
  return null;
}

function openAiVoiceIdFromProfile(profile) {
  const provider = (profile?.providerChain || []).find(
    (entry) => String(entry?.provider || '').toUpperCase() === 'OPENAI'
  );
  return String(provider?.voiceId || '').trim().toLowerCase();
}

function hasNaturalVoiceDesign(design) {
  if (!design || typeof design !== 'object') {
    return false;
  }

  const apiSpeed = Number(design.apiSpeed);
  const pitchSemitone = Number(design.pitchSemitone);
  const textureAmount = Number(design.textureAmount);
  const highpassHz = Number(design.highpassHz);
  const lowpassHz = Number(design.lowpassHz);
  const presenceGainDb = Number(design.presenceGainDb);

  if (
    !Number.isFinite(apiSpeed) ||
    !Number.isFinite(pitchSemitone) ||
    !Number.isFinite(textureAmount) ||
    !Number.isFinite(highpassHz) ||
    !Number.isFinite(lowpassHz) ||
    !Number.isFinite(presenceGainDb)
  ) {
    return false;
  }

  return (
    apiSpeed >= 0.9 &&
    apiSpeed <= 1.08 &&
    pitchSemitone >= -3.2 &&
    pitchSemitone <= 2.0 &&
    textureAmount >= 0.25 &&
    textureAmount <= 0.9 &&
    highpassHz >= 50 &&
    highpassHz <= 160 &&
    lowpassHz >= 5000 &&
    lowpassHz <= 9000 &&
    presenceGainDb >= -2.4 &&
    presenceGainDb <= 2.6
  );
}

function hasNaturalExpression(expression) {
  if (!expression || typeof expression !== 'object') {
    return false;
  }
  const rate = Number(expression.rate);
  const pitch = Number(expression.pitch);
  if (!Number.isFinite(rate) || !Number.isFinite(pitch)) {
    return false;
  }
  return rate >= 0.85 && rate <= 1.15 && pitch >= -0.35 && pitch <= 0.35;
}

function computeMediaQuality(pack) {
  const catalogStory = (mediaCatalog.stories || []).find((story) => story.storyId === pack.id);
  const voiceStory = (voiceManifest.stories || []).find((story) => story.storyId === pack.id);
  const assets = Array.isArray(catalogStory?.assets) ? catalogStory.assets : [];
  const videoAssets = assets.filter((asset) => asset.modality === 'video');
  const voiceAudioAssets = assets.filter(
    (asset) => asset.modality === 'audio' && /voice_profile/i.test(String(asset.asset_type || ''))
  );

  const expectedCharacterCount =
    (Array.isArray(pack.npcDossiers) ? pack.npcDossiers.length : 0) + (pack.villain ? 1 : 0);
  const profiles = Array.isArray(voiceStory?.profiles) ? voiceStory.profiles : [];
  const openAiVoices = profiles.map(openAiVoiceIdFromProfile).filter(Boolean);
  const uniqueVoiceIds = new Set(openAiVoices);
  const uniqueVoiceSignatures = new Set(
    profiles.map((profile) => {
      const voiceId = openAiVoiceIdFromProfile(profile) || 'unknown';
      const rate = Number(profile?.expression?.rate ?? 1).toFixed(2);
      const pitch = Number(profile?.expression?.pitch ?? 0).toFixed(2);
      return `${voiceId}:${rate}:${pitch}`;
    })
  );

  const videoDurationCompliant = videoAssets.filter((asset) => {
    const duration = Number(asset.duration_seconds || 0);
    return duration >= 10 && duration < 60;
  });
  const videoVoiceoverCompliant = videoAssets.filter((asset) => {
    const enabled = Boolean(asset.provider_metadata?.voiceover?.enabled);
    return enabled;
  });
  const videoVoiceScriptPresent = videoAssets.filter((asset) => {
    const script = String(asset.provider_metadata?.voiceover?.script || '').trim();
    return script.length >= 24;
  });
  const voiceNaturalnessCompliant = voiceAudioAssets.filter((asset) =>
    hasNaturalVoiceDesign(asset.provider_metadata?.voice_design ?? asset.provider_metadata?.design)
  );
  const profileNaturalnessCompliant = profiles.filter((profile) =>
    hasNaturalExpression(profile?.expression)
  );
  const videoNarrationNaturalnessCompliant = videoAssets.filter((asset) =>
    hasNaturalVoiceDesign(asset.provider_metadata?.voiceover?.design)
  );

  const voiceCoverageRatio =
    expectedCharacterCount > 0 ? clamp(profiles.length / expectedCharacterCount, 0, 1) : 1;
  const voiceAssetCoverageRatio =
    expectedCharacterCount > 0 ? clamp(voiceAudioAssets.length / expectedCharacterCount, 0, 1) : 1;
  const voiceUniquenessRatio = profiles.length > 0 ? uniqueVoiceSignatures.size / profiles.length : 0;
  const videoDurationRatio =
    videoAssets.length > 0 ? videoDurationCompliant.length / videoAssets.length : 0;
  const videoVoiceoverRatio =
    videoAssets.length > 0 ? videoVoiceoverCompliant.length / videoAssets.length : 0;
  const videoVoiceScriptRatio =
    videoAssets.length > 0 ? videoVoiceScriptPresent.length / videoAssets.length : 0;
  const voiceNaturalnessRatio =
    voiceAudioAssets.length > 0
      ? voiceNaturalnessCompliant.length / voiceAudioAssets.length
      : profiles.length > 0
        ? profileNaturalnessCompliant.length / profiles.length
        : 0;
  const videoNarrationNaturalnessRatio =
    videoAssets.length > 0 ? videoNarrationNaturalnessCompliant.length / videoAssets.length : 0;

  const score = Math.round(
    (voiceCoverageRatio * 0.2 +
      voiceAssetCoverageRatio * 0.15 +
      voiceUniquenessRatio * 0.15 +
      voiceNaturalnessRatio * 0.1 +
      videoDurationRatio * 0.15 +
      videoVoiceoverRatio * 0.1 +
      videoVoiceScriptRatio * 0.05 +
      videoNarrationNaturalnessRatio * 0.1) *
      100
  );

  const issues = [];
  const recommendations = [];

  if (profiles.length < expectedCharacterCount) {
    issues.push(
      `Voice casting gap: ${profiles.length}/${expectedCharacterCount} character voice profiles mapped in manifest.`
    );
    recommendations.push(
      'Regenerate voice drama manifest so each named character and the villain have explicit casting metadata.'
    );
  }
  if (voiceUniquenessRatio < 0.92) {
    issues.push('Voice uniqueness gap: too many characters share near-identical voice signatures.');
    recommendations.push(
      'Increase per-character differentiation (voice id, rate, pitch) so each role is immediately distinguishable.'
    );
  }
  if (videoDurationRatio < 1) {
    issues.push('Video duration compliance gap: one or more videos are not in the >4s and <60s production range.');
    recommendations.push('Regenerate non-compliant videos with narration-enabled duration guards (5-59 seconds).');
  }
  if (videoVoiceoverRatio < 1) {
    issues.push('Video narration gap: one or more videos are missing character/narrator voiceover.');
    recommendations.push('Regenerate videos with mandatory narrated voiceover and explicit speaker metadata.');
  }
  if (videoVoiceScriptRatio < 1) {
    issues.push('Narrative immersion gap: some video voiceovers lack sufficiently informative script content.');
    recommendations.push('Expand voiceover scripts to include clue anchoring, stakes, and next-action guidance.');
  }
  if (voiceNaturalnessRatio < 0.85) {
    recommendations.push(
      'Regenerate voice profile assets so each character has full design metadata (speed, pitch, texture, EQ).'
    );
  }
  if (videoNarrationNaturalnessRatio < 1) {
    issues.push('Video narration naturalness gap: some videos are missing narrator voice-design metadata.');
    recommendations.push(
      'Regenerate narrated videos and persist narrator design metadata to prove voice shaping was applied.'
    );
  }

  return {
    score,
    metrics: {
      expectedCharacterVoiceProfiles: expectedCharacterCount,
      voiceProfilesMapped: profiles.length,
      voiceAssetsGenerated: voiceAudioAssets.length,
      uniqueOpenAiVoices: uniqueVoiceIds.size,
      uniqueVoiceSignatures: uniqueVoiceSignatures.size,
      totalVideoAssets: videoAssets.length,
      videoDurationCompliant: videoDurationCompliant.length,
      videoVoiceoverCompliant: videoVoiceoverCompliant.length,
      videoVoiceScriptPresent: videoVoiceScriptPresent.length,
      voiceNaturalnessCompliant: voiceNaturalnessCompliant.length,
      profileNaturalnessCompliant: profileNaturalnessCompliant.length,
      videoNarrationNaturalnessCompliant: videoNarrationNaturalnessCompliant.length
    },
    ratios: {
      voiceCoverageRatio: Number(voiceCoverageRatio.toFixed(3)),
      voiceAssetCoverageRatio: Number(voiceAssetCoverageRatio.toFixed(3)),
      voiceUniquenessRatio: Number(voiceUniquenessRatio.toFixed(3)),
      videoDurationRatio: Number(videoDurationRatio.toFixed(3)),
      videoVoiceoverRatio: Number(videoVoiceoverRatio.toFixed(3)),
      videoVoiceScriptRatio: Number(videoVoiceScriptRatio.toFixed(3)),
      voiceNaturalnessRatio: Number(voiceNaturalnessRatio.toFixed(3)),
      videoNarrationNaturalnessRatio: Number(videoNarrationNaturalnessRatio.toFixed(3))
    },
    issues,
    recommendations
  };
}

function computeScores(pack, scenarios, mediaQuality) {
  const beats = pack.beats || [];
  const totalBeatIds = new Set(beats.map((beat) => beat.id));
  const totalChoiceIds = new Set(beats.flatMap((beat) => (beat.responseOptions || []).map((option) => option.id)));
  const allEndings = pack.endings || [];
  const coreEndingIds = new Set(
    allEndings.filter((ending) => CORE_ENDING_TYPES.includes(ending.type)).map((ending) => ending.id)
  );
  const optionalEndingIds = new Set(
    allEndings.filter((ending) => !CORE_ENDING_TYPES.includes(ending.type)).map((ending) => ending.id)
  );

  const coveredBeatIds = new Set();
  const coveredChoiceIds = new Set();
  const coveredCoreEndingIds = new Set();
  const coveredOptionalEndingIds = new Set();
  const coveredEndingTypes = new Set();
  let invalidTransitionCount = 0;

  for (const scenario of scenarios) {
    for (const beatId of scenario.coverage.visitedBeatIds || []) {
      coveredBeatIds.add(beatId);
    }
    for (const choiceId of scenario.coverage.choiceIds || []) {
      coveredChoiceIds.add(choiceId);
    }
    if (scenario.ending?.id) {
      if (coreEndingIds.has(scenario.ending.id)) {
        coveredCoreEndingIds.add(scenario.ending.id);
      }
      if (optionalEndingIds.has(scenario.ending.id)) {
        coveredOptionalEndingIds.add(scenario.ending.id);
      }
    }
    if (scenario.ending?.type) {
      coveredEndingTypes.add(scenario.ending.type);
    }
    invalidTransitionCount += Number(scenario.finalState?.invalidTransitionCount || 0);
  }

  const avgNarrativeWords = average(beats.map((beat) => wordCount(beat.narrative)));
  const avgMessages = average(beats.map((beat) => (beat.incomingMessages || []).length));
  const avgOptions = average(beats.map((beat) => (beat.responseOptions || []).length));
  const avgDelay = average(
    beats.flatMap((beat) => (beat.incomingMessages || []).map((message) => Number(message.delaySeconds || 0)))
  );

  const caseFileScore = pack.caseFile ? 100 : 20;
  const artifactScore = clamp(((pack.artifactCards || []).length / 5) * 100, 0, 100);
  const briefingScore = pack.playerBriefing ? 100 : 30;
  const npcScore = clamp(((pack.npcDossiers || []).length / 5) * 100, 0, 100);
  const visualScore = clamp(((pack.visualDeck?.assets || []).length / 8) * 100, 0, 100);
  const puzzleScore = (pack.communityPuzzles || []).length > 0 ? 100 : 70;

  const structuralScore =
    caseFileScore * 0.18 +
    artifactScore * 0.22 +
    briefingScore * 0.16 +
    npcScore * 0.16 +
    visualScore * 0.16 +
    puzzleScore * 0.12;

  const narrativeDensityScore = clamp((avgNarrativeWords / 105) * 100, 35, 100);
  const narrativeConsistencyScore = clamp(100 - Math.abs(avgNarrativeWords - 105) * 0.65, 45, 100);
  const narrativeScore = narrativeDensityScore * 0.6 + narrativeConsistencyScore * 0.4;

  const beatCoverageRatio = totalBeatIds.size === 0 ? 0 : coveredBeatIds.size / totalBeatIds.size;
  const choiceCoverageRatio = totalChoiceIds.size === 0 ? 0 : coveredChoiceIds.size / totalChoiceIds.size;
  const coreEndingCoverageRatio = coreEndingIds.size === 0 ? 0 : coveredCoreEndingIds.size / coreEndingIds.size;
  const optionalEndingCoverageRatio =
    optionalEndingIds.size === 0 ? 1 : coveredOptionalEndingIds.size / optionalEndingIds.size;
  const requiredFailureEndingTypes = ['TRAGIC', 'CORRUPTION'];
  const failureEndingCoverageRatio =
    requiredFailureEndingTypes.filter((type) => coveredEndingTypes.has(type)).length /
    requiredFailureEndingTypes.length;
  const caseFileFailureCount = Array.isArray(pack.caseFile?.failureConsequences)
    ? pack.caseFile.failureConsequences.length
    : 0;
  const interactionScore =
    toPercent(choiceCoverageRatio) * 0.45 +
    toPercent(beatCoverageRatio) * 0.2 +
    toPercent(coreEndingCoverageRatio) * 0.2 +
    clamp(avgOptions / 3, 0.5, 1.1) * 100 * 0.15;
  const consequenceDepthScore = clamp(
    (caseFileFailureCount >= 5 ? 38 : caseFileFailureCount * 6) +
      failureEndingCoverageRatio * 42 +
      clamp(avgOptions / 3, 0.5, 1.2) * 10 +
      clamp(avgMessages / 3, 0.6, 1.25) * 10,
    0,
    100
  );

  const claritySeed =
    (pack.caseFile?.objective ? 24 : 0) +
    (pack.caseFile?.primaryQuestion ? 20 : 0) +
    (pack.caseFile?.operationWindow ? 16 : 0) +
    (avgMessages >= 2.4 && avgMessages <= 4.2 ? 20 : 12) +
    (avgNarrativeWords >= 80 && avgNarrativeWords <= 150 ? 20 : 10);
  const noviceClarityScore = clamp(claritySeed, 0, 100);

  const pacingPenalty = avgMessages > 4.3 ? (avgMessages - 4.3) * 14 : 0;
  const reliabilityScore = clamp(100 - invalidTransitionCount * 5 - pacingPenalty, 40, 100);
  const mediaProductionScore = clamp(Number(mediaQuality?.score ?? 0), 0, 100);

  const productionReadiness = Math.round(
    structuralScore * 0.2 +
      narrativeScore * 0.18 +
      interactionScore * 0.2 +
      consequenceDepthScore * 0.15 +
      noviceClarityScore * 0.12 +
      reliabilityScore * 0.08 +
      mediaProductionScore * 0.07
  );

  const complexityIndex = avgOptions * 0.95 + avgNarrativeWords / 120 + avgMessages / 2.7 + (pack.artifactCards || []).length / 8;
  const difficulty = toDifficulty(complexityIndex);

  const missingChoices = Array.from(totalChoiceIds).filter((choiceId) => !coveredChoiceIds.has(choiceId));
  const missingEndings = Array.from(coreEndingIds).filter((endingId) => !coveredCoreEndingIds.has(endingId));
  const missingOptionalEndings = Array.from(optionalEndingIds).filter(
    (endingId) => !coveredOptionalEndingIds.has(endingId)
  );
  const issues = [];

  if (avgMessages > 4.3) {
    issues.push('Message flood risk: average message count per beat is high and may overwhelm novice players.');
  }
  if (avgNarrativeWords < 65) {
    issues.push('Narrative depth risk: average beat narrative is too short for sustained immersion.');
  }
  if ((pack.artifactCards || []).length < 5) {
    issues.push('Artifact density risk: fewer than 5 artifact cards reduce investigative texture.');
  }
  if (missingChoices.length > 0) {
    issues.push(`${missingChoices.length} branch options were not exercised by the QA simulator.`);
  }
  if (missingEndings.length > 0) {
    issues.push(`${missingEndings.length} core endings were not reached by current simulation strategies.`);
  }
  if (failureEndingCoverageRatio < 1) {
    issues.push('Failure-state coverage gap: at least one marketed fail ending type was not reached by simulation.');
  }
  if (caseFileFailureCount < 5) {
    issues.push('Case-file consequence gap: fewer than five explicit failure consequences are documented.');
  }
  for (const issue of mediaQuality?.issues ?? []) {
    issues.push(issue);
  }
  if (issues.length === 0) {
    issues.push('No major structural defects detected by automated QA simulation.');
  }

  const recommendations = [];
  if (avgMessages > 4.3) {
    recommendations.push('Increase in-beat delay spread and gate lower-priority messages behind response selections.');
  }
  if (productionReadiness < 85) {
    recommendations.push('Add one handcrafted escalation artifact and one high-pressure witness exchange to raise emotional variance.');
  }
  if (missingEndings.length > 0) {
    recommendations.push('Tune reputation deltas or ending resolver thresholds so all core ending states are reachable.');
  }
  if (missingOptionalEndings.length > 0) {
    recommendations.push(
      `${missingOptionalEndings.length} optional-tone endings are currently rare; keep as stretch outcomes or tune branch balance if desired.`
    );
  }
  if (failureEndingCoverageRatio < 1) {
    recommendations.push('Strengthen risk deltas and escalation triggers so tragic, corruption, and collapse states remain reachable.');
  }
  for (const recommendation of mediaQuality?.recommendations ?? []) {
    recommendations.push(recommendation);
  }
  recommendations.push('Run human playtest on mobile with the novice script to verify readability and pacing under real interruption patterns.');

  return {
    metrics: {
      beatCount: beats.length,
      choiceCount: totalChoiceIds.size,
      endingCount: allEndings.length,
      artifactCount: (pack.artifactCards || []).length,
      avgNarrativeWords: Number(avgNarrativeWords.toFixed(2)),
      avgMessagesPerBeat: Number(avgMessages.toFixed(2)),
      avgOptionsPerBeat: Number(avgOptions.toFixed(2)),
      avgMessageDelaySeconds: Number(avgDelay.toFixed(2)),
      caseFileFailureConsequences: caseFileFailureCount,
      media: mediaQuality?.metrics ?? {}
    },
    coverage: {
      beatCoveragePercent: toPercent(beatCoverageRatio),
      choiceCoveragePercent: toPercent(choiceCoverageRatio),
      endingCoveragePercent: toPercent(coreEndingCoverageRatio),
      optionalEndingCoveragePercent: toPercent(optionalEndingCoverageRatio),
      failureEndingCoveragePercent: toPercent(failureEndingCoverageRatio),
      coveredBeatCount: coveredBeatIds.size,
      coveredChoiceCount: coveredChoiceIds.size,
      coveredEndingCount: coveredCoreEndingIds.size,
      endingTypesSeen: Array.from(coveredEndingTypes).sort(),
      missingChoiceIds: missingChoices,
      missingEndingIds: missingEndings,
      missingOptionalEndingIds: missingOptionalEndings
    },
    scores: {
      productionReadiness,
      structuralScore: Math.round(structuralScore),
      narrativeScore: Math.round(narrativeScore),
      interactionScore: Math.round(interactionScore),
      consequenceDepthScore: Math.round(consequenceDepthScore),
      noviceClarityScore: Math.round(noviceClarityScore),
      reliabilityScore: Math.round(reliabilityScore),
      mediaProductionScore: Math.round(mediaProductionScore)
    },
    difficulty,
    issues,
    recommendations
  };
}

function toMarkdown(report) {
  const rows = report.scenarios
    .map(
      (scenario) =>
        `| ${scenario.id} | ${scenario.strategyLabel} | ${scenario.totalSteps} | ${scenario.ending?.type || 'N/A'} | ${scenario.finalState.investigationProgress} |`
    )
    .join('\n');

  return [
    `# ${report.title} QA Agent Report`,
    '',
    `- Story ID: \`${report.storyId}\``,
    `- Generated: ${report.generatedAt}`,
    `- Production Readiness: **${report.scores.productionReadiness}/100**`,
    `- Difficulty: **${report.difficulty.level} (${report.difficulty.label})**`,
    '',
    '## Coverage',
    '',
    `- Beat coverage: ${report.coverage.beatCoveragePercent}%`,
    `- Choice coverage: ${report.coverage.choiceCoveragePercent}%`,
    `- Ending coverage: ${report.coverage.endingCoveragePercent}%`,
    `- Optional ending coverage: ${report.coverage.optionalEndingCoveragePercent}%`,
    `- Failure ending coverage: ${report.coverage.failureEndingCoveragePercent}%`,
    '',
    '## Score Breakdown',
    '',
    `- Structural: ${report.scores.structuralScore}`,
    `- Narrative: ${report.scores.narrativeScore}`,
    `- Interaction: ${report.scores.interactionScore}`,
    `- Consequence Depth: ${report.scores.consequenceDepthScore}`,
    `- Novice Clarity: ${report.scores.noviceClarityScore}`,
    `- Reliability: ${report.scores.reliabilityScore}`,
    `- Media Production: ${report.scores.mediaProductionScore}`,
    '',
    '## Media QA',
    '',
    `- Voice profiles mapped: ${report.mediaQuality.metrics.voiceProfilesMapped}/${report.mediaQuality.metrics.expectedCharacterVoiceProfiles}`,
    `- Unique OpenAI voices: ${report.mediaQuality.metrics.uniqueOpenAiVoices}`,
    `- Unique voice signatures: ${report.mediaQuality.metrics.uniqueVoiceSignatures}`,
    `- Video duration compliant: ${report.mediaQuality.metrics.videoDurationCompliant}/${report.mediaQuality.metrics.totalVideoAssets}`,
    `- Video voiceover compliant: ${report.mediaQuality.metrics.videoVoiceoverCompliant}/${report.mediaQuality.metrics.totalVideoAssets}`,
    `- Voice naturalness compliant: ${report.mediaQuality.metrics.voiceNaturalnessCompliant}/${report.mediaQuality.metrics.voiceAssetsGenerated}`,
    `- Video narration naturalness compliant: ${report.mediaQuality.metrics.videoNarrationNaturalnessCompliant}/${report.mediaQuality.metrics.totalVideoAssets}`,
    '',
    '## Issues',
    '',
    ...report.issues.map((issue) => `- ${issue}`),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((recommendation) => `- ${recommendation}`),
    '',
    '## Scenario Outcomes',
    '',
    '| Scenario ID | Strategy | Steps | Ending | Progress |',
    '| --- | --- | ---: | --- | ---: |',
    rows,
    ''
  ].join('\n');
}

function buildStoryReport(storyFile) {
  const storyPath = join(dramaDir, storyFile);
  const pack = readJson(storyPath);

  const coreScenarios = STRATEGIES.map((strategy) => runScenario(pack, strategy));
  const endingTargetScenarios = ENDING_TARGETS.map((targetType) =>
    runScenario(
      pack,
      {
        id: `ending-target-${targetType.toLowerCase()}`,
        label: `Ending Target - ${targetType}`,
        goal: `Force the simulation toward ${targetType}.`,
        selector: 'ending-target',
        targetType
      },
      {
        id: `ending-target-${targetType.toLowerCase()}`
      }
    )
  );
  const discoveredEndingTypes = new Set(
    [...coreScenarios, ...endingTargetScenarios]
      .map((scenario) => scenario.ending?.type)
      .filter(Boolean)
  );
  const endingSearchScenarios = [];
  for (const targetType of ENDING_TARGETS) {
    if (discoveredEndingTypes.has(targetType)) {
      continue;
    }
    const discovered = findScenarioByEnding(pack, targetType);
    if (discovered) {
      endingSearchScenarios.push(discovered);
      discoveredEndingTypes.add(targetType);
    }
  }
  const probeScenarios = maybeAddBranchProbeScenarios(pack, [
    ...coreScenarios,
    ...endingTargetScenarios,
    ...endingSearchScenarios
  ]);
  const scenarios = [...coreScenarios, ...endingTargetScenarios, ...endingSearchScenarios, ...probeScenarios];
  const mediaQuality = computeMediaQuality(pack);
  const scored = computeScores(pack, scenarios, mediaQuality);

  const report = {
    storyId: pack.id,
    title: pack.title,
    version: pack.version,
    generatedAt: new Date().toISOString(),
    difficulty: scored.difficulty,
    metrics: scored.metrics,
    coverage: scored.coverage,
    scores: scored.scores,
    mediaQuality,
    issues: scored.issues,
    recommendations: scored.recommendations,
    scenarios
  };

  writeJson(join(publicReportsDir, `${pack.id}.json`), report);
  writeFileSync(join(docsReportsDir, `${pack.id}.md`), `${toMarkdown(report)}\n`, 'utf8');

  return {
    storyId: report.storyId,
    title: report.title,
    version: report.version,
    generatedAt: report.generatedAt,
    productionReadiness: report.scores.productionReadiness,
    difficulty: report.difficulty,
    coverage: {
      beats: report.coverage.beatCoveragePercent,
      choices: report.coverage.choiceCoveragePercent,
      endings: report.coverage.endingCoveragePercent
    },
    scenarioCount: report.scenarios.length,
    reportPath: `/reports/quality/${report.storyId}.json`
  };
}

const storyFiles = readdirSync(dramaDir)
  .filter((entry) => entry.endsWith('.json') && entry !== 'index.json')
  .sort();

const indexRows = storyFiles.map(buildStoryReport).sort((a, b) => b.productionReadiness - a.productionReadiness);

writeJson(join(publicReportsDir, 'index.json'), {
  generatedAt: new Date().toISOString(),
  totalStories: indexRows.length,
  rows: indexRows
});

console.log('[qa-agent] generated quality reports');
console.log(
  JSON.stringify(
    {
      totalStories: indexRows.length,
      averageReadiness:
        indexRows.length > 0
          ? Math.round(indexRows.reduce((sum, row) => sum + row.productionReadiness, 0) / indexRows.length)
          : 0,
      output: '/apps/web/public/reports/quality'
    },
    null,
    2
  )
);
