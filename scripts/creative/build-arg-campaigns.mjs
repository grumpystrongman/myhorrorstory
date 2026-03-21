import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const storyDir = join(repoRoot, 'docs', 'stories');
const outputRoot = join(repoRoot, 'apps', 'web', 'public', 'content', 'arg');
const dramaOutputRoot = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const docsRoot = join(repoRoot, 'docs', 'arg', 'campaigns');
const indexOutputFile = join(outputRoot, 'index.json');
const dramaIndexOutputFile = join(dramaOutputRoot, 'index.json');

const TOTAL_DAYS = 28;

const WEEK_PHASES = [
  {
    week: 1,
    range: [1, 7],
    id: 'DISCOVERY',
    label: 'Discovery & Curiosity',
    objective: 'Validate the first anomaly, establish trust baselines, and seed investigative obsession.'
  },
  {
    week: 2,
    range: [8, 14],
    id: 'ESCALATION',
    label: 'Escalation & Unease',
    objective: 'Push contradictions, introduce manipulative pressure, and degrade certainty.'
  },
  {
    week: 3,
    range: [15, 21],
    id: 'DANGER',
    label: 'Danger & Direct Involvement',
    objective: 'Force personal risk, urgent tradeoffs, and irreversible consequences.'
  },
  {
    week: 4,
    range: [22, 28],
    id: 'RESOLUTION',
    label: 'Resolution or Psychological Break',
    objective: 'Collapse competing truths into final judgement, compromise, or breakdown.'
  }
];

const ARTIFACT_TYPE_ROTATION = [
  'police_report',
  'handwritten_note',
  'journal_entry',
  'text_message_screenshot',
  'call_log',
  'voicemail_transcript',
  'security_footage_still',
  'crime_scene_photo',
  'marked_map',
  'receipt',
  'medical_record',
  'shipping_manifest'
];

const INTERACTION_CHANNEL_ROTATION = ['SIGNAL', 'WHATSAPP', 'TELEGRAM', 'SMS', 'EMAIL', 'VOICE_MESSAGE'];
const ODD_HOUR_WINDOWS = ['00:43', '01:17', '02:11', '03:33', '04:09'];
const PLAYER_INTENTS = ['FEAR', 'DEFIANCE', 'BARGAIN', 'CURIOSITY', 'DECEPTION', 'COMPLIANCE', 'SILENCE', 'ACCUSATION', 'QUESTION', 'THREAT'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pick(values, index, fallback = null) {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }
  return values[index % values.length] ?? values[0] ?? fallback;
}

function dayFileName(day) {
  return `day_${String(day).padStart(2, '0')}.json`;
}

function findPhaseForDay(day) {
  return WEEK_PHASES.find((entry) => day >= entry.range[0] && day <= entry.range[1]) ?? WEEK_PHASES[0];
}

function flattenBeats(story) {
  return asArray(story.acts).flatMap((act, actIndex) =>
    asArray(act.beats).map((beat, beatIndex) => ({
      ...beat,
      actId: act.id ?? `act-${actIndex + 1}`,
      actTitle: act.title ?? `Act ${actIndex + 1}`,
      beatOrder: beatIndex + 1
    }))
  );
}

function mapNpcRole(rawRole, index) {
  if (rawRole === 'HANDLER') {
    return index === 0 ? 'detective' : 'journalist';
  }
  if (rawRole === 'WITNESS') {
    return 'witness';
  }
  if (rawRole === 'SUSPECT') {
    return 'witness';
  }
  return index === 0 ? 'detective' : 'witness';
}

function ensureCoreNpcRoles(story) {
  const base = asArray(story.npcProfiles);
  const mapped = base.map((npc, index) => ({
    id: `npc.${slugify(npc.id ?? npc.displayName ?? `support-${index + 1}`)}`,
    role: mapNpcRole(npc.role, index),
    displayName: npc.displayName ?? `Contact ${index + 1}`,
    baselineEmotion: npc.baselineEmotion ?? 'guarded',
    personality: asArray(npc.personalityTraits),
    motivations: asArray(npc.motivations),
    trustBaseline: npc.trustBaseline ?? 45,
    trustCeiling: npc.trustCeiling ?? 86,
    secrets: asArray(npc.secrets).map((secret, secretIndex) => ({
      id: `${slugify(npc.id ?? npc.displayName ?? `npc-${index + 1}`)}-secret-${secretIndex + 1}`,
      summary: secret.summary ?? 'Withheld operational detail.',
      revealConditions: asArray(secret.revealConditions)
    })),
    deceptionRules: {
      lieWhen: ['player_trust_below_35', 'villain_pressure_above_70', 'question_targets_secret'],
      tellTruthWhen: ['player_presents_chain_of_custody', 'evidence_flagged_verified']
    },
    panicTriggers: ['direct_confrontation', 'voice_message_from_antagonist', 'unexpected_night_call']
  }));

  const existingRoles = new Set(mapped.map((entry) => entry.role));

  const detectiveFallback = mapped[0]
    ? {
        ...mapped[0],
        role: 'detective',
        id: 'npc.detective.primary',
        displayName: mapped[0].displayName
      }
    : {
        id: 'npc.detective.primary',
        role: 'detective',
        displayName: 'Detective Elias Voss',
        baselineEmotion: 'controlled',
        personality: ['observant', 'terse'],
        motivations: ['close the file before civilian casualties'],
        trustBaseline: 55,
        trustCeiling: 92,
        secrets: [
          {
            id: 'detective-secret-1',
            summary: 'Withheld one dispatch report to protect an informant.',
            revealConditions: ['player_flags.timeline_gap']
          }
        ],
        deceptionRules: {
          lieWhen: ['informant_at_risk'],
          tellTruthWhen: ['player_proves_data_integrity']
        },
        panicTriggers: ['partner_missing']
      };

  const witnessFallback = mapped[1]
    ? {
        ...mapped[1],
        role: 'witness',
        id: 'npc.witness.primary'
      }
    : {
        id: 'npc.witness.primary',
        role: 'witness',
        displayName: 'Nora Keel',
        baselineEmotion: 'shaken',
        personality: ['defensive', 'detail-focused'],
        motivations: ['stay alive', 'protect sibling'],
        trustBaseline: 38,
        trustCeiling: 78,
        secrets: [
          {
            id: 'witness-secret-1',
            summary: 'Altered one timestamp to hide their own location.',
            revealConditions: ['puzzle.day_06.solved']
          }
        ],
        deceptionRules: {
          lieWhen: ['player_accuses_without_evidence'],
          tellTruthWhen: ['player_shares_protective_plan']
        },
        panicTriggers: ['unknown_contact_message']
      };

  const journalistFallback = {
    id: 'npc.journalist.field',
    role: 'journalist',
    displayName: 'Mina Calder',
    baselineEmotion: 'probing',
    personality: ['persistent', 'skeptical'],
    motivations: ['publish before suppression', 'expose chain-of-command failures'],
    trustBaseline: 30,
    trustCeiling: 70,
    secrets: [
      {
        id: 'journalist-secret-1',
        summary: 'Accepted leaked material from a source linked to the antagonist.',
        revealConditions: ['flag.false_lead_thread_unmasked']
      }
    ],
    deceptionRules: {
      lieWhen: ['protecting_source_identity'],
      tellTruthWhen: ['player_agrees_off_record_exchange']
    },
    panicTriggers: ['legal_threat_notice', 'camera_stolen']
  };

  const antagonist = {
    id: 'npc.antagonist.primary',
    role: 'antagonist',
    displayName: story.villain?.displayName ?? 'Unknown Antagonist',
    baselineEmotion: 'cold',
    personality: [story.villain?.archetype ?? 'manipulative strategist'],
    motivations: [story.villain?.motive ?? 'reshape truth through controlled fear'],
    trustBaseline: 0,
    trustCeiling: 5,
    secrets: [
      {
        id: 'antagonist-secret-1',
        summary: 'Has direct access to at least one internal evidence channel.',
        revealConditions: ['day_18.completed', 'flag.hidden_truth_thread_critical']
      }
    ],
    deceptionRules: {
      lieWhen: ['always'],
      tellTruthWhen: ['truth_is_more_damaging_than_lie']
    },
    panicTriggers: []
  };

  const unknownContact = {
    id: 'npc.unknown.contact',
    role: 'unknown_contact',
    displayName: 'Unknown Contact',
    baselineEmotion: 'flat',
    personality: ['cryptic', 'timed'],
    motivations: ['steer investigation without revealing identity'],
    trustBaseline: 20,
    trustCeiling: 52,
    secrets: [
      {
        id: 'unknown-secret-1',
        summary: 'Identity intersects with official case administration records.',
        revealConditions: ['flag.main_thread_final_lock', 'day_24.completed']
      }
    ],
    deceptionRules: {
      lieWhen: ['player_too_close_to_identity'],
      tellTruthWhen: ['player_selects_high_morality_path']
    },
    panicTriggers: ['direct_name_guess']
  };

  const ensured = [...mapped];
  if (!existingRoles.has('detective')) {
    ensured.unshift(detectiveFallback);
  }
  if (!existingRoles.has('witness')) {
    ensured.push(witnessFallback);
  }
  if (!existingRoles.has('journalist')) {
    ensured.push(journalistFallback);
  }

  ensured.push(antagonist, unknownContact);

  return dedupeById(ensured);
}

