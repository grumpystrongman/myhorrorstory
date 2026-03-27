import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dramaDir = join(process.cwd(), 'apps', 'web', 'public', 'content', 'drama');

const STORY_STYLE_KITS = {
  'black-chapel-ledger': {
    incident: 'a post-midnight bell sequence and unsigned debt entry',
    objective: 'prove which clergy-adjacent operator is monetizing memory debt through staged haunt evidence',
    risk: 'public religious panic and retaliatory copycat confessions',
    settingThread: 'cathedral archive district'
  },
  'crown-of-salt': {
    incident: 'a relic transit manifest that updates after customs lock',
    objective: 'trace the smuggling command chain and expose the ritual laundering network',
    risk: 'port shutdown and retaliatory disappearances',
    settingThread: 'salt-harbor catacomb route'
  },
  'dead-channel-protocol': {
    incident: 'a ghost dispatch app publishing outage and casualty predictions',
    objective: 'identify the operator behind predictive panic campaigns and recover source orchestration logs',
    risk: 'grid instability and citywide trust collapse in emergency channels',
    settingThread: 'substation relay mesh'
  },
  'midnight-lockbox': {
    incident: 'a storage unit voicemail thread from an account with no legal renter',
    objective: 'prove beneficiary control of the lockbox network and recover the motive hidden in inherited recordings',
    risk: 'witness extortion and evidence resale',
    settingThread: 'after-hours storage corridors'
  },
  'red-creek-winter': {
    incident: 'fresh body-discovery alerts synchronized with forged alibi drops',
    objective: 'resolve whether killings are opportunistic cover or directed by a single scheduler',
    risk: 'mob suspicion and wrongful accusations in a small-town loop',
    settingThread: 'frozen county service roads'
  },
  'signal-from-kharon-9': {
    incident: 'telemetry packets from a decommissioned orbital array referencing private behavior',
    objective: 'attribute the transmission chain and determine whether crew-loss records were falsified',
    risk: 'defense-level narrative suppression and civilian misinformation',
    settingThread: 'deep-space signal relay stack'
  },
  'tape-17-pinewatch': {
    incident: 'self-rewriting found-footage logs with changing timestamps',
    objective: 'prove which editor node is inserting timeline edits into recovered ranger tapes',
    risk: 'search-team misdirection and survival-route failures',
    settingThread: 'pinewatch ranger perimeter'
  },
  'the-fourth-tenant': {
    incident: 'rent and maintenance activity for an apartment that should not legally exist',
    objective: 'identify occupancy fraud operators and link deaths to lease-chain manipulation',
    risk: 'building evacuation panic and evidence contamination',
    settingThread: 'tenement service core'
  },
  'the-harvest-men': {
    incident: 'ritual-selection notices tied to missing persons and crop-failure myths',
    objective: 'separate engineered terror from inherited folklore and expose organizer control points',
    risk: 'community radicalization and retaliatory violence',
    settingThread: 'rural harvest circuit'
  },
  'ward-1908': {
    incident: 'patient charts mutating overnight inside a closed psychiatric facility',
    objective: 'prove who is rewriting institutional memory and why discharge records were buried',
    risk: 'family-targeted intimidation and archival destruction',
    settingThread: 'abandoned ward records spine'
  }
};

