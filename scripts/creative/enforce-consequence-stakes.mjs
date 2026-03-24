import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const dramaDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');

const storyMotifs = {
  'static-between-stations': 'dead-rail signal lattice',
  'black-chapel-ledger': 'cathedral debt ledger',
  'the-harvest-men': 'harvest rite processions',
  'signal-from-kharon-9': 'orbital telemetry echo',
  'the-fourth-tenant': 'impossible apartment records',
  'tape-17-pinewatch': 'rewriting camcorder archive',
  'crown-of-salt': 'tidal relic cartel',
  'red-creek-winter': 'snowbound alibi chain',
  'ward-1908': 'asylum intake registry',
  'dead-channel-protocol': 'ghost-app prediction feed',
  'midnight-lockbox': 'forecast lockbox voicemail'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatDayLabel(beat, index) {
  const titleMatch = String(beat?.title || '').match(/day\s*([0-9]{1,2})/i);
  if (titleMatch) {
    return `Day ${String(titleMatch[1]).padStart(2, '0')}`;
  }
  const idMatch = String(beat?.id || '').match(/day[_-]?([0-9]{1,2})/i);
  if (idMatch) {
    return `Day ${String(idMatch[1]).padStart(2, '0')}`;
  }
  return `Beat ${String(index + 1).padStart(2, '0')}`;
}

function cleanIdentifier(value) {
  return String(value || '')
    .replace(/^.*?:/, '')
    .replace(/^[a-z0-9-]+-d[0-9]{2}-/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeSentence(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function stageLanguage(stage) {
  if (stage === 1) {
    return {
      threat:
        'You are still building baseline truth, so precision beats speed and every note must survive scrutiny later.',
      roleplay:
        'Play this like a calm field analyst who wins trust first, then narrows contradictions with evidence-backed questions.'
    };
  }
  if (stage === 2) {
    return {
      threat:
        'The opposition has noticed your pattern and is blending true details with planted noise to fracture your confidence.',
      roleplay:
        'Play this as a disciplined investigator: separate what is provable now from what is emotionally persuasive but unverified.'
    };
  }
  if (stage === 3) {
    return {
      threat:
        'Escalation is active. Delays and bluff-heavy responses now trigger retaliation against witnesses, artifacts, and timeline integrity.',
      roleplay:
        'Play this like a crisis lead under pressure: stabilize people first, then take one high-value action with clear chain-of-custody.'
    };
  }
  return {
    threat:
      'This is final-phase pressure where partial wins fail; either you prove the chain end-to-end or the case collapses under hostile narrative control.',
    roleplay:
      'Play this as an endgame operator: make decisive calls, document each inference, and commit only to conclusions you can defend in debrief.'
  };
}

function resolvePrimaryClueLabel(pack, beat) {
  const firstClueId = beat?.revealClueIds?.[0];
  if (!firstClueId) {
    return 'the lead anomaly packet';
  }
  const boardNode = (pack?.investigationBoard?.nodes || []).find((node) => node.id === firstClueId);
  if (boardNode?.label) {
    return boardNode.label;
  }
  return capitalizeSentence(cleanIdentifier(firstClueId) || 'the lead anomaly packet');
}

function resolveArtifactFocus(pack, beat) {
  const cards = pack?.artifactCards || [];
  if (cards.length === 0) {
    return ['Casefile chronology', 'Witness contradiction notes'];
  }

  const clueIds = new Set((beat?.revealClueIds || []).map((id) => String(id).toLowerCase()));
  const beatTag = String(beat?.id || '').toLowerCase();
  const matchingCards = cards.filter((card) => {
    const text = `${card.id} ${card.title} ${card.summary} ${card.excerpt}`.toLowerCase();
    if (text.includes(beatTag)) {
      return true;
    }
    for (const clueId of clueIds) {
      if (text.includes(clueId)) {
        return true;
      }
    }
    return false;
  });

  const pool = matchingCards.length > 0 ? matchingCards : cards;
  return pool.slice(0, 2).map((card) => card.title);
}

function buildNarrativeDepth(pack, beat, index) {
  const beats = pack?.beats || [];
  const previousBeat = beats[index - 1];
  const nextBeat = beats[index + 1];
  const stage = Number(beat?.stage || 1);
  const dayLabel = formatDayLabel(beat, index);
  const motif = storyMotifs[pack.id] || 'active threat network';
  const location = pack.location || 'the active incident zone';
  const villain = pack?.villain?.displayName || 'the antagonist';
  const seedNarrative = String(beat?.narrative || '').trim();
  const primaryClue = resolvePrimaryClueLabel(pack, beat);
  const artifactFocus = resolveArtifactFocus(pack, beat);
  const stageCopy = stageLanguage(stage);

  const continuity = previousBeat
    ? `Continuity from ${previousBeat.title}: choices there set the trust baseline and pressure profile you inherit right now.`
    : 'Opening continuity: this is first contact, so every observation you record sets the baseline for the entire campaign.';
  const objective = `Objective for ${dayLabel}: secure ${primaryClue} as admissible evidence, connect it to motive, and prove who benefited from the manipulation.`;
  const stakes = `If this beat slips, ${villain} gains ground over the ${motif} around ${location}, and later witnesses will inherit your unresolved contradiction as fact.`;
  const roleplayPrompt = `${stageCopy.roleplay} Start by naming what you know, what you suspect, and what must be verified before your next response.`;

  const paragraphOne = `${dayLabel} unfolds inside ${location}, where ${pack.hook} ${seedNarrative} You are not just collecting spooky fragments; you are constructing a legally defensible sequence from anomaly to actor to intent.`;
  const paragraphTwo = `${continuity} ${objective} Artifact focus for this moment is ${artifactFocus.join(' and ')}, because those records expose whether the timeline was edited in panic or premeditated as part of a coordinated concealment plan.`;
  const paragraphThree = `${stageCopy.threat} ${roleplayPrompt} ${stakes} ${
    nextBeat
      ? `If you leave this beat coherent, ${nextBeat.title} opens with stronger witness leverage instead of damage control.`
      : 'This is the terminal stretch, so unresolved contradictions now can directly force collapse, corruption, or fatal loss.'
  }`;

  return {
    narrative: [paragraphOne, paragraphTwo, paragraphThree].join('\n\n'),
    depth: {
      background: paragraphOne,
      continuity,
      objective,
      stakes,
      roleplayPrompt,
      artifactFocus
    }
  };
}

function ensureReputation(option) {
  option.reputationDelta = {
    trustworthiness: Number(option?.reputationDelta?.trustworthiness || 0),
    aggression: Number(option?.reputationDelta?.aggression || 0),
    curiosity: Number(option?.reputationDelta?.curiosity || 0),
    deception: Number(option?.reputationDelta?.deception || 0),
    morality: Number(option?.reputationDelta?.morality || 0)
  };
}

function applyIntentConsequences(option, stage) {
  ensureReputation(option);
  const intent = String(option.intent || '').toUpperCase();
  const rep = option.reputationDelta;

  const riskyIntents = new Set(['ACCUSATION', 'DEFIANCE', 'DECEPTION', 'THREAT', 'SILENCE']);
  const saferIntents = new Set(['CURIOSITY', 'QUESTION', 'COMPLIANCE']);

  if (saferIntents.has(intent)) {
    rep.trustworthiness += stage >= 3 ? 2 : 1;
    rep.morality += 1;
    rep.aggression -= 1;
    option.progressDelta = clamp(Number(option.progressDelta || 0) + 1, 1, 7);
  } else if (intent === 'BARGAIN') {
    rep.trustworthiness -= 1;
    rep.deception += stage >= 3 ? 2 : 1;
    rep.morality -= 1;
    option.progressDelta = clamp(Number(option.progressDelta || 0), 1, 6);
  } else if (intent === 'ACCUSATION' || intent === 'DEFIANCE') {
    rep.trustworthiness -= stage >= 3 ? 2 : 1;
    rep.aggression += stage >= 3 ? 4 : 2;
    rep.morality -= stage >= 3 ? 2 : 1;
    option.progressDelta = clamp(Number(option.progressDelta || 0) - 1, 1, 6);
  } else if (intent === 'DECEPTION') {
    rep.trustworthiness -= 2;
    rep.deception += stage >= 3 ? 4 : 3;
    rep.morality -= 2;
    option.progressDelta = clamp(Number(option.progressDelta || 0) - 1, 1, 6);
  } else if (intent === 'THREAT') {
    rep.trustworthiness -= 3;
    rep.aggression += stage >= 3 ? 5 : 4;
    rep.deception += 2;
    rep.morality -= 3;
    option.progressDelta = clamp(Number(option.progressDelta || 0) - 2, 1, 5);
  } else if (intent === 'SILENCE') {
    rep.trustworthiness -= 2;
    rep.curiosity -= 1;
    rep.morality -= 1;
    rep.deception += 1;
    option.progressDelta = clamp(Number(option.progressDelta || 0) - 1, 1, 5);
  } else if (intent === 'FEAR') {
    rep.trustworthiness -= 1;
    rep.aggression -= 1;
    rep.curiosity -= 1;
    option.progressDelta = clamp(Number(option.progressDelta || 0), 1, 5);
  }

  if (riskyIntents.has(intent) && stage >= 3) {
    rep.aggression += 1;
    rep.morality -= 1;
  }

  rep.trustworthiness = clamp(rep.trustworthiness, -10, 10);
  rep.aggression = clamp(rep.aggression, -10, 10);
  rep.curiosity = clamp(rep.curiosity, -10, 10);
  rep.deception = clamp(rep.deception, -10, 10);
  rep.morality = clamp(rep.morality, -10, 10);
}

function buildEnding(pack, type, motif) {
  const villain = pack?.villain?.displayName || 'the antagonist';
  if (type === 'JUSTICE') {
    return {
      id: `${pack.id}-justice`,
      type,
      title: 'Documented Justice',
      summary: `You contain the ${motif} operation and expose ${villain} with admissible proof.`,
      epilogue: 'Survivors hold testimony, the evidence chain remains intact, and the case closes publicly.',
      sequelHook: 'A sealed index references one unresolved accomplice cell.'
    };
  }
  if (type === 'PYRRHIC') {
    return {
      id: `${pack.id}-pyrrhic`,
      type,
      title: 'Pyrrhic Containment',
      summary: `You end the immediate threat, but the ${motif} leaves casualties and permanent damage.`,
      epilogue: 'Critical evidence survives, yet at least one ally is lost and public trust is fractured.',
      sequelHook: 'Recovery teams find a second site primed for activation.'
    };
  }
  if (type === 'CORRUPTION') {
    return {
      id: `${pack.id}-corruption`,
      type,
      title: 'Compromised Truth',
      summary: `Your choices let ${villain} rewrite the record; the case closes on a manufactured lie.`,
      epilogue: 'Witnesses are discredited, falsified artifacts are accepted, and the enemy narrative wins.',
      sequelHook: 'Your own credentials are used to authorize the next operation.'
    };
  }
  if (type === 'UNRESOLVED') {
    return {
      id: `${pack.id}-unresolved`,
      type,
      title: 'Case Collapse',
      summary: `The investigation stalls and the ${motif} expands beyond your control.`,
      epilogue: 'No conviction is possible. Remaining witnesses go dark and the public panic spreads.',
      sequelHook: 'Control issues a full reset order: restart from Day 1 with stricter protocol.'
    };
  }
  return {
    id: `${pack.id}-tragic`,
    type: 'TRAGIC',
    title: 'Terminal Outcome',
    summary: `Failure is absolute: someone close to the case dies, and ${villain} secures dominant control.`,
    epilogue: 'The operation ends in blood, possession, or disappearance. This run is lost.',
    sequelHook: 'Only a full replay can change who survives.'
  };
}

function enforceStoryPack(pack) {
  const motif = storyMotifs[pack.id] || 'active threat network';
  const villain = pack?.villain?.displayName || 'the antagonist';
  const location = pack.location || 'the primary site';

  for (const [index, beat] of (pack.beats || []).entries()) {
    const stage = Number(beat.stage || 1);
    const stageAddendum =
      stage === 1
        ? 'Treat every early contradiction as admissibility-critical, because one bad assumption here can poison the entire board later.'
        : stage === 2
          ? 'Pressure is now deliberate: each rushed accusation or bluff gives hostile actors room to erase evidence and isolate witnesses.'
          : stage === 3
            ? 'You are in direct danger. Tactical mistakes now carry body-count consequences, and the antagonist can retaliate before your next move.'
            : 'Endgame protocol applies: commit to a provable chain or accept total case collapse; there is no safe middle ground.';
    const failureHook = `If this beat is mishandled, ${villain} gains leverage over ${motif} and expands control around ${location}.`;
    const enriched = buildNarrativeDepth(pack, beat, index);
    beat.narrative = enriched.narrative;
    beat.narrativeDepth = enriched.depth;
    if (wordCount(beat.narrative) < 130) {
      beat.narrative = `${beat.narrative}\n\n${stageAddendum} ${failureHook}`.trim();
    }

    const hasContinuityMessage = (beat.incomingMessages || []).some((message) =>
      String(message.id || '').includes('continuity-brief')
    );
    if (!hasContinuityMessage) {
      beat.incomingMessages = [
        ...(beat.incomingMessages || []),
        {
          id: `${beat.id}-continuity-brief`,
          senderName: `${pack.title} Continuity Desk`,
          role: 'operator',
          channel: 'DOCUMENT_DROP',
          text: `${enriched.depth.continuity} ${enriched.depth.objective} Artifact focus: ${enriched.depth.artifactFocus.join(', ')}.`,
          delaySeconds: 42,
          intensity: clamp(40 + stage * 8, 35, 90)
        }
      ];
    }

    for (const option of beat.responseOptions || []) {
      applyIntentConsequences(option, stage);
    }
  }

  const endings = [
    buildEnding(pack, 'JUSTICE', motif),
    buildEnding(pack, 'PYRRHIC', motif),
    buildEnding(pack, 'TRAGIC', motif),
    buildEnding(pack, 'CORRUPTION', motif),
    buildEnding(pack, 'UNRESOLVED', motif)
  ];
  pack.endings = endings;

  if (!pack.caseFile) {
    pack.caseFile = {
      objective: `Contain ${motif}.`,
      primaryQuestion: `Who controls ${villain} and how is the operation funded?`,
      operationWindow: '45 days',
      successCriteria: [],
      failureConsequences: []
    };
  }

  pack.caseFile.failureConsequences = [
    `${villain} gains control of the narrative around ${location}.`,
    'At least one witness or ally is killed, abducted, or mentally broken.',
    `Core ${motif} evidence is destroyed or rendered inadmissible.`,
    'Public trust collapses and the investigation is politically buried.',
    'Mission failure forces a full restart from Day 1.'
  ];

  pack.caseFile.successCriteria = Array.from(
    new Set([
      ...(pack.caseFile.successCriteria || []),
      'Keep villain advantage below critical takeover threshold.',
      'Preserve witness testimony through final debrief.',
      'Maintain admissible chain-of-custody on primary evidence.'
    ])
  );

  pack.replayHooks = Array.from(
    new Set([
      ...(pack.replayHooks || []),
      'Hard fail states include death, possession, and total case collapse.',
      'Different branch discipline determines whether the villain rises or falls.'
    ])
  );
}

const files = readdirSync(dramaDir)
  .filter((entry) => entry.endsWith('.json') && entry !== 'index.json')
  .sort();

for (const file of files) {
  const filePath = join(dramaDir, file);
  const pack = JSON.parse(readFileSync(filePath, 'utf8'));
  enforceStoryPack(pack);
  writeFileSync(filePath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  console.log(`[consequence-stakes] updated ${pack.id}`);
}