function dedupeById(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value?.id || seen.has(value.id)) {
      continue;
    }
    seen.add(value.id);
    result.push(value);
  }
  return result;
}

function buildThreadCatalog(story) {
  const revealVariants = asArray(story.revealVariants);
  const clueEvidence = asArray(story.clueEvidenceList);
  const branchMoments = asArray(story.branchingMoments);
  const firstArc = asArray(story.arcMap)[0];
  const secondArc = asArray(story.arcMap)[1];
  const thirdArc = asArray(story.arcMap)[2];

  return [
    {
      id: 'thread.main_investigation',
      type: 'main',
      title: 'Primary Investigation',
      premise: firstArc?.summary ?? story.hook,
      objective: 'Establish an admissible chain-of-custody and identify the orchestrator.',
      anchorClues: clueEvidence.slice(0, 2)
    },
    {
      id: 'thread.side_mystery',
      type: 'side',
      title: 'Peripheral Incident',
      premise:
        secondArc?.summary ??
        `A related anomaly appears adjacent to ${story.location}, hinting a broader pattern.`,
      objective: 'Determine whether the side event is collateral damage or intentional staging.',
      anchorClues: clueEvidence.slice(1, 3)
    },
    {
      id: 'thread.hidden_truth',
      type: 'hidden_truth',
      title: 'Suppressed Truth',
      premise:
        revealVariants[0] ??
        'An administrative record indicates the case began months earlier under a different identity.',
      objective: 'Recover suppressed records that reframe motive and victim selection.',
      anchorClues: clueEvidence.slice(2, 4)
    },
    {
      id: 'thread.false_lead',
      type: 'false_lead',
      title: 'Manufactured Lead',
      premise:
        branchMoments[0] ??
        'A seemingly obvious suspect path appears engineered to split the investigation team.',
      objective: 'Expose deliberate misdirection before it burns key evidence time.',
      anchorClues: clueEvidence.slice(0, 1)
    },
    {
      id: 'thread.psychological_break',
      type: 'psychological',
      title: 'Psychological Pressure Arc',
      premise: thirdArc?.summary ?? 'Player communications are mirrored back with impossible timing.',
      objective: 'Preserve judgement while antagonist personalization escalates.',
      anchorClues: clueEvidence.slice(0, 4)
    }
  ];
}

function weekNarrativeScaffold(phaseId, dayInWeek) {
  const scaffolds = {
    DISCOVERY: [
      'An intake anomaly lands across multiple channels before dawn.',
      'Metadata drift appears between duplicate files and erodes confidence.',
      'A witness account conflicts with dispatch timing by exactly nine minutes.',
      'A dead account sends a fresh attachment with current geotag residue.',
      'Administrative records reveal prior attempts to bury this case.',
      'Evidence custody breaks for twenty-two minutes and no one logs it.',
      'The first branch point forces trust in a source you cannot verify.'
    ],
    ESCALATION: [
      'Friendly channels begin echoing antagonist phrasing.',
      'Recovered logs contain one corrected timestamp that changes motive.',
      'A journalist leak points to an internal collaborator.',
      'One evidence image contains a planted anomaly meant to bait fast conclusions.',
      'Unknown contact sends a warning that names your previous choice.',
      'A voicemail includes background audio from a location not yet disclosed.',
      'Second branch point determines whether public pressure or covert trace is prioritized.'
    ],
    DANGER: [
      'Direct interference interrupts calls and reroutes message threads.',
      'A witness goes dark after confirming a hidden ledger.',
      'Emergency dispatch references your alias instead of your legal profile.',
      'An antagonist demand threatens collateral unless evidence is withheld.',
      'A forged report nearly redirects the task force toward the wrong target.',
      'Unknown contact reveals personal detail only the player would recognize.',
      'Third branch point locks either protective extraction or aggressive exposure.'
    ],
    RESOLUTION: [
      'Cross-day clue map finally exposes the suppression mechanism.',
      'Recovered recordings reveal contradiction between public narrative and private orders.',
      'A trusted NPC admits one strategic lie and requests off-record forgiveness.',
      'The antagonist offers a final pact framed as damage control.',
      'Evidence board converges, but one key artifact remains unreliable.',
      'Final puzzle forces interpretation of mutually exclusive truths.',
      'Resolution day decides justice, compromise, corruption, or psychological fracture.'
    ]
  };

  return pick(scaffolds[phaseId], dayInWeek - 1, scaffolds.DISCOVERY[0]);
}

function buildImagePrompt(story, artifactType, clue, day, phase, isMisleading) {
  const dayStamp = `Day ${String(day).padStart(2, '0')}`;
  const deceptionTag = isMisleading ? 'Subtle misleading cue included.' : 'No intentional misdirection.';

  return {
    style: 'hyper-realistic forensic horror, analog imperfection, grounded true-crime framing',
    prompt: [
      `${story.title} ARG artifact ${dayStamp}.`,
      `Type: ${artifactType}.`,
      `Clue focus: ${clue}.`,
      `Location: ${story.location}.`,
      `Phase: ${phase.label}.`,
      'Camera: Canon EOS R6, 35mm prime, ISO 3200, f/1.8, 1/40 shutter.',
      'Visual defects: sensor noise, halation bloom, slight motion blur, fingerprint smudge, timestamp burn-in.',
      'Lighting: practical sodium-vapor spill with deep shadow falloff, imperfect white balance.',
      'Composition: evidence-forward framing, handwritten marks, believable wear, no cinematic polish.',
      deceptionTag
    ].join(' '),
    negativePrompt:
      'clean CGI, fantasy look, glossy studio lighting, over-sharpened edges, watermark, logo, gore fetish, cartoon style'
  };
}

function buildAudioPrompt(story, artifactType, clue, day, phase) {
  return {
    style: 'psychological dread, industrial ambience, noisy field recording authenticity',
    prompt: [
      `${story.title} ${artifactType} audio cue for day ${day}.`,
      `Clue anchor: ${clue}.`,
      `Phase: ${phase.label}.`,
      'Texture: low drone bed, distant metallic resonance, intermittent room-tone dropouts.',
      'Include one decipherable spoken fragment and one environmental clue (HVAC hum, rail click, siren bleed, pager chirp).',
      'Add mild tape flutter, codec smear, clipped transients, and uneven dynamic floor to keep it grounded.'
    ].join(' '),
    durationSeconds: phase.id === 'DANGER' ? 28 : 18
  };
}