const DAY_BEAT_PASSES = [
  {
    narrative:
      'Opening breach. Multiple channels deliver the first impossible drop before dawn. Your first responsibility is to freeze provenance and define a beginner-readable timeline before fear-based interpretations harden into public fact.',
    operator:
      'Lock one verified anchor in writing before we interpret motive. If the first anchor drifts, every later conclusion inherits that error.',
    witness:
      'I can stay on record if you prove this drop was staged, not supernatural. Show me one technical contradiction and I keep talking.',
    desk:
      'Day 1 objective: establish source confidence, protect witness stability, and state the mystery in plain language.'
  },
  {
    narrative:
      'Administrative fracture appears. Ledger, manifest, or archival notes now contradict closure-era records. The case shifts from anomaly detection to tamper attribution.',
    operator:
      'Treat paperwork as contested evidence. Capture scans, hash every revision, and annotate what changed versus what merely looks suspicious.',
    witness:
      'This record detail is wrong in a way only an insider would miss. Someone copied the form, not the workflow behind it.',
    desk:
      'Build chronology in three lines: original event, tamper moment, current consequence.'
  },
  {
    narrative:
      'Witness contradiction day. Human recollection and machine logs diverge by minutes that matter. Your job is to reduce heat and increase signal.',
    operator:
      'Interview for verifiable sequence, not dramatic confession. Calm witnesses produce usable chronology.',
    witness:
      'I remember the sound pattern exactly, but not the order people entered. If you map entry logs first, I can correct the rest.',
    desk:
      'Ask cleanly: what was seen, what was heard, what can be independently verified.'
  },
  {
    narrative:
      'Unscheduled drop arrives from dormant infrastructure credentials. It validates against old rules but fails under current systems, signaling deliberate environment emulation.',
    operator:
      'Run legacy and modern validation side by side. We need proof of mimicry, not a claim of weirdness.',
    witness:
      'The format is authentic enough to fool operations at speed. The payload is where the forgery leaks.',
    desk:
      'Document mismatch vectors and preserve screenshots before takedown or edit.'
  },
  {
    narrative:
      'Psychological contact begins. Coordinated calls or clips echo private details and attempt to destabilize investigative confidence.',
    operator:
      'Separate emotional impact from evidentiary value. Capture pattern, interval, and delivery metadata first.',
    witness:
      'They used a memory no outsider should know. If this is synthetic, someone had intimate source material.',
    desk:
      'Keep objectives explicit so new players do not mistake fear cues for solved clues.'
  },
  {
    narrative:
      'Archive breach indicates surveillance of your process. A transcript references internal behavior before publication windows open.',
    operator:
      'Assume observation. Rotate sensitive channel labels and minimize speculative chatter in shared threads.',
    witness:
      'The drop mirrors your exact language from prior decisions. Someone is profiling your workflow, not guessing.',
    desk:
      'Operational hygiene day: verify, then communicate. Never the reverse.'
  },
  {
    narrative:
      'Trust fork. Allies provide mutually exclusive explanations containing mixed truth and targeted misdirection.',
    operator:
      'Force all accounts onto one minute grid. Unsupported gaps are evidence, not inconvenience.',
    witness:
      'Both stories can sound sincere. Only one survives timestamp pressure.',
    desk:
      'End of first arc: players should now understand what they are solving and why each branch matters.'
  },
  {
    narrative:
      'Contamination phase starts. New media arrives with correct wrapper metadata but impossible capture signatures.',
    operator:
      'Declare provenance confidence before discussing narrative content. Format authenticity is not truth.',
    witness:
      'The breaths match one source, the room tone matches another. Someone is compositing trust.',
    desk:
      'Teach the contamination rule in-app: verify origin, then infer intent.'
  },
  {
    narrative:
      'A bait location or lure artifact appears with private naming conventions embedded. The antagonist is signaling intimate visibility into your internal map.',
    operator:
      'No physical movement without remote confirmation and structural risk check.',
    witness:
      'That private label should not exist outside our board. Someone leaked or mirrored internal references.',
    desk:
      'Convert bait into attribution by preserving geodata, routing logs, and source headers.'
  },
  {
    narrative:
      'Protective logistics leak in near-real time. This indicates automated forwarding compromise or insider exfiltration.',
    operator:
      'Move critical handling to manual chain and isolate automated notification paths.',
    witness:
      'They knew decoy details. This was not lucky interception.',
    desk:
      'State consequence clearly: process leaks now threaten both safety and case integrity.'
  },
  {
    narrative:
      'Authority impersonation day. High-confidence voice/style mimicry pushes false urgent instructions.',
    operator:
      'All destructive commands now require dual verification phrase and second-channel confirmation.',
    witness:
      'It sounded real enough to trigger action. That is the attack surface.',
    desk:
      'Novice guidance: urgency plus authority without corroboration equals high-risk deception.'
  },
  {
    narrative:
      'Impossible supply or procurement record surfaces, linking present operations to dead entities or nonviable routes.',
    operator:
      'Treat as mixed-truth artifact. Validate each line item physically or through independent source.',
    witness:
      'This path exists on paper, not in legitimate operations.',
    desk:
      'Connect finance/logistics anomalies directly to motive and method hypotheses.'
  },
  {
    narrative:
      'Archive tamper confirmed. Prior evidence revisions remove one critical contextual detail without changing headline content.',
    operator:
      'Recover cold-storage hashes and lock immutable versioning for all media categories.',
    witness:
      'The missing detail changes who could have been present. That is not accidental cleanup.',
    desk:
      'Player task: compare versions, isolate meaningful delta, infer why that delta was targeted.'
  },
  {
    narrative:
      'Timed pressure call attempts to force premature accusation under public clock conditions.',
    operator:
      'Do not let an ultimatum define burden of proof. We control standards or lose the case.',
    witness:
      'Wrong naming now becomes permanent narrative, even if later disproven.',
    desk:
      'Require rationale logging in plain language for branch transparency.'
  },
  {
    narrative:
      'Recovered archival media reframes a historical event and reopens central causality assumptions.',
    operator:
      'Authenticate first, transcribe with uncertainty markers second, conclude last.',
    witness:
      'This recording conflicts with sworn statements made during closure proceedings.',
    desk:
      'Danger phase begins. Every claim must include confidence and disproof pathway.'
  },
  {
    narrative:
      'Hidden network map reveals adaptive routing tied to your prior choices. Adversary behavior is reactive, not static.',
    operator:
      'Model branch-to-risk coupling explicitly. Strategy decisions now alter threat geometry.',
    witness:
      'These nodes were never in official diagrams. Someone built parallel infrastructure.',
    desk:
      'Explain to players how decision pace influences expansion of hostile surface area.'
  },
  {
    narrative:
      'Critical minutes disappear from official logs while secondary systems still imply activity.',
    operator:
      'Build official timeline and reconstructed timeline side by side. Treat mismatch as primary evidence.',
    witness:
      'That gap is where testimony changed and pressure was applied.',
    desk:
      'Anchor emotional beats to verifiable sequence so tension stays solvable.'
  },
  {
    narrative:
      'Panic wave event: edited drops trigger public confusion and unsafe movement across active locations.',
    operator:
      'Split response between narrative containment and physical safety controls.',
    witness:
      'Fake dispatch artifacts are propagating faster than corrections.',
    desk:
      'Protect civilians without collapsing evidentiary traceability.'
  },
  {
    narrative:
      'Pattern marks across media, documents, and audio indicate coded continuity and historical operator fingerprinting.',
    operator:
      'Resolve pattern grammar before assigning authorship.',
    witness:
      'Only legacy staff would recognize this notation pattern.',
    desk:
      'Translate symbols into player-usable mechanics: where seen, what encoded, what unlocked.'
  },
  {
    narrative:
      'Reroute trace links active campaign to neglected infrastructure blind spots managed through proxy controls.',
    operator:
      'Secure infrastructure logs before legal or maintenance lockdown removes access.',
    witness:
      'If that path remains active, another synchronized wave is feasible.',
    desk:
      'Method-proof beat: show end-to-end technical path clearly.'
  },
  {
    narrative:
      'Witness collapse follows targeted drop containing unreleased internal content, implying queue siphon or insider compromise.',
    operator:
      'Freeze export channels and prioritize witness safety protocol immediately.',
    witness:
      'I can continue if confidentiality is real, not aspirational.',
    desk:
      'End of danger arc: urgency must remain understandable, not chaotic.'
  },
  {
    narrative:
      'Ultimatum day forces explicit tradeoff framing between immediate safety outcomes and full truth exposure.',
    operator:
      'Respond with evidence-backed terms, not binary panic acceptance.',
    witness:
      'A short-term save can become long-term recurrence if attribution is buried.',
    desk:
      'Players must articulate and own ethical tradeoffs at this stage.'
  },
  {
    narrative:
      'Identity dossier emerges with mixed authenticity, giving a plausible suspect frame but incomplete prosecutable closure.',
    operator:
      'Do not equate identification with proof. Verify through independent records.',
    witness:
      'Recognition helps, but it cannot replace source-backed attribution.',
    desk:
      'Make burden-of-proof distinction explicit in UI copy and branch notes.'
  },
  {
    narrative:
      'Legacy files expose suppressed risk documentation that connects historical negligence to present operations.',
    operator:
      'Build negligence-to-intent bridge only where documentary and behavioral evidence align.',
    witness:
      'This warning existed earlier and was deliberately sidelined.',
    desk:
      'Integrate historical motive with present method to prevent arbitrary endings.'
  },
  {
    narrative:
      'Chronology hearing prep: competing narratives must be reduced to one coherent, defensible sequence.',
    operator:
      'Write chronology as if hostile review is guaranteed.',
    witness:
      'Order errors will be weaponized against every witness.',
    desk:
      'Comprehension checkpoint: can a novice explain the case in five verifiable steps?'
  },
  {
    narrative:
      'Compromise offer arrives with short-term stability upside and long-term truth cost.',
    operator:
      'Log the offer and decide on-record. Off-book negotiation is structural corruption.',
    witness:
      'The fast calm option may seed the next cycle.',
    desk:
      'Branch consequence clarity is mandatory here.'
  },
  {
    narrative:
      'Countdown board phase. Remaining unresolved contradictions are now sequenced into public release windows.',
    operator:
      'Resolve highest civilian-impact contradictions first and document in strict order.',
    witness:
      'Missing one window compounds downstream damage.',
    desk:
      'Execution discipline day: resolve, document, communicate.'
  },
  {
    narrative:
      'Final reckoning. Enough evidence exists for justice, containment, compromise, or collapse. The final choice defines what future investigators inherit.',
    operator:
      'Choose the ending you can defend with evidence, ethics, and consequence awareness.',
    witness:
      'Tonight becomes the permanent record. Make it checkable.',
    desk:
      'End-state criteria: coherent motive, verified method, clear timeline, explicit branch consequence.'
  }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function titleize(value) {
  return String(value)
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cluePhraseFromId(clueId) {
  if (!clueId) {
    return 'core evidence thread';
  }

  const normalized = String(clueId).replace(/^.*?-d\d+-/, '');
  if (normalized.includes('spectrogram-of-confession')) return 'spectrogram confession chain';
  if (normalized.includes('maintenance-ledger-anomaly')) return 'maintenance ledger anomaly';
  if (normalized.includes('turnstile-camera-still')) return 'turnstile camera still';
  if (normalized.includes('relay-room-access-hash')) return 'relay room access hash';
  return normalized.replaceAll('-', ' ');
}

function stageForDay(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function stageDelay(stage) {
  if (stage === 1) return [4, 15, 28, 42];
  if (stage === 2) return [3, 13, 24, 36];
  if (stage === 3) return [2, 11, 21, 32];
  return [2, 10, 18, 28];
}

function ensureMessageShape(message, fallback) {
  if (message) {
    return { ...message };
  }
  return {
    id: fallback.id,
    senderName: fallback.senderName,
    role: fallback.role,
    channel: fallback.channel,
    text: fallback.text,
    delaySeconds: fallback.delaySeconds,
    intensity: fallback.intensity
  };
}

function rewriteStoryFile(fileName) {
  if (!fileName.endsWith('.json') || fileName === 'index.json') {
    return null;
  }

  const path = join(dramaDir, fileName);
  const data = readJson(path);
  if (!data.id || data.id === 'static-between-stations') {
    return null;
  }

  const kit = STORY_STYLE_KITS[data.id];
  if (!kit || !Array.isArray(data.beats)) {
    return null;
  }

  const characters = Array.isArray(data?.npcDossiers)
    ? data.npcDossiers.map((npc) => npc.displayName).filter(Boolean)
    : [];
  const operatorName = characters[0] || data?.playerBriefing?.callSign || 'Lead Operator';
  const witnessName = characters[1] || 'Primary Witness';
  const deskName = `${titleize(data.id)} Field Desk`;
  const villainName = data?.villain?.displayName || 'Unknown Antagonist';

  data.version = 'director-cut-v3-catalog-authored';
  data.playerBriefing = {
    roleTitle: `Senior Incident Analyst - ${titleize(data.id)} Response Cell`,
    callSign: '{{player_alias}}',
    recruitmentReason:
      'You were selected for high-pressure contradiction analysis and your ability to keep novice investigators oriented during live uncertainty.',
    openingIncident: `Initial trigger: ${kit.incident} inside ${kit.settingThread}.`,
    personalStakes: `If you lose chronology control, ${kit.risk} become likely within one escalation cycle.`,
    firstDirective:
      'Establish verifiable sequence first, protect witnesses second, and only then escalate publicly.'
  };

  data.caseFile = {
    objective: `Resolve ${data.title} and ${kit.objective}.`,
    primaryQuestion: `Who controls the active manipulation path in ${kit.settingThread}, and what truth are they preventing from becoming durable record?`,
    operationWindow: '72-hour stabilization, then progressive escalation toward final branch lock.',
    successCriteria: [
      'Clear chronology that can be understood and repeated by first-time players.',
      'Witness testimony that remains coherent under adversarial reinterpretation.',
      'Evidence provenance recorded before narrative interpretation.',
      'Final branch chosen with explicit ethical and operational rationale.'
    ],
    failureConsequences: [
      'Manipulated media becomes accepted public truth.',
      'Witness trust collapses and testimony fragments.',
      'Operational panic outruns forensic verification.',
      'Antagonist-owned narrative persists into sequel arc.'
    ]
  };

  data.campaignPlan = {
    totalDays: 45,
    recommendedDays: 28,
    maxDays: 45,
    weeks: [
      {
        week: 1,
        label: 'Week 1 - Breach & Validation',
        objective: `Anchor first contradiction set across ${kit.settingThread}.`,
        keyMoments: ['Opening breach', 'record fracture', 'trust fork']
      },
      {
        week: 2,
        label: 'Week 2 - Interference & Exposure',
        objective: 'Survive contamination, impersonation, and adaptive bait operations.',
        keyMoments: ['Contamination', 'trap site', 'tamper confirmation']
      },
      {
        week: 3,
        label: 'Week 3 - Active Threat',
        objective: 'Protect lives while preserving prosecution-grade chronology.',
        keyMoments: ['Recovered media', 'panic wave', 'network attribution']
      },
      {
        week: 4,
        label: 'Week 4 - Ultimatum & Judgement',
        objective: 'Close motive-method-accountability loop and resolve final tradeoffs.',
        keyMoments: ['Ultimatum', 'legacy file', 'final reckoning']
      }
    ]
  };

  data.beats = data.beats.map((beat, index) => {
    const pass = DAY_BEAT_PASSES[index];
    if (!pass) {
      return beat;
    }

    const day = index + 1;
    const stage = stageForDay(day);
    const [d0, d1, d2, d3] = stageDelay(stage);
    const cluePhrase = cluePhraseFromId(beat?.revealClueIds?.[0]);
    const location = data.location || kit.settingThread;
    const narrative = `${pass.narrative} Active thread: ${cluePhrase}. Location focus: ${location}.`;

    const incoming = Array.isArray(beat.incomingMessages) ? [...beat.incomingMessages] : [];

    incoming[0] = ensureMessageShape(incoming[0], {
      id: `${beat.id}-director-operator`,
      senderName: operatorName,
      role: 'operator',
      channel: 'SIGNAL',
      text: '',
      delaySeconds: d0,
      intensity: 36
    });
    incoming[0].text = `${operatorName}: ${pass.operator}`;
    incoming[0].delaySeconds = d0;

    incoming[1] = ensureMessageShape(incoming[1], {
      id: `${beat.id}-director-witness`,
      senderName: witnessName,
      role: 'witness',
      channel: 'SMS',
      text: '',
      delaySeconds: d1,
      intensity: 40
    });
    incoming[1].text = `${witnessName}: ${pass.witness}`;
    incoming[1].delaySeconds = d1;

    incoming[2] = ensureMessageShape(incoming[2], {
      id: `${beat.id}-director-desk`,
      senderName: deskName,
      role: 'operator',
      channel: 'EMAIL',
      text: '',
      delaySeconds: d2,
      intensity: 43
    });
    incoming[2].text = `${deskName}: ${pass.desk}`;
    incoming[2].delaySeconds = d2;

    if (stage >= 2) {
      incoming[3] = ensureMessageShape(incoming[3], {
        id: `${beat.id}-director-villain`,
        senderName: villainName,
        role: 'antagonist',
        channel: stage >= 4 ? 'VOICE_MESSAGE' : 'SMS',
        text: '',
        delaySeconds: d3,
        intensity: 61
      });
      incoming[3].text = `${villainName}: ${cluePhrase} is not your proof, it is my lever. Keep responding and I will keep shaping what your witnesses think they remember.`;
      incoming[3].delaySeconds = d3;
    } else if (incoming.length > 3) {
      incoming.splice(3);
    }

    const responseOptions = Array.isArray(beat.responseOptions)
      ? beat.responseOptions.map((option, optionIndex) => {
          if (optionIndex === 0) {
            return {
              ...option,
              summary: `Protect witnesses and keep ${cluePhrase} admissible without losing investigative momentum.`
            };
          }
          if (optionIndex === 1) {
            return {
              ...option,
              summary: `Apply direct institutional pressure around ${cluePhrase} and accept higher blowback risk.`
            };
          }
          return {
            ...option,
            summary: `Run covert verification path to trap edits before ${cluePhrase} can be reframed.`
          };
        })
      : beat.responseOptions;

    return {
      ...beat,
      narrative,
      unlockAfterSeconds: stage === 1 ? 420 : stage === 2 ? 480 : stage === 3 ? 540 : 600,
      incomingMessages: incoming,
      responseOptions
    };
  });

  writeJson(path, data);
  return { id: data.id, version: data.version, beats: data.beats.length };
}

function refreshDramaIndex() {
  const indexPath = join(dramaDir, 'index.json');
  const index = readJson(indexPath);
  if (!Array.isArray(index)) {
    return { updated: 0 };
  }

  const versionByStoryId = {};
  for (const file of readdirSync(dramaDir)) {
    if (!file.endsWith('.json') || file === 'index.json') {
      continue;
    }
    const entry = readJson(join(dramaDir, file));
    if (entry?.id && typeof entry?.version === 'string') {
      versionByStoryId[entry.id] = entry.version;
    }
  }

  let updated = 0;
  const nextIndex = index.map((entry) => {
    const storyId = entry?.storyId || entry?.id;
    const storyVersion = storyId ? versionByStoryId[storyId] : null;
    if (!storyVersion || entry?.version === storyVersion) {
      return entry;
    }
    updated += 1;
    return {
      ...entry,
      version: storyVersion
    };
  });

  writeJson(indexPath, nextIndex);
  return { updated };
}

const results = [];
for (const file of readdirSync(dramaDir)) {
  const changed = rewriteStoryFile(file);
  if (changed) {
    results.push(changed);
  }
}
const indexResult = refreshDramaIndex();

for (const row of results) {
  console.log(`${row.id}\t${row.version}\tbeats=${row.beats}`);
}
console.log(`Updated ${results.length} story packages.`);
console.log(`Updated ${indexResult.updated} index records.`);
