import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const dramaDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const storiesDir = join(repoRoot, 'docs', 'stories');
const manifestDir = join(repoRoot, 'apps', 'web', 'public', 'agent-army', 'manifests');
const skipStatic = process.argv.includes('--skip-static');

const STAGE_META = {
  1: { id: 'DISCOVERY', title: 'Discovery & Curiosity' },
  2: { id: 'ESCALATION', title: 'Escalation & Unease' },
  3: { id: 'DANGER', title: 'Danger & Direct Involvement' },
  4: { id: 'RESOLUTION', title: 'Resolution or Psychological Break' }
};

const DAY_TITLES = [
  'First Breach',
  'Record Fracture',
  'Witness Contradiction',
  'Unscheduled Drop',
  'Shadow Contact',
  'Archive Breach',
  'Trust Fork',
  'Signal Contamination',
  'Trap Site',
  'Protection Leak',
  'Impersonation Window',
  'Impossible Record',
  'Evidence Tamper',
  'Pressure Call',
  'Recovered Tape',
  'Hidden Network',
  'Missing Minutes',
  'Panic Wave',
  'Pattern Marks',
  'Reroute Trace',
  'Collapsed Witness',
  'Ultimatum Night',
  'Identity Reveal',
  'Legacy File',
  'Chronology Hearing',
  'Compromise Offer',
  'Countdown Board',
  'Final Reckoning'
];