function createArtifact({
  story,
  day,
  phase,
  clue,
  sourceNpcId,
  threadId,
  artifactType,
  isMisleading
}) {
  const dayToken = String(day).padStart(2, '0');
  const artifactId = `${story.id}-d${dayToken}-${slugify(artifactType)}-${slugify(clue).slice(0, 28)}`;

  return {
    id: artifactId,
    day,
    title: `${story.title} - Day ${dayToken} ${artifactType.replaceAll('_', ' ')}`,
    type: artifactType,
    sourceNpcId,
    threadId,
    clueTags: [slugify(clue), `phase.${phase.id.toLowerCase()}`],
    misleading: isMisleading,
    reliabilityScore: isMisleading ? 0.42 : 0.84,
    summary: isMisleading
      ? `Artifact appears authoritative but contains one intentional inconsistency tied to ${clue}.`
      : `Artifact advances verified evidence chain and supports deduction around ${clue}.`,
    imagePrompt: buildImagePrompt(story, artifactType, clue, day, phase, isMisleading),
    audioPrompt: buildAudioPrompt(story, artifactType, clue, day, phase)
  };
}

function buildPuzzle(day, story, clue, phase) {
  if (day % 2 !== 0 && phase.id !== 'RESOLUTION') {
    return null;
  }

  const solutionKeyword = `${slugify(clue).replaceAll('-', '_').toUpperCase()}_${String(day).padStart(2, '0')}`;
  const puzzleType = pick(
    ['cipher', 'timeline_consistency', 'cross_reference', 'metadata_diff', 'call_path_reconstruction'],
    day - 1,
    'cipher'
  );

  return {
    id: `${story.id}-puzzle-day-${String(day).padStart(2, '0')}`,
    type: puzzleType,
    title: `Day ${String(day).padStart(2, '0')} Puzzle`,
    objective: `Use the new evidence and prior logs to resolve contradiction around ${clue}.`,
    instructions: [
      'Extract timestamp, sender route, and one lexical anomaly from today\'s artifacts.',
      'Compare against at least one artifact from a previous day.',
      'Submit a concise deduction statement before unlocking the next high-risk contact.'
    ],
    hintLadder: [
      'Hint 1: One timestamp appears valid but is offset from device timezone.',
      'Hint 2: Cross-check sender metadata against yesterday\'s call-log route.',
      `Hint 3: The answer keyword starts with ${solutionKeyword.slice(0, 4)}.`
    ],
    answerValidation: {
      mode: 'keyword',
      acceptedKeywords: [solutionKeyword]
    },
    reward: {
      unlockFlags: [`flag.puzzle.day_${String(day).padStart(2, '0')}.solved`],
      revealsThread: 'thread.hidden_truth'
    },
    failureConsequence:
      phase.id === 'DANGER'
        ? 'Antagonist sends a personalized pressure message and witness trust drops.'
        : 'Next day unlock remains delayed until one additional interaction is logged.'
  };
}

function buildInteractions({ day, story, phase, npcs, clue, priorDecisionFlag }) {
  const detective = npcs.find((npc) => npc.role === 'detective') ?? npcs[0];
  const witness = npcs.find((npc) => npc.role === 'witness') ?? npcs[1] ?? npcs[0];
  const journalist = npcs.find((npc) => npc.role === 'journalist') ?? npcs[2] ?? npcs[0];
  const antagonist = npcs.find((npc) => npc.role === 'antagonist') ?? npcs[0];
  const unknownContact = npcs.find((npc) => npc.role === 'unknown_contact') ?? npcs[0];
  const baseChannel = pick(INTERACTION_CHANNEL_ROTATION, day - 1, 'SIGNAL');

  const interactions = [
    {
      id: `day-${String(day).padStart(2, '0')}-detective-brief`,
      actorId: detective.id,
      role: detective.role,
      channel: baseChannel,
      mode: 'message',
      scheduled: {
        offsetMinutes: 12 + (day % 5) * 7,
        oddHourWindow: false
      },
      messageTemplate:
        '{{player_alias}}, before you move: chain-of-custody on today\'s drop is unstable. Confirm ' +
        `${clue} and tell me if your last call still stands (${priorDecisionFlag}).`,
      expectedPlayerActions: ['acknowledge', 'request_evidence_hash', 'commit_next_step'],
      noResponseFallback: {
        afterMinutes: 180,
        escalation: 'detective_followup_call'
      }
    },
    {
      id: `day-${String(day).padStart(2, '0')}-witness-ping`,
      actorId: witness.id,
      role: witness.role,
      channel: pick(INTERACTION_CHANNEL_ROTATION, day + 1, 'WHATSAPP'),
      mode: 'message',
      scheduled: {
        offsetMinutes: 40 + (day % 4) * 9,
        oddHourWindow: day % 3 === 0
      },
      messageTemplate:
        'I heard my own words on a line I never called. If you still trust {{trusted_contact}}, do not forward this to the wrong desk.',
      expectedPlayerActions: ['ask_followup', 'validate_metadata', 'offer_protection'],
      noResponseFallback: {
        afterMinutes: 240,
        escalation: 'witness_withdraws_temporarily'
      }
    },
    {
      id: `day-${String(day).padStart(2, '0')}-journalist-thread`,
      actorId: journalist.id,
      role: journalist.role,
      channel: 'EMAIL',
      mode: 'email',
      scheduled: {
        offsetMinutes: 95 + (day % 6) * 11,
        oddHourWindow: false
      },
      messageTemplate:
        'Off-record: I can publish tonight, but your previous choice is already circulating. I need one verification point tied to ' +
        `${clue}.`,
      expectedPlayerActions: ['share_partial_truth', 'delay_publication', 'decline_comment'],
      noResponseFallback: {
        afterMinutes: 360,
        escalation: 'journalist_posts_without_context'
      }
    }
  ];

  if (day >= 8) {
    interactions.push({
      id: `day-${String(day).padStart(2, '0')}-antagonist-contact`,
      actorId: antagonist.id,
      role: antagonist.role,
      channel: pick(INTERACTION_CHANNEL_ROTATION, day + 2, 'TELEGRAM'),
      mode: phase.id === 'DANGER' ? 'call_simulation' : 'message',
      scheduled: {
        offsetMinutes: 130 + (day % 5) * 13,
        oddHourWindow: true,
        oddHourClock: pick(ODD_HOUR_WINDOWS, day - 8, ODD_HOUR_WINDOWS[0])
      },
      messageTemplate:
        'You chose {{last_major_choice}} and still think this is about evidence. Check the mirror timestamp and decide who you are willing to sacrifice.',
      expectedPlayerActions: ['defy', 'comply_temporarily', 'counter_question'],
      noResponseFallback: {
        afterMinutes: 120,
        escalation: 'antagonist_targets_secondary_contact'
      }
    });
  }

  if (day % 3 === 0 || phase.id === 'RESOLUTION') {
    interactions.push({
      id: `day-${String(day).padStart(2, '0')}-unknown-contact`,
      actorId: unknownContact.id,
      role: unknownContact.role,
      channel: 'SMS',
      mode: 'message',
      scheduled: {
        offsetMinutes: 170 + (day % 7) * 5,
        oddHourWindow: true,
        oddHourClock: pick(ODD_HOUR_WINDOWS, day + 2, ODD_HOUR_WINDOWS[1])
      },
      messageTemplate:
        'I watched your response window close. If you still want the living truth, compare day 03 to today before sunrise.',
      expectedPlayerActions: ['ask_identity', 'follow_instruction', 'report_to_detective'],
      noResponseFallback: {
        afterMinutes: 90,
        escalation: 'unknown_contact_sends_redacted_attachment'
      }
    });
  }

  return interactions;
}

function buildThreadUpdates({ threads, day, beat, phase, clue, branchMoment }) {
  return threads.map((thread, threadIndex) => {
    if (thread.type === 'main') {
      return {
        threadId: thread.id,
        status: day <= 7 ? 'opening' : day <= 21 ? 'active' : 'closing',
        update: `${beat.title}: ${beat.narrative}`,
        clueReference: clue
      };
    }

    if (thread.type === 'hidden_truth') {
      return {
        threadId: thread.id,
        status: day >= 10 ? 'surfacing' : 'latent',
        update:
          day >= 10
            ? `Cross-day mismatch suggests archival tampering tied to ${clue}.`
            : `Minor anomaly logged but not yet actionable.`,
        clueReference: day >= 10 ? clue : null
      };
    }

    if (thread.type === 'false_lead') {
      return {
        threadId: thread.id,
        status: day % 4 === 0 ? 'misdirecting' : 'cooldown',
        update:
          day % 4 === 0
            ? `A plausible shortcut appears: ${branchMoment ?? 'quick suspect closure'}.`
            : 'No new movement on false lead this cycle.',
        clueReference: day % 4 === 0 ? clue : null
      };
    }

    if (thread.type === 'psychological') {
      return {
        threadId: thread.id,
        status: phase.id === 'DANGER' || phase.id === 'RESOLUTION' ? 'spiking' : 'building',
        update:
          phase.id === 'DANGER' || phase.id === 'RESOLUTION'
            ? 'NPC language mirrors player choices with unsettling precision.'
            : 'Subtle repetition appears in unrelated communications.'
      };
    }

    return {
      threadId: thread.id,
      status: threadIndex % 2 === 0 ? 'active' : 'monitoring',
      update: `Peripheral signal tied to ${clue} remains unresolved.`
    };
  });
}

function buildDistraction(day, clue, story) {
  if (day % 3 !== 1) {
    return null;
  }

  return {
    id: `${story.id}-distraction-day-${String(day).padStart(2, '0')}`,
    title: `Red Herring ${String(day).padStart(2, '0')}`,
    summary:
      'A polished leak points toward an emotionally satisfying suspect, but timeline math does not support it.',
    whyItFeelsPlausible: `It references ${clue} with convincing formatting and apparent chain-of-custody metadata.`,
    hiddenFault:
      'Embedded timezone marker is impossible for the claimed capture device, indicating staged fabrication.'
  };
}

function buildAwarenessMoments(day) {
  return [
    {
      trigger: 'if decision.log contains any entry for previous day',
      lineTemplate:
        'You repeated yesterday\'s pattern ({{last_major_choice}}). People who survive this case learn faster.'
    },
    {
      trigger: 'if trusted contact changed within last 3 days',
      lineTemplate:
        'Your channel loyalty shifted to {{trusted_contact}}. That tells me what you fear most.'
    }
  ].slice(0, day >= 9 ? 2 : 1);
}

function buildDayPackage({ story, day, beats, threads, npcs, clueEvidence, branchMoments }) {
  const phase = findPhaseForDay(day);
  const dayInWeek = ((day - 1) % 7) + 1;
  const beatStride = Math.max(Math.ceil(TOTAL_DAYS / Math.max(beats.length, 1)), 1);
  const beatIndex = clamp(Math.floor((day - 1) / beatStride), 0, Math.max(beats.length - 1, 0));
  const beat = beats[beatIndex] ?? {
    id: `beat-fallback-${day}`,
    title: 'Fallback Beat',
    narrative: story.hook,
    actTitle: 'Fallback'
  };
  const clue = pick(clueEvidence, day - 1, `${story.id}-clue-${String(day).padStart(2, '0')}`);
  const branchMoment = pick(branchMoments, day - 1, null);
  const priorDecisionFlag =
    day === 1 ? 'none' : `decision.day_${String(day - 1).padStart(2, '0')}.primary`;
  const artifactType = pick(ARTIFACT_TYPE_ROTATION, day - 1, ARTIFACT_TYPE_ROTATION[0]);
  const misleadingPrimary = day % 5 === 0 || (phase.id === 'ESCALATION' && day % 3 === 0);
  const primaryArtifact = createArtifact({
    story,
    day,
    phase,
    clue,
    sourceNpcId: pick(npcs, day - 1, npcs[0]).id,
    threadId: pick(threads, day - 1, threads[0]).id,
    artifactType,
    isMisleading: misleadingPrimary
  });

  const secondaryArtifact =
    day % 4 === 0 || phase.id === 'DANGER'
      ? createArtifact({
          story,
          day,
          phase,
          clue: pick(clueEvidence, day + 3, clue),
          sourceNpcId: pick(npcs, day + 2, npcs[0]).id,
          threadId: pick(threads, day + 1, threads[0]).id,
          artifactType: pick(ARTIFACT_TYPE_ROTATION, day + 2, ARTIFACT_TYPE_ROTATION[1]),
          isMisleading: !misleadingPrimary && day % 8 === 0
        })
      : null;

  const interactions = buildInteractions({
    day,
    story,
    phase,
    npcs,
    clue,
    priorDecisionFlag
  });

  const puzzle = buildPuzzle(day, story, clue, phase);
  const distraction = buildDistraction(day, clue, story);
  const narrativeScaffold = weekNarrativeScaffold(phase.id, dayInWeek);

  return {
    id: `day_${String(day).padStart(2, '0')}`,
    storyId: story.id,
    day,
    week: phase.week,
    phase: phase.id,
    phaseLabel: phase.label,
    headline: `${phase.label} - Day ${String(day).padStart(2, '0')}`,
    releaseWindow: {
      campaignOffsetHours: (day - 1) * 24,
      oddHourDelivery: day % 3 === 0 || day >= 15,
      preferredOddHourClock: pick(ODD_HOUR_WINDOWS, day - 1, ODD_HOUR_WINDOWS[0])
    },
    unlockConditions: {
      requiredCompletedDays: day === 1 ? [] : [day - 1],
      requiredFlags: day <= 2 ? [] : [`flag.day_${String(day - 1).padStart(2, '0')}.complete`],
      requiredInteractions:
        day === 1
          ? []
          : [`day-${String(day - 1).padStart(2, '0')}-detective-brief`],
      minHoursSincePrevious: phase.id === 'DANGER' ? 10 : 14,
      branchConditions:
        day === 8 || day === 15 || day === 22
          ? [
              {
                flag: `decision.day_${String(day - 1).padStart(2, '0')}.primary`,
                operator: 'exists'
              }
            ]
          : []
    },
    narrativeProgression: {
      summary: narrativeScaffold,
      beatAnchorId: beat.id,
      beatAnchorTitle: beat.title,
      beatNarrative: beat.narrative,
      threatEscalation:
        phase.id === 'DISCOVERY'
          ? 'ambient monitoring'
          : phase.id === 'ESCALATION'
            ? 'social and informational pressure'
            : phase.id === 'DANGER'
              ? 'direct operational threat'
              : 'identity-level confrontation',
      playerInvolvementShift:
        phase.id === 'DISCOVERY'
          ? 'observer to trusted analyst'
          : phase.id === 'ESCALATION'
            ? 'analyst to implicated participant'
            : phase.id === 'DANGER'
              ? 'participant to active target'
              : 'target to final arbiter'
    },
    threadUpdates: buildThreadUpdates({
      threads,
      day,
      beat,
      phase,
      clue,
      branchMoment
    }),
    evidenceDrops: [primaryArtifact, ...(secondaryArtifact ? [secondaryArtifact] : [])],
    interactions,
    puzzle,
    distraction,
    awarenessMoments: buildAwarenessMoments(day),
    progressionEffectsOnCompletion: {
      setFlags: [`flag.day_${String(day).padStart(2, '0')}.complete`],
      setDecisionPlaceholders: [`decision.day_${String(day).padStart(2, '0')}.primary`],
      npcTrustDelta: [
        {
          npcId: npcs.find((npc) => npc.role === 'detective')?.id ?? npcs[0].id,
          delta: phase.id === 'DANGER' ? -2 : 1
        },
        {
          npcId: npcs.find((npc) => npc.role === 'witness')?.id ?? npcs[0].id,
          delta: phase.id === 'DISCOVERY' ? 2 : phase.id === 'RESOLUTION' ? -1 : 0
        }
      ],
      unlockNextAfterHours: phase.id === 'RESOLUTION' ? 8 : 12
    },
    personalization: {
      requiredContextTokens: [
        'player_alias',
        'preferred_channel',
        'last_major_choice',
        'trusted_contact'
      ],
      adaptiveLines: [
        'Reference previous choice without breaking realism.',
        'Acknowledge response latency as if monitored by live actors.',
        'Escalate or soften tone based on trust flags and solved puzzles.'
      ]
    }
  };
}