const FLAVOR_BY_STORY = {
  'black-chapel-ledger': {
    motifs: ['ledger', 'chapel bell', 'salt wax', 'choir loft', 'vellum', 'cathedral crypt']
  },
  'crown-of-salt': {
    motifs: ['harbor fog', 'salt relic', 'catacomb stair', 'port manifest', 'tide mark', 'smuggler cache']
  },
  'dead-channel-protocol': {
    motifs: ['substation hum', 'packet relay', 'grid fault', 'bot transcript', 'debug trace', 'uptime mirror']
  },
  'midnight-lockbox': {
    motifs: ['storage corridor', 'lock cylinder', 'drain tunnel', 'unit 331', 'night memo', 'key blank']
  },
  'red-creek-winter': {
    motifs: ['snow line', 'hunting shack', 'county dispatch', 'frozen bridge', 'blood trail', 'winter siren']
  },
  'signal-from-kharon-9': {
    motifs: ['array dish', 'telemetry burst', 'vacuum static', 'sealed observatory', 'signal index', 'dark window']
  },
  'tape-17-pinewatch': {
    motifs: ['ranger tower', 'pine trail', 'found footage', 'watch log', 'forest relay', 'ash marker']
  },
  'the-fourth-tenant': {
    motifs: ['lease file', 'hallway camera', 'unit key ring', 'boiler room', 'eviction docket', 'tenant ledger']
  },
  'the-harvest-men': {
    motifs: ['harvest field', 'bonfire ring', 'grain silo', 'village hymn', 'straw sigil', 'rural archive']
  },
  'ward-1908': {
    motifs: ['hospital wing', 'patient ledger', 'surgical light', 'ward alarm', 'asylum file', 'intake stamp']
  },
  'static-between-stations': {
    motifs: ['relay room', 'turnstile frame', 'station static', 'platform zero', 'dispatch tape', 'track signal']
  }
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stageForDay(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function titleize(value) {
  return value
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function clueToPhrase(clueId) {
  if (!clueId) {
    return 'core evidence thread';
  }

  const cleaned = String(clueId)
    .replace(/^.*?-d\d+-/, '')
    .replace(/^.*?clue-/, '')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'core evidence thread';
}

function pick(list, index) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[index % list.length];
}

function normalizeCharacterList(storyDoc, drama) {
  const docChars = Array.isArray(storyDoc?.characters) ? storyDoc.characters : [];
  if (docChars.length >= 3) {
    return docChars;
  }

  const boardNodes = Array.isArray(drama?.investigationBoard?.nodes) ? drama.investigationBoard.nodes : [];
  const names = boardNodes
    .filter((node) => node?.type && String(node.type).toLowerCase() !== 'evidence')
    .map((node) => node.label)
    .filter(Boolean);

  if (names.length >= 3) {
    return names;
  }

  return [
    'Lead Investigator',
    'Primary Witness',
    'Field Liaison',
    'Evidence Custodian'
  ];
}

function toReputation(trustworthiness, aggression, curiosity, deception, morality) {
  return { trustworthiness, aggression, curiosity, deception, morality };
}

function authoredOptionsForStage(stage, beatId, day, nextBeatId, cluePhrase, motif) {
  if (stage === 1) {
    return [
      {
        id: `${beatId}.choice.stabilize`,
        label: `Stabilize witnesses around ${motif}`,
        intent: 'CURIOSITY',
        summary: `Protect people first while preserving admissible proof tied to ${cluePhrase}.`,
        nextBeatId,
        progressDelta: 4,
        reputationDelta: toReputation(3, -1, 2, 0, 2),
        flagUpdates: { approach: 'stabilize', day, stage }
      },
      {
        id: `${beatId}.choice.audit`,
        label: `Force immediate audit on ${motif}`,
        intent: 'ACCUSATION',
        summary: 'Push institutions hard and accept political resistance to expose tampering early.',
        nextBeatId,
        progressDelta: 3,
        reputationDelta: toReputation(-1, 3, 1, 0, -1),
        flagUpdates: { approach: 'audit', day, stage }
      },
      {
        id: `${beatId}.choice.shadow`,
        label: 'Run shadow verification thread',
        intent: 'DECEPTION',
        summary: `Quietly verify ${cluePhrase} before hostile actors can rewrite the timeline.`,
        nextBeatId,
        progressDelta: 3,
        reputationDelta: toReputation(1, 0, 2, 2, 0),
        flagUpdates: { approach: 'shadow', day, stage }
      }
    ];
  }

  if (stage === 2) {
    return [
      {
        id: `${beatId}.choice.protect`,
        label: 'Protect civilians before publication',
        intent: 'COMPLIANCE',
        summary: 'Delay visible escalation while moving high-risk witnesses out of immediate danger.',
        nextBeatId,
        progressDelta: 4,
        reputationDelta: toReputation(2, -2, 1, 0, 3),
        flagUpdates: { approach: 'protect', day, stage }
      },
      {
        id: `${beatId}.choice.bait`,
        label: 'Bait antagonist into traceable contact',
        intent: 'DEFIANCE',
        summary: `Use controlled risk around ${motif} to force attributable response behavior.`,
        nextBeatId,
        progressDelta: 4,
        reputationDelta: toReputation(-1, 2, 2, 1, -1),
        flagUpdates: { approach: 'bait', day, stage }
      },
      {
        id: `${beatId}.choice.cross`,
        label: 'Cross-examine contradictions first',
        intent: 'QUESTION',
        summary: `Build chronology discipline around ${cluePhrase} before tactical action.`,
        nextBeatId,
        progressDelta: 3,
        reputationDelta: toReputation(1, 0, 3, 0, 1),
        flagUpdates: { approach: 'cross', day, stage }
      }
    ];
  }

  if (stage === 3) {
    return [
      {
        id: `${beatId}.choice.evacuate`,
        label: 'Evacuate targets and hold line',
        intent: 'FEAR',
        summary: 'Contain immediate harm even if evidence velocity slows.',
        nextBeatId,
        progressDelta: 3,
        reputationDelta: toReputation(2, -1, 1, 0, 2),
        flagUpdates: { approach: 'evacuate', day, stage }
      },
      {
        id: `${beatId}.choice.strike`,
        label: `Deploy strike team toward ${motif}`,
        intent: 'THREAT',
        summary: 'Seize ground quickly to prevent additional live damage.',
        nextBeatId,
        progressDelta: 4,
        reputationDelta: toReputation(-1, 4, 1, 0, -2),
        flagUpdates: { approach: 'strike', day, stage }
      },
      {
        id: `${beatId}.choice.double`,
        label: 'Run double-agent pressure channel',
        intent: 'DECEPTION',
        summary: 'Trade controlled disclosures to identify command hierarchy.',
        nextBeatId,
        progressDelta: 4,
        reputationDelta: toReputation(0, 1, 2, 3, -1),
        flagUpdates: { approach: 'double', day, stage }
      }
    ];
  }

  return [
    {
      id: `${beatId}.choice.truth`,
      label: 'Publish full verified record',
      intent: 'DEFIANCE',
      summary: 'Commit to complete truth despite institutional and personal fallout.',
      nextBeatId,
      progressDelta: 5,
      reputationDelta: toReputation(2, 1, 2, 0, 3),
      flagUpdates: { approach: 'truth', day, stage }
    },
    {
      id: `${beatId}.choice.contain`,
      label: 'Contain panic with phased disclosure',
      intent: 'COMPLIANCE',
      summary: 'Prioritize immediate stability while protecting delayed accountability.',
      nextBeatId,
      progressDelta: 4,
      reputationDelta: toReputation(1, 0, 1, 1, 0),
      flagUpdates: { approach: 'contain', day, stage }
    },
    {
      id: `${beatId}.choice.compromise`,
      label: 'Accept compromise to save lives',
      intent: 'BARGAIN',
      summary: 'Trade long-term narrative control for short-term witness survival.',
      nextBeatId,
      progressDelta: 4,
      reputationDelta: toReputation(-2, -1, 0, 3, -3),
      flagUpdates: { approach: 'compromise', day, stage }
    }
  ];
}

function generateNarrative(stage, dayLabel, cluePhrase, motif, location, hook) {
  const stageContext = {
    1: {
      title: 'Discovery Window',
      risk: 'Witnesses are fragile, chain-of-custody is thin, and rumors can outrun evidence in minutes.',
      action: 'Your immediate job is to create a beginner-readable sequence: who observed what, when, and under which verifiable channel.',
      consequence:
        'If this opening sequence breaks, later clues become noise and players lose confidence in what they are solving.'
    },
    2: {
      title: 'Escalation Window',
      risk: 'Hostile actors begin reframing facts, impersonating trusted contacts, and seeding contradictory narratives.',
      action:
        'Treat this beat as a credibility test: cross-check timelines, isolate verified artifacts, and decide whether to protect, bait, or interrogate.',
      consequence:
        'Your choice determines whether the case remains understandable for new players or collapses into conflicting theories.'
    },
    3: {
      title: 'Danger Window',
      risk: 'Interference shifts from psychological pressure to direct operational threat against witnesses and evidence hubs.',
      action:
        'Choose a tactical posture deliberately. Every response should balance safety, investigative momentum, and long-term legal defensibility.',
      consequence:
        'A reckless move may gain short-term progress but can permanently corrupt trust, testimony, and final ending quality.'
    },
    4: {
      title: 'Resolution Window',
      risk: 'The antagonist forces irreversible tradeoffs between truth exposure, public stability, and individual survival.',
      action:
        'Use this beat to close contradictions and commit to one coherent theory of motive, method, and accountability.',
      consequence:
        'Endings are decided here: documented justice, compromised victory, corruption, or unresolved uncertainty based on accumulated choices.'
    }
  };

  const context = stageContext[stage] ?? stageContext[1];
  const headline = `${dayLabel} - ${context.title}`;
  return `${headline}. ${hook} now converges with ${cluePhrase} in ${location}, centered on the ${motif} thread. ${context.risk} ${context.action} Core mystery target: identify who is orchestrating the manipulation, how the evidence chain was altered, and what event this operation is trying to conceal. ${context.consequence}`;
}

function stageDelays(stage, includeVillain) {
  const map = {
    1: [5, 20, 36, 48],
    2: [4, 17, 31, 45],
    3: [3, 14, 27, 41],
    4: [2, 12, 24, 36]
  };
  const base = map[stage] ?? map[1];
  return includeVillain ? base : base.slice(0, 3);
}

function channelFor(index, pool) {
  return pool[index % pool.length];
}

function toPublicPath(outputKey) {
  if (!outputKey) {
    return null;
  }
  return `/${String(outputKey)
    .replaceAll('\\', '/')
    .replace(/^assets\/production\/agent-army\//, 'agent-army/')}`;
}

function loadManifestAssets(storyId) {
  try {
    const manifest = readJson(join(manifestDir, `${storyId}.json`));
    return Array.isArray(manifest.assets) ? manifest.assets : [];
  } catch {
    return [];
  }
}

function firstAssetPublicPath(assets, predicate) {
  const match = assets.find(predicate);
  if (!match) {
    return null;
  }

  return match.public_path || toPublicPath(match.outputKey || match.file_path);
}

function buildVisualDeck(storyId, assets, existingHero) {
  const hero =
    firstAssetPublicPath(
      assets,
      (asset) => asset.modality === 'image' && asset.asset_type === 'story_key_art'
    ) || existingHero || `/visuals/stories/${storyId}.svg`;

  const entries = [];
  const preferred = [
    'story_key_art',
    'arc_key_art',
    'beat_scene_art',
    'evidence_still',
    'villain_portrait',
    'puzzle_board'
  ];

  for (const type of preferred) {
    const matches = assets.filter((asset) => asset.modality === 'image' && asset.asset_type === type).slice(0, type === 'arc_key_art' ? 3 : 2);
    for (const asset of matches) {
      if (!asset.public_path) {
        continue;
      }
      entries.push({
        id: asset.asset_id,
        title: asset.title,
        category: type.includes('portrait') ? 'character' : type.includes('evidence') ? 'evidence' : 'scene',
        path: asset.public_path,
        promptHint: asset.prompt_used?.slice(0, 220) || `${storyId} ${type} visual`
      });
    }
  }

  if (entries.length === 0) {
    entries.push({
      id: `${storyId}-fallback-hero`,
      title: `${titleize(storyId)} Hero`,
      category: 'scene',
      path: hero,
      promptHint: 'Fallback story hero art path.'
    });
  }

  return {
    heroImage: hero,
    assets: entries.slice(0, 12)
  };
}

function buildCaseFile(story, drama, motif) {
  const title = story?.title || drama.title;
  return {
    objective: `Resolve ${title} with an evidence chain that survives legal scrutiny and protects live witnesses.`,
    primaryQuestion: `Who is orchestrating the ${motif} pressure cycle, and what truth are they paying to erase?`,
    operationWindow: '72-hour stabilization window, followed by a four-week escalation to final confrontation.',
    successCriteria: [
      'Maintain witness cooperation through escalating antagonist pressure.',
      'Corroborate a full chronology from first breach to final confrontation.',
      'Preserve admissible evidence across all channel and media drops.',
      'Close with a coherent novice-understandable explanation of motive and method.'
    ],
    failureConsequences: [
      'Witnesses fragment or withdraw, collapsing testimony quality.',
      'Narrative capture outruns forensic validation in public channels.',
      'Evidence is recast as rumor due to broken custody chain.',
      'The antagonist frame becomes accepted canon regardless of truth.'
    ]
  };
}

function buildArtifactCards(storyId, story, clues) {
  const evidenceList = Array.isArray(story?.clueEvidenceList) ? story.clueEvidenceList : [];
  const sourcePool = [
    'Evidence Intake',
    'Forensic Desk',
    'Channel Intercept',
    'Witness Archive',
    'Field Recovery'
  ];
  const typePool = ['document', 'photo', 'audio', 'map', 'forensic', 'message'];
  const base = [];
  const seeds = evidenceList.length > 0 ? evidenceList : clues;
  const selected = seeds.slice(0, 6);

  selected.forEach((seed, index) => {
    const phrase = clueToPhrase(seed);
    base.push({
      id: `${storyId}-artifact-${index + 1}`,
      title: titleize(phrase),
      type: typePool[index % typePool.length],
      source: sourcePool[index % sourcePool.length],
      summary: `Key artifact connected to ${phrase}.`,
      excerpt: `Recovered detail links ${phrase} to the active manipulation timeline.`,
      investigatorPrompt: `What contradiction in ${phrase} can a novice player verify without external context?`
    });
  });

  while (base.length < 5) {
    const index = base.length;
    base.push({
      id: `${storyId}-artifact-${index + 1}`,
      title: `Case Artifact ${index + 1}`,
      type: typePool[index % typePool.length],
      source: sourcePool[index % sourcePool.length],
      summary: 'Supplemental artifact reinforcing motive, method, and timeline continuity.',
      excerpt: 'Cross-channel references imply deliberate sequencing, not spontaneous anomaly.',
      investigatorPrompt: 'Which branch decision changes this artifact interpretation most strongly?'
    });
  }

  return base;
}

function buildNpcDossiers(story, villainName) {
  const chars = Array.isArray(story?.characters) ? story.characters : [];
  const emotional = ['controlled urgency', 'guarded fear', 'skeptical focus', 'fatigued resolve', 'defensive caution'];
  const dossiers = chars.map((name, index) => ({
    id: `npc-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    displayName: name,
    role: index === 0 ? 'Lead Operator' : index === 1 ? 'Primary Witness' : index === 2 ? 'Secondary Witness' : 'Investigation Contact',
    baselineEmotion: emotional[index % emotional.length],
    motivations: [
      'survive escalation',
      'protect trusted contacts',
      'resolve contradictory evidence'
    ],
    trustBaseline: 46 + index * 4,
    trustCeiling: 74 + index * 4,
    notableSecret: `${name} withheld one timeline detail that can either save or fracture the case.`
  }));

  dossiers.push({
    id: 'npc-villain',
    displayName: villainName,
    role: 'Primary Antagonist',
    baselineEmotion: 'controlled manipulation',
    motivations: ['rewrite memory', 'destabilize trust', 'force moral compromise'],
    trustBaseline: 4,
    trustCeiling: 18,
    notableSecret: 'Operates through mixed truth and deception to weaponize player certainty.'
  });

  return dossiers;
}

function buildInvestigationBoard(storyId, story, drama, artifacts, villainName, motif) {
  const chars = Array.isArray(story?.characters) ? story.characters : [];
  const location = story?.location || drama.location || 'primary incident zone';
  const nodes = [
    {
      id: `${storyId}-node-villain`,
      type: 'suspect',
      label: villainName,
      summary: 'Primary source of narrative interference and trust disruption.'
    },
    {
      id: `${storyId}-node-location`,
      type: 'location',
      label: titleize(location),
      summary: 'Primary setting where contradictions and evidence converge.'
    }
  ];

  chars.slice(0, 3).forEach((name, index) => {
    nodes.push({
      id: `${storyId}-node-char-${index + 1}`,
      type: index === 0 ? 'ally' : 'witness',
      label: name,
      summary: 'Critical source with partial truth and branch-dependent reliability.'
    });
  });

  artifacts.slice(0, 4).forEach((artifact, index) => {
    nodes.push({
      id: `${storyId}-node-evidence-${index + 1}`,
      type: 'evidence',
      label: artifact.title,
      summary: artifact.summary
    });
  });

  const links = [
    {
      fromId: `${storyId}-node-villain`,
      toId: `${storyId}-node-location`,
      relation: 'operates through',
      confidence: 0.82
    }
  ];

  if (chars.length > 0) {
    links.push({
      fromId: `${storyId}-node-char-1`,
      toId: `${storyId}-node-villain`,
      relation: 'targeted by',
      confidence: 0.66
    });
  }

  artifacts.slice(0, 3).forEach((_, index) => {
    links.push({
      fromId: `${storyId}-node-evidence-${index + 1}`,
      toId: `${storyId}-node-villain`,
      relation: 'attribution vector',
      confidence: 0.58 + index * 0.07
    });
  });

  const timeline = [
    {
      id: `${storyId}-time-01`,
      timeLabel: 'Day 01',
      summary: `Initial breach anchored by ${motif}.`,
      relatedNodeIds: [`${storyId}-node-location`, `${storyId}-node-evidence-1`]
    },
    {
      id: `${storyId}-time-08`,
      timeLabel: 'Day 08',
      summary: 'Escalation phase begins with direct interference.',
      relatedNodeIds: [`${storyId}-node-villain`]
    },
    {
      id: `${storyId}-time-16`,
      timeLabel: 'Day 16',
      summary: 'Danger phase forces live tactical tradeoffs.',
      relatedNodeIds: [`${storyId}-node-char-1`, `${storyId}-node-evidence-2`]
    },
    {
      id: `${storyId}-time-22`,
      timeLabel: 'Day 22',
      summary: 'Ultimatum stage creates irreversible branch pressure.',
      relatedNodeIds: [`${storyId}-node-villain`, `${storyId}-node-char-2`]
    },
    {
      id: `${storyId}-time-28`,
      timeLabel: 'Day 28',
      summary: 'Final resolution defines justice, containment, or compromise.',
      relatedNodeIds: [`${storyId}-node-villain`, `${storyId}-node-location`]
    }
  ];

  return { nodes, links, timeline };
}

function buildCampaignPlan(motif) {
  return {
    totalDays: 45,
    recommendedDays: 28,
    maxDays: 45,
    weeks: [
      {
        week: 1,
        label: 'Phase 1 - Intake (Days 1-10)',
        objective: `Stabilize witnesses and lock primary ${motif} evidence chain.`,
        keyMoments: ['Opening breach', 'first contradiction', 'trust fork']
      },
      {
        week: 2,
        label: 'Phase 2 - Escalation (Days 11-22)',
        objective: 'Map active interference and prevent narrative capture.',
        keyMoments: ['direct contact', 'channel contamination', 'operational pressure']
      },
      {
        week: 3,
        label: 'Phase 3 - Threat (Days 23-34)',
        objective: 'Handle live-risk decisions while preserving attribution clarity.',
        keyMoments: ['panic cycle', 'field exposure', 'safety triage']
      },
      {
        week: 4,
        label: 'Phase 4 - Reckoning (Days 35-45)',
        objective: 'Resolve final chronology and execute defensible endgame choice.',
        keyMoments: ['ultimatum', 'compromise offer', 'final confrontation']
      }
    ]
  };
}

function rewriteStory(dramaFile) {
  const dramaPath = join(dramaDir, dramaFile);
  const drama = readJson(dramaPath);
  if (drama.id === 'static-between-stations' && skipStatic) {
    return { storyId: drama.id, skipped: true, reason: 'kept existing bespoke director-cut package' };
  }

  const storyPath = join(storiesDir, `${drama.id}.story.json`);
  const story = (() => {
    try {
      return readJson(storyPath);
    } catch {
      return null;
    }
  })();
  const assets = loadManifestAssets(drama.id);
  const flavor = FLAVOR_BY_STORY[drama.id] || FLAVOR_BY_STORY['static-between-stations'];
  const motifs = flavor.motifs;
  const characters = normalizeCharacterList(story, drama);
  const operator = characters[0] || 'Lead Operator';
  const witnessPool = characters.slice(1);
  const mediaDesk = `${titleize(drama.id)} Field Desk`;
  const villainName = drama?.villain?.displayName || story?.villain?.displayName || 'Unknown Antagonist';

  const arcContact =
    firstAssetPublicPath(
      assets,
      (asset) => asset.modality === 'image' && asset.asset_type === 'arc_key_art' && /contact|act-1|beat-1/i.test(asset.asset_id || '')
    ) ||
    firstAssetPublicPath(assets, (asset) => asset.modality === 'image' && asset.asset_type === 'arc_key_art') ||
    drama.visualDeck?.heroImage ||
    `/visuals/stories/${drama.id}.svg`;
  const arcDisruption =
    firstAssetPublicPath(
      assets,
      (asset) => asset.modality === 'image' && asset.asset_type === 'arc_key_art' && /disruption|act-2|beat-3/i.test(asset.asset_id || '')
    ) ||
    arcContact;
  const arcEndgame =
    firstAssetPublicPath(
      assets,
      (asset) => asset.modality === 'image' && asset.asset_type === 'arc_key_art' && /endgame|act-3|beat-5/i.test(asset.asset_id || '')
    ) ||
    arcDisruption;
  const storyHero =
    firstAssetPublicPath(assets, (asset) => asset.modality === 'image' && asset.asset_type === 'story_key_art') ||
    arcEndgame;

  for (let index = 0; index < drama.beats.length; index += 1) {
    const beat = drama.beats[index];
    const day = index + 1;
    const dayLabel = `Day ${String(day).padStart(2, '0')}`;
    const stage = stageForDay(day);
    const stageMeta = STAGE_META[stage];
    const motif = pick(motifs, index);
    const cluePhrase = clueToPhrase(beat?.revealClueIds?.[0]);
    const dayTitle = pick(DAY_TITLES, index);
    const nextBeatId = day < drama.beats.length ? drama.beats[index + 1]?.id ?? null : null;
    const includeVillain = stage >= 2 || day === 3 || day === 6;
    const delays = stageDelays(stage, includeVillain);
    const witnessName = witnessPool.length > 0 ? pick(witnessPool, index) : operator;
    const location = story?.location || drama.location || 'the primary scene';
    const hook = story?.hook || drama.hook;

    beat.title = `${dayLabel} - ${dayTitle}`;
    beat.narrative = generateNarrative(stage, dayLabel, cluePhrase, motif, location, hook);
    beat.stage = stage;
    beat.actId = stageMeta.id;
    beat.actTitle = stageMeta.title;
    beat.unlockAfterSeconds = stage === 1 ? 660 : stage === 2 ? 720 : stage === 3 ? 780 : 840;
    beat.backgroundVisual =
      stage === 1 ? arcContact : stage === 2 ? arcDisruption : stage === 3 ? arcEndgame : storyHero;
    beat.defaultNextBeatId = nextBeatId;

    const operatorChannel = channelFor(index, ['SIGNAL', 'WHATSAPP', 'TELEGRAM', 'SMS']);
    const witnessChannel = channelFor(index, ['SMS', 'WHATSAPP', 'TELEGRAM', 'VOICE_MESSAGE', 'SIGNAL']);

    beat.incomingMessages = [
      {
        id: `${beat.id}-director-operator`,
        senderName: operator,
        role: 'operator',
        channel: operatorChannel,
        text: `${dayLabel} control: secure ${cluePhrase}, validate ${motif}, and keep evidence readable for first-time investigators under pressure.`,
        delaySeconds: delays[0],
        intensity: 30 + stage * 7
      },
      {
        id: `${beat.id}-director-witness`,
        senderName: witnessName,
        role: witnessName === operator ? 'operator' : 'witness',
        channel: witnessChannel,
        text: `I can confirm movement around ${motif}, but I need to know whether you trust this lead or think it is bait tied to ${cluePhrase}.`,
        delaySeconds: delays[1],
        intensity: 34 + stage * 7
      },
      {
        id: `${beat.id}-director-media`,
        senderName: mediaDesk,
        role: 'operator',
        channel: 'EMAIL',
        text: `Public framing window is narrowing. If you want this to land as investigation instead of rumor, give one verifiable detail anchored to ${cluePhrase}.`,
        delaySeconds: delays[2],
        intensity: 38 + stage * 6
      }
    ];

    if (includeVillain) {
      beat.incomingMessages.push({
        id: `${beat.id}-director-villain`,
        senderName: villainName,
        role: 'antagonist',
        channel: day % 2 === 0 ? 'SMS' : 'VOICE_MESSAGE',
        text:
          stage >= 4
            ? `Final warning: the branch you choose now will decide whether ${motif} becomes truth, containment, or compromise.`
            : `You keep calling ${cluePhrase} evidence. I call it the first line of your eventual confession.`,
        delaySeconds: delays[3],
        intensity: 52 + stage * 9
      });
    }

    const newOptions = authoredOptionsForStage(stage, beat.id, day, nextBeatId, cluePhrase, motif);
    if (Array.isArray(beat.responseOptions) && beat.responseOptions.length === newOptions.length) {
      beat.responseOptions = beat.responseOptions.map((existing, optionIndex) => ({
        ...existing,
        label: newOptions[optionIndex].label,
        summary: newOptions[optionIndex].summary,
        intent: newOptions[optionIndex].intent,
        nextBeatId: newOptions[optionIndex].nextBeatId,
        progressDelta: newOptions[optionIndex].progressDelta,
        reputationDelta: newOptions[optionIndex].reputationDelta,
        flagUpdates: {
          ...(existing.flagUpdates || {}),
          ...(newOptions[optionIndex].flagUpdates || {})
        }
      }));
    } else {
      beat.responseOptions = newOptions;
    }
  }

  const firstMotif = pick(motifs, 0);
  const clues = Array.from(
    new Set(
      drama.beats.flatMap((beat) => beat.revealClueIds || []).filter(Boolean)
    )
  );
  const artifacts = buildArtifactCards(drama.id, story, clues);

  drama.version = 'director-cut-v2';
  drama.generatedFromArg = false;
  drama.hook =
    story?.hook ||
    drama.hook ||
    `${titleize(drama.id)} now runs as a full cinematic investigation package with branch-weighted consequences.`;
  drama.tone = story?.tone || drama.tone || 'CINEMATIC';
  drama.subgenre = story?.subgenre || drama.subgenre;
  drama.location = story?.location || drama.location;
  drama.warnings = Array.isArray(story?.ageWarnings) && story.ageWarnings.length > 0 ? story.ageWarnings : drama.warnings;

  drama.playerBriefing = {
    roleTitle: `Lead Case Analyst - ${titleize(drama.id)} Taskforce`,
    callSign: '{{player_alias}}',
    recruitmentReason:
      'You were selected for contradiction-detection under pressure and your ability to keep novice teams oriented during crisis.',
    openingIncident: `At 02:17 equivalent local time, synchronized drops tied to ${firstMotif} triggered this case.`,
    personalStakes:
      'Witness survival, chain-of-custody integrity, and public truth all now depend on your branch choices.',
    firstDirective:
      'Protect people, preserve evidence, and keep every decision legible to first-time investigators.'
  };
  drama.caseFile = buildCaseFile(story, drama, firstMotif);
  drama.artifactCards = artifacts;
  drama.campaignPlan = buildCampaignPlan(firstMotif);
  drama.npcDossiers = buildNpcDossiers(story, villainName);
  drama.investigationBoard = buildInvestigationBoard(drama.id, story, drama, artifacts, villainName, firstMotif);
  drama.visualDeck = buildVisualDeck(drama.id, assets, drama.visualDeck?.heroImage);
  drama.replayHooks = Array.isArray(story?.replayHooks) && story.replayHooks.length > 0 ? story.replayHooks : drama.replayHooks;
  drama.sequelHooks = Array.isArray(story?.sequelHooks) && story.sequelHooks.length > 0 ? story.sequelHooks : drama.sequelHooks;
  drama.branchingMoments = Array.isArray(story?.branchingMoments) && story.branchingMoments.length > 0 ? story.branchingMoments : drama.branchingMoments;

  writeJson(dramaPath, drama);
  return {
    storyId: drama.id,
    skipped: false,
    beats: drama.beats.length,
    artifacts: drama.artifactCards.length,
    hero: drama.visualDeck?.heroImage || null
  };
}

const dramaFiles = readdirSync(dramaDir)
  .filter((file) => file.endsWith('.json') && file !== 'index.json')
  .sort();

const summary = dramaFiles.map(rewriteStory);

const indexRows = dramaFiles
  .map((file) => readJson(join(dramaDir, file)))
  .sort((a, b) => a.title.localeCompare(b.title))
  .map((story) => ({
    id: story.id,
    storyId: story.id,
    title: story.title,
    version: story.version || 'unknown',
    source: story.generatedFromArg ? 'arg-campaigns' : 'director-cut'
  }));

writeJson(join(dramaDir, 'index.json'), indexRows);
console.log('[director-cut] rewrite summary');
console.log(JSON.stringify(summary, null, 2));