function phaseToStage(phaseId) {
  if (phaseId === 'DISCOVERY') {
    return 1;
  }
  if (phaseId === 'ESCALATION') {
    return 2;
  }
  if (phaseId === 'DANGER') {
    return 3;
  }
  return 4;
}

function mapInteractionRoleToDramaRole(role) {
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

function normalizeInteractionTemplate(value) {
  return String(value ?? '')
    .replaceAll('{{player_alias}}', 'Operator')
    .replaceAll('{{preferred_channel}}', 'secure thread')
    .replaceAll('{{last_major_choice}}', 'your last choice')
    .replaceAll('{{trusted_contact}}', 'your trusted contact');
}

function expectedActionToIntent(action) {
  const normalized = String(action ?? '').toLowerCase();
  if (normalized.includes('defy')) {
    return 'DEFIANCE';
  }
  if (normalized.includes('comply')) {
    return 'COMPLIANCE';
  }
  if (normalized.includes('counter') || normalized.includes('ask') || normalized.includes('question')) {
    return 'QUESTION';
  }
  if (normalized.includes('report') || normalized.includes('accuse')) {
    return 'ACCUSATION';
  }
  if (normalized.includes('delay') || normalized.includes('silence')) {
    return 'SILENCE';
  }
  if (normalized.includes('protect') || normalized.includes('offer')) {
    return 'BARGAIN';
  }
  if (normalized.includes('validate') || normalized.includes('analyze') || normalized.includes('follow')) {
    return 'CURIOSITY';
  }
  if (normalized.includes('decline') || normalized.includes('deny')) {
    return 'DECEPTION';
  }
  return 'QUESTION';
}

function buildReputationDeltaForIntent(intent) {
  const baseline = {
    trustworthiness: 0,
    aggression: 0,
    curiosity: 0,
    deception: 0,
    morality: 0
  };

  if (intent === 'DEFIANCE') {
    return { ...baseline, aggression: 2, trustworthiness: -1 };
  }
  if (intent === 'COMPLIANCE') {
    return { ...baseline, trustworthiness: 1, morality: 1 };
  }
  if (intent === 'QUESTION') {
    return { ...baseline, curiosity: 2 };
  }
  if (intent === 'ACCUSATION') {
    return { ...baseline, aggression: 1, trustworthiness: -1 };
  }
  if (intent === 'SILENCE') {
    return { ...baseline, trustworthiness: -1 };
  }
  if (intent === 'BARGAIN') {
    return { ...baseline, deception: 1, morality: -1 };
  }
  if (intent === 'CURIOSITY') {
    return { ...baseline, curiosity: 3 };
  }
  if (intent === 'DECEPTION') {
    return { ...baseline, deception: 2, trustworthiness: -2 };
  }
  return baseline;
}

function buildResponseOptionsForDay(dayPackage, nextDayId) {
  const actionPool = Array.from(
    new Set(
      asArray(dayPackage.interactions).flatMap((interaction) => asArray(interaction.expectedPlayerActions))
    )
  );
  const selectedActions = actionPool.length > 0 ? actionPool.slice(0, 3) : ['acknowledge', 'ask_followup'];

  return selectedActions.map((action, index) => {
    const intent = expectedActionToIntent(action);
    const safeIntent = PLAYER_INTENTS.includes(intent) ? intent : 'QUESTION';
    return {
      id: `${dayPackage.id}.choice.${slugify(action || `option-${index + 1}`)}`,
      label: String(action || `option ${index + 1}`)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      intent: safeIntent,
      summary: `Day ${String(dayPackage.day).padStart(2, '0')} response strategy: ${String(action).replaceAll('_', ' ')}.`,
      nextBeatId: nextDayId,
      progressDelta: 3,
      reputationDelta: buildReputationDeltaForIntent(safeIntent),
      flagUpdates: {
        [`decision.day_${String(dayPackage.day).padStart(2, '0')}.primary`]: String(action),
        [`flag.day_${String(dayPackage.day).padStart(2, '0')}.interaction_logged`]: true
      }
    };
  });
}

function buildFrontendIntegrationPlan(story, campaign) {
  return {
    storyId: story.id,
    designPrinciples: [
      'Prioritize message-first immersion with asynchronous pacing.',
      'Keep the player anchored to evidence, not abstract lore dumps.',
      'Surface contradictions visually on timeline and board layers.'
    ],
    surfaces: {
      evidenceBoard: {
        description: 'Pinboard linking artifacts, NPCs, and thread statuses with confidence indicators.',
        requiredWidgets: ['node cards', 'relation lines', 'clue confidence meter', 'misdirection markers'],
        updateTriggers: ['artifact drop', 'thread status shift', 'puzzle solved']
      },
      messengerSurface: {
        description: 'Phone-like thread showing delayed NPC interactions across channels.',
        requiredWidgets: ['channel badge', 'typing delay simulation', 'odd-hour alerts', 'voice/call simulation card'],
        inputModes: ['free text', 'guided response actions', 'puzzle answer submit']
      },
      timelineSurface: {
        description: 'Day-by-day chronology with branch anchors and unresolved contradictions.',
        requiredWidgets: ['day cards', 'branch markers', 'lock state indicator', 'phase progression ribbon']
      },
      filesSurface: {
        description: 'Case file cabinet for reports, screenshots, maps, and recordings.',
        requiredWidgets: ['artifact filter by type', 'verified vs misleading tags', 'audio waveform preview']
      }
    },
    mobileModel: {
      shell: 'iphone-style chat viewport with slide-over evidence tray',
      breakpoints: ['360w', '768w', '1024w'],
      controls: ['thumb-safe response chips', 'sticky compose bar', 'swipe timeline peek']
    },
    instrumentation: {
      events: [
        'arg_day_opened',
        'arg_interaction_submitted',
        'arg_puzzle_attempted',
        'arg_artifact_inspected',
        'arg_branch_decision_committed'
      ],
      qualitySignals: ['daily retention', 'interaction completion rate', 'puzzle solve latency', 'branch distribution']
    },
    rollout: {
      mode: 'feature flag',
      target: '/play and /simulations',
      fallback: '/content/drama compatibility package'
    },
    references: {
      campaignVersion: campaign.version,
      durationDays: campaign.durationDays
    }
  };
}

function buildExpansionSystem(story, campaign) {
  return {
    storyId: story.id,
    campaignVersion: campaign.version,
    expansionSteps: [
      {
        step: 1,
        title: 'Clone Campaign Template',
        detail: 'Duplicate campaign manifest and day files, preserving IDs and unlock schema.'
      },
      {
        step: 2,
        title: 'Swap Narrative Inputs',
        detail: 'Replace hook, location, villain profile, clue evidence, and branch anchors.'
      },
      {
        step: 3,
        title: 'Regenerate Artifacts and Prompts',
        detail: 'Run generator to rebuild artifact definitions, image/audio prompts, and NPC dialogue packs.'
      },
      {
        step: 4,
        title: 'Tune Difficulty and Cadence',
        detail: 'Adjust puzzle cadence, no-response escalations, and odd-hour windows per audience.'
      },
      {
        step: 5,
        title: 'Validate Full Month Playthrough',
        detail: 'Run simulation and smoke tests across all days and branch anchors before release.'
      }
    ],
    schemaContracts: {
      requiredFiles: ['campaign.json', 'day_01.json...day_28.json', 'npc_profiles.json', 'artifact_definitions.json'],
      optionalFiles: ['frontend_integration_plan.json', 'expansion_system.json', 'npc_dialogue_system_prompts.json']
    },
    authoringGuardrails: [
      'Never ship disconnected day entries; each day must reference prior progression flags.',
      'Maintain at least one misleading artifact every escalation cycle.',
      'Include at least one awareness moment from day 09 onward.'
    ]
  };
}

function buildCompatibilityDramaPackage(story, campaign, days, npcs) {
  const npcById = new Map(npcs.map((npc) => [npc.id, npc]));

  const beats = days.map((dayPackage, index) => {
    const nextDayId = index + 1 < days.length ? days[index + 1].id : null;
    const incomingMessages = asArray(dayPackage.interactions).map((interaction, interactionIndex) => {
      const actor = npcById.get(interaction.actorId);
      const delaySecondsRaw = Math.round((interaction.scheduled?.offsetMinutes ?? interactionIndex * 8) / 10);
      return {
        id: interaction.id,
        senderName: actor?.displayName ?? interaction.role.replaceAll('_', ' '),
        role: mapInteractionRoleToDramaRole(interaction.role),
        channel: interaction.channel ?? 'SMS',
        text: normalizeInteractionTemplate(interaction.messageTemplate),
        delaySeconds: clamp(delaySecondsRaw, 1, 32),
        intensity: clamp(20 + phaseToStage(dayPackage.phase) * 12 + interactionIndex * 4, 18, 90)
      };
    });

    const revealClueIds = asArray(dayPackage.evidenceDrops).map((artifact) => artifact.id);
    const fallbackNarratorMessage = {
      id: `${dayPackage.id}.narrator`,
      senderName: 'Case Dispatch',
      role: 'narrator',
      channel: 'DOCUMENT_DROP',
      text: `${dayPackage.narrativeProgression.summary} Evidence focus: ${revealClueIds[0] ?? 'pending intake'}.`,
      delaySeconds: 2,
      intensity: 24
    };

    return {
      id: dayPackage.id,
      actId: dayPackage.phase,
      actTitle: dayPackage.phaseLabel,
      title: dayPackage.headline,
      narrative: dayPackage.narrativeProgression.summary,
      stage: phaseToStage(dayPackage.phase),
      unlockAfterSeconds: Math.max(30, (dayPackage.unlockConditions?.minHoursSincePrevious ?? 12) * 60),
      revealClueIds,
      incomingMessages: incomingMessages.length > 0 ? incomingMessages : [fallbackNarratorMessage],
      responseOptions: buildResponseOptionsForDay(dayPackage, nextDayId),
      defaultNextBeatId: nextDayId,
      backgroundVisual: `/visuals/stories/${story.id}.svg`
    };
  });

  const timeline = days.map((dayPackage) => ({
    id: `${dayPackage.id}.timeline`,
    timeLabel: `Day ${String(dayPackage.day).padStart(2, '0')}`,
    summary: dayPackage.narrativeProgression.summary,
    relatedNodeIds: asArray(dayPackage.evidenceDrops).map((artifact) => artifact.id)
  }));

  const artifactNodes = days.flatMap((dayPackage) =>
    asArray(dayPackage.evidenceDrops).map((artifact) => ({
      id: artifact.id,
      type: 'evidence',
      label: artifact.title,
      summary: artifact.summary
    }))
  );

  const threadNodes = asArray(campaign.threads).map((thread) => ({
    id: thread.id,
    type: 'thread',
    label: thread.title,
    summary: thread.premise
  }));

  const npcNodes = npcs.slice(0, 8).map((npc) => ({
    id: npc.id,
    type: 'npc',
    label: npc.displayName,
    summary: `${npc.role}: ${npc.baselineEmotion}`
  }));

  const links = [];
  for (const dayPackage of days) {
    for (const artifact of asArray(dayPackage.evidenceDrops)) {
      if (artifact.threadId) {
        links.push({
          fromId: artifact.id,
          toId: artifact.threadId,
          relation: 'supports',
          confidence: artifact.reliabilityScore ?? 0.7
        });
      }
      if (artifact.sourceNpcId) {
        links.push({
          fromId: artifact.sourceNpcId,
          toId: artifact.id,
          relation: 'submitted',
          confidence: 0.74
        });
      }
    }
  }

  const endings = [
    {
      id: `${story.id}-ending-justice`,
      title: 'Documented Justice',
      type: 'JUSTICE',
      summary: 'Evidence chain survives scrutiny and responsible parties are exposed.',
      epilogue: 'The investigation closes publicly, but residual files imply a wider network.',
      sequelHook: 'A new sealed case number appears in your inbox at 03:11.'
    },
    {
      id: `${story.id}-ending-pyrrhic`,
      title: 'Pyrrhic Containment',
      type: 'PYRRHIC',
      summary: 'The immediate threat is contained, but key truths remain buried.',
      epilogue: 'Witnesses are safe for now, yet official records are permanently altered.',
      sequelHook: 'Unknown Contact sends a checksum that references a second operation.'
    },
    {
      id: `${story.id}-ending-corruption`,
      title: 'Compromised Truth',
      type: 'CORRUPTION',
      summary: 'Player choices preserve stability by accepting manipulated facts.',
      epilogue: 'Case status becomes classified and public narrative diverges from internal logs.',
      sequelHook: 'An antagonist fragment congratulates your efficiency.'
    },
    {
      id: `${story.id}-ending-unresolved`,
      title: 'Psychological Break',
      type: 'UNRESOLVED',
      summary: 'Contradictions remain unresolved and trust collapses across all channels.',
      epilogue: 'Your board is complete but no version of events can be proven cleanly.',
      sequelHook: 'A mirrored transcript appears using your own phrasing.'
    }
  ];

  const communityPuzzles = days
    .filter((dayPackage) => dayPackage.puzzle !== null)
    .slice(0, 4)
    .map((dayPackage) => ({
      id: dayPackage.puzzle.id,
      title: dayPackage.puzzle.title,
      objective: dayPackage.puzzle.objective,
      shards: asArray(dayPackage.evidenceDrops).slice(0, 3).map((artifact, index) => ({
        id: `${dayPackage.puzzle.id}.shard.${index + 1}`,
        heldBy: artifact.type,
        content: artifact.summary
      })),
      rewardClueId: dayPackage.puzzle.reward?.revealsThread ?? 'thread.hidden_truth',
      failureConsequence: dayPackage.puzzle.failureConsequence,
      solutionKeyword: dayPackage.puzzle.answerValidation?.acceptedKeywords?.[0] ?? 'UNKNOWN'
    }));

  return {
    id: campaign.id,
    title: campaign.title,
    version: `${campaign.version}-compat`,
    hook: campaign.hook,
    tone: campaign.tone,
    subgenre: campaign.subgenre,
    location: campaign.location,
    warnings: asArray(campaign.ageWarnings),
    channels: asArray(campaign.deliveryModel?.supportedChannels).concat('DOCUMENT_DROP'),
    villain: {
      id: story.villain?.id ?? `${story.id}-villain`,
      displayName: story.villain?.displayName ?? 'Unknown Antagonist',
      archetype: story.villain?.archetype ?? 'manipulative strategist',
      worldview: story.villain?.worldview ?? 'Truth is mutable under pressure.',
      motive: story.villain?.motive ?? 'Control the investigation outcome.'
    },
    arcs: WEEK_PHASES.map((phase) => ({
      id: `${story.id}-${phase.id.toLowerCase()}`,
      title: phase.label,
      stage: phase.id,
      summary: phase.objective,
      primaryRuleIds: [`rule.${phase.id.toLowerCase()}.pacing`, `rule.${phase.id.toLowerCase()}.pressure`]
    })),
    beats,
    endings,
    investigationBoard: {
      nodes: [...threadNodes, ...npcNodes, ...artifactNodes.slice(0, 80)],
      links: links.slice(0, 140),
      timeline
    },
    playerBriefing: {
      roleTitle: 'Case Analyst',
      callSign: '{{player_alias}}',
      recruitmentReason:
        'You were selected because your prior casework identified contradiction patterns others ignored.',
      openingIncident:
        'At 02:17 local, synchronized drops across four channels triggered this investigation.',
      personalStakes: `${story.villain?.displayName ?? 'The antagonist'} has begun adapting communications to your decisions.`,
      firstDirective: 'Verify evidence chain before any public move and protect vulnerable contacts.'
    },
    campaignPlan: {
      totalDays: campaign.durationDays,
      weeks: campaign.weeklyStructure.map((week) => ({
        week: week.week,
        label: week.label,
        objective: week.objective,
        keyMoments: days
          .filter((dayPackage) => dayPackage.week === week.week)
          .slice(0, 2)
          .map((dayPackage) => dayPackage.headline)
      }))
    },
    npcDossiers: npcs.map((npc) => ({
      id: npc.id,
      displayName: npc.displayName,
      role: npc.role,
      baselineEmotion: npc.baselineEmotion,
      motivations: npc.motivations,
      trustBaseline: npc.trustBaseline,
      trustCeiling: npc.trustCeiling,
      notableSecret: npc.secrets[0]?.summary ?? 'Undisclosed'
    })),
    communityPuzzles,
    visualDeck: {
      heroImage: `/visuals/stories/${story.id}.svg`,
      assets: artifactNodes.slice(0, 12).map((node) => ({
        id: node.id,
        title: node.label,
        category: 'evidence',
        path: `/visuals/stories/${story.id}.svg`,
        promptHint: node.summary
      }))
    },
    replayHooks: asArray(story.replayHooks),
    sequelHooks: asArray(story.sequelHooks),
    branchingMoments: asArray(story.branchingMoments),
    generatedFromArg: true
  };
}

function buildCampaignManifest(story, days, threads) {
  const branchMoments = asArray(story.branchingMoments);
  const puzzleDays = days.filter((day) => day.puzzle !== null).map((day) => day.day);

  return {
    id: story.id,
    version: 'arg-v1',
    title: story.title,
    hook: story.hook,
    subgenre: story.subgenre,
    tone: story.tone,
    location: story.location,
    ageWarnings: asArray(story.ageWarnings),
    durationDays: TOTAL_DAYS,
    weeklyStructure: WEEK_PHASES.map((phase) => ({
      week: phase.week,
      label: phase.label,
      dayRange: phase.range,
      objective: phase.objective
    })),
    overarchingPlotArc: {
      centralQuestion:
        story.hook ?? 'Who is controlling the narrative and why is the player being targeted?',
      campaignPromise:
        'A four-week investigation where evidence, conversation, and timing decisions shape the ending.',
      resolutionModes: ['justice', 'compromised_truth', 'corruption_pact', 'psychological_break']
    },
    threads,
    progressionFlags: [
      'flag.case_opened',
      'flag.main_thread_active',
      'flag.side_thread_unstable',
      'flag.hidden_truth_thread_critical',
      'flag.false_lead_thread_unmasked',
      'flag.psychological_pressure_peak',
      'flag.final_resolution_locked'
    ],
    branchAnchors: [
      {
        id: 'branch.anchor.week1',
        day: 7,
        label: branchMoments[0] ?? 'Trust Source Fork'
      },
      {
        id: 'branch.anchor.week2',
        day: 14,
        label: branchMoments[1] ?? 'Public Exposure vs Quiet Trace'
      },
      {
        id: 'branch.anchor.week3',
        day: 21,
        label: branchMoments[2] ?? 'Protection vs Prosecution'
      }
    ],
    puzzleCadence: {
      puzzleDays,
      expectedDifficultyRamp: [2, 3, 4, 5],
      philosophy: 'Grounded deduction over abstract riddles.'
    },
    deliveryModel: {
      supportedChannels: ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL', 'EMAIL', 'VOICE_MESSAGE'],
      oddHourWindows: ODD_HOUR_WINDOWS,
      delayedResponsePolicy:
        'Important interactions can hold for 1-6 hours to preserve world persistence and tension.'
    },
    personalizationModel: {
      tokens: ['{{player_alias}}', '{{preferred_channel}}', '{{last_major_choice}}', '{{trusted_contact}}'],
      awarenessRules: [
        'NPCs may reference choices from previous day interactions.',
        'Antagonist may mirror wording from player decisions under high pressure.',
        'Unknown contact should feel observant but plausible, never supernatural omniscience.'
      ]
    },
    fileManifest: {
      campaign: 'campaign.json',
      days: days.map((day) => dayFileName(day.day)),
      npcProfiles: 'npc_profiles.json',
      artifactDefinitions: 'artifact_definitions.json',
      sampleSevenDayExperience: 'sample_7_day_experience.json',
      npcDialoguePrompts: 'npc_dialogue_system_prompts.json',
      frontendIntegrationPlan: 'frontend_integration_plan.json',
      expansionSystem: 'expansion_system.json',
      compatibilityRuntime: '../drama/{storyId}.json'
    }
  };
}

function buildDialoguePromptPack(story, npcs, campaign) {
  return {
    storyId: story.id,
    globalSystemPrompt: [
      'You are an in-world character in a grounded psychological horror investigation.',
      'Never break immersion. Never mention AI, prompts, or out-of-world mechanics.',
      'Use concise, plausible messaging language matching your channel.',
      'Reference player history via tokens only when context supports it.',
      'If uncertain, ask clarifying in-world questions and preserve dread through implication.'
    ].join(' '),
    rolePrompts: npcs.map((npc) => ({
      npcId: npc.id,
      role: npc.role,
      displayName: npc.displayName,
      prompt: [
        `You are ${npc.displayName}, role=${npc.role}.`,
        `Baseline emotion: ${npc.baselineEmotion}.`,
        `Motivations: ${npc.motivations.join('; ') || 'protect the investigation outcome'}.`,
        `Secrets: ${npc.secrets.map((entry) => entry.summary).join(' | ') || 'withhold unstable facts until trust improves'}.`,
        'Behavior rules:',
        '- React to {{last_major_choice}} when relevant.',
        '- Mention {{trusted_contact}} only when testing player loyalty.',
        '- If pressure rises, shorten sentences and avoid definitive claims unless evidence is verified.',
        '- Lying/deflection is allowed per deception rules, but remain plausible and internally consistent.'
      ].join(' ')
    })),
    routingRules: {
      defaultChannelPriority: campaign.deliveryModel.supportedChannels,
      lateNightEscalation:
        'Use odd-hour windows for antagonist or unknown-contact disruptions, especially after ignored interactions.',
      callSimulationTrigger:
        'If day phase is DANGER and player delay exceeds threshold, switch next antagonist interaction to call simulation.'
    }
  };
}

function buildSampleSevenDayExperience(campaign, days) {
  const sampleDays = days.slice(0, 7).map((day) => ({
    day: day.day,
    phase: day.phaseLabel,
    headline: day.headline,
    narrativeProgression: day.narrativeProgression,
    threadUpdates: day.threadUpdates,
    evidenceDrops: day.evidenceDrops,
    interactions: day.interactions,
    puzzle: day.puzzle,
    distraction: day.distraction,
    awarenessMoments: day.awarenessMoments
  }));

  return {
    storyId: campaign.id,
    title: `${campaign.title} - 7 Day Immersion Sample`,
    generatedFromCampaignVersion: campaign.version,
    objective:
      'Demonstrate full daily flow with narrative progression, clues, interactions, puzzle cadence, and immersion-aware personalization.',
    days: sampleDays
  };
}

function buildStoryCampaignMarkdown(campaign, days) {
  const lines = [];
  lines.push(`# ${campaign.title} - 28 Day ARG Campaign`);
  lines.push('');
  lines.push(`- Story ID: \`${campaign.id}\``);
  lines.push(`- Duration: ${campaign.durationDays} days`);
  lines.push(`- Hook: ${campaign.hook}`);
  lines.push(`- Tone: ${campaign.tone}`);
  lines.push(`- Subgenre: ${campaign.subgenre}`);
  lines.push('');
  lines.push('## Weekly Structure');
  for (const week of campaign.weeklyStructure) {
    lines.push(`- Week ${week.week} (${week.label}) days ${week.dayRange[0]}-${week.dayRange[1]}: ${week.objective}`);
  }
  lines.push('');
  lines.push('## Thread Map');
  for (const thread of campaign.threads) {
    lines.push(`- ${thread.title} [${thread.type}]: ${thread.premise}`);
  }
  lines.push('');
  lines.push('## First 7 Days Snapshot');
  for (const day of days.slice(0, 7)) {
    lines.push(`### Day ${String(day.day).padStart(2, '0')} - ${day.headline}`);
    lines.push(`- Narrative: ${day.narrativeProgression.summary}`);
    lines.push(`- Beat anchor: ${day.narrativeProgression.beatAnchorTitle}`);
    lines.push(
      `- Evidence: ${day.evidenceDrops.map((artifact) => `${artifact.title}${artifact.misleading ? ' (misleading)' : ''}`).join('; ')}`
    );
    lines.push(`- Interactions: ${day.interactions.map((item) => `${item.role} via ${item.channel}`).join('; ')}`);
    lines.push(`- Puzzle: ${day.puzzle ? day.puzzle.title : 'none'}`);
    lines.push('');
  }
  lines.push('## Delivery Model');
  lines.push(`- Channels: ${campaign.deliveryModel.supportedChannels.join(', ')}`);
  lines.push(`- Odd-hour windows: ${campaign.deliveryModel.oddHourWindows.join(', ')}`);
  lines.push('');
  lines.push('## Frontend Surfaces');
  lines.push('- Evidence board: linked artifact graph with confidence and misdirection cues.');
  lines.push('- Messages: asynchronous channel feed with odd-hour interruptions and call simulations.');
  lines.push('- Timeline: day-by-day progression with branch anchors and unresolved contradictions.');
  lines.push('- Files: filterable case cabinet for reports, logs, screenshots, and audio drops.');
  lines.push('');
  lines.push('## Expansion System');
  lines.push('- Clone template, replace narrative inputs, regenerate assets/prompts, retune cadence, rerun simulation.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function loadStories() {
  const files = (await readdir(storyDir))
    .filter((file) => file.endsWith('.story.json'))
    .sort((left, right) => left.localeCompare(right));

  const stories = [];
  for (const file of files) {
    const raw = await readFile(join(storyDir, file), 'utf8');
    stories.push(JSON.parse(raw));
  }

  return stories;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(dramaOutputRoot, { recursive: true });
  await mkdir(docsRoot, { recursive: true });

  const stories = await loadStories();
  const generated = [];
  const generatedDrama = [];

  for (const story of stories) {
    const storyOutputDir = join(outputRoot, story.id);
    await mkdir(storyOutputDir, { recursive: true });

    const beats = flattenBeats(story);
    const npcs = ensureCoreNpcRoles(story);
    const threads = buildThreadCatalog(story);
    const clueEvidence = asArray(story.clueEvidenceList);
    const branchMoments = asArray(story.branchingMoments);

    const days = [];
    for (let day = 1; day <= TOTAL_DAYS; day += 1) {
      days.push(
        buildDayPackage({
          story,
          day,
          beats,
          threads,
          npcs,
          clueEvidence,
          branchMoments
        })
      );
    }

    const campaign = buildCampaignManifest(story, days, threads);
    const artifactDefinitions = dedupeById(days.flatMap((day) => day.evidenceDrops));
    const dialoguePromptPack = buildDialoguePromptPack(story, npcs, campaign);
    const sampleSeven = buildSampleSevenDayExperience(campaign, days);
    const frontendIntegrationPlan = buildFrontendIntegrationPlan(story, campaign);
    const expansionSystem = buildExpansionSystem(story, campaign);
    const compatibilityDramaPackage = buildCompatibilityDramaPackage(story, campaign, days, npcs);

    await writeFile(join(storyOutputDir, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf8');
    await writeFile(join(storyOutputDir, 'npc_profiles.json'), JSON.stringify(npcs, null, 2), 'utf8');
    await writeFile(
      join(storyOutputDir, 'artifact_definitions.json'),
      JSON.stringify(artifactDefinitions, null, 2),
      'utf8'
    );
    await writeFile(
      join(storyOutputDir, 'npc_dialogue_system_prompts.json'),
      JSON.stringify(dialoguePromptPack, null, 2),
      'utf8'
    );
    await writeFile(
      join(storyOutputDir, 'sample_7_day_experience.json'),
      JSON.stringify(sampleSeven, null, 2),
      'utf8'
    );
    await writeFile(
      join(storyOutputDir, 'frontend_integration_plan.json'),
      JSON.stringify(frontendIntegrationPlan, null, 2),
      'utf8'
    );
    await writeFile(join(storyOutputDir, 'expansion_system.json'), JSON.stringify(expansionSystem, null, 2), 'utf8');

    for (const day of days) {
      await writeFile(join(storyOutputDir, dayFileName(day.day)), JSON.stringify(day, null, 2), 'utf8');
    }

    await writeFile(
      join(dramaOutputRoot, `${story.id}.json`),
      JSON.stringify(compatibilityDramaPackage, null, 2),
      'utf8'
    );

    const campaignDocPath = join(docsRoot, `${story.id}.md`);
    await writeFile(campaignDocPath, buildStoryCampaignMarkdown(campaign, days), 'utf8');

    generated.push({
      storyId: story.id,
      title: story.title,
      durationDays: TOTAL_DAYS,
      outputDir: `content/arg/${story.id}`,
      dayFileCount: days.length,
      artifactCount: artifactDefinitions.length
    });
    generatedDrama.push({
      id: story.id,
      storyId: story.id,
      title: story.title,
      version: compatibilityDramaPackage.version,
      source: 'arg-campaigns'
    });
  }

  await writeFile(indexOutputFile, JSON.stringify(generated, null, 2), 'utf8');
  await writeFile(dramaIndexOutputFile, JSON.stringify(generatedDrama, null, 2), 'utf8');
  console.log(`[arg-campaigns] Generated ${generated.length} ARG campaigns in ${outputRoot}`);
  console.log(`[arg-campaigns] Wrote ${generatedDrama.length} compatibility drama packages in ${dramaOutputRoot}`);
}

main().catch((error) => {
  console.error('[arg-campaigns] Failed:', error);
  process.exit(1);
});
