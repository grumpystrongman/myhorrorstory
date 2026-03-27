import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const filePath = join(process.cwd(), 'apps', 'web', 'public', 'content', 'drama', 'static-between-stations.json');

const DAY_PASSES = [
  {
    narrative:
      '02:17 AM. The Bracken commuter line, decommissioned for nine years after a tunnel collapse, wakes up and starts calling phones that are no longer in service. Every recipient hears the same confession in their own voice. Your mandate is not to chase ghosts. It is to prove who had access to the relay path, when the first forged audio was inserted, and why someone needs this line alive again.',
    operator:
      'Mara Quinn: Before we move, anchor one fact: the confession burst hit SMS, Telegram, and email with identical timing drift. That means a single source push, not a chain leak.',
    witness:
      'Ilya Ross: I used to run overnight dispatch for this corridor. Tonight I heard my own voice reading a statement I never wrote. If you can prove the timestamp is synthetic, I will stay on record.',
    desk:
      'Field Desk: Objective for Day 1 is simple and non-negotiable - establish admissible origin of the first burst and keep this case understandable to a first-time investigator.'
  },
  {
    narrative:
      'Maintenance logs recovered from a locked municipal archive show handwritten corrections dated years after the station shut down. Two page numbers are out of sequence, and one technician signature belongs to a man dead before the listed maintenance window. You are no longer proving whether something happened. You are proving who rewrote the paper trail.',
    operator:
      'Mara Quinn: The altered ledger pages are our first physical contradiction. Capture high-resolution scans and freeze chain-of-custody before anyone claims clerical error.',
    witness:
      'Nia Vale: I rode the last train before closure. The clerk who stamped those forms always used blue ink, never black. The page you sent me is wrong.',
    desk:
      'Field Desk: Build a timeline a novice can follow: closure date, forged ledger insertion, first broadcast. If one step feels fuzzy, mark it and verify before moving.'
  },
  {
    narrative:
      'A witness statement says the relay room was dark all night. CCTV stills show light spill under the same door at 01:58 and 02:03. The contradiction is small, but this case is built on small contradictions. Today is about deciding whether your witness is frightened, compromised, or being framed.',
    operator:
      'Mara Quinn: Cross-check witness memory against hardware logs, not against instincts. We need a calm interview transcript, not a confrontation spiral.',
    witness:
      'Bram Keene: I audited that annex three times. The relay cabinet should not have power. If it did, someone bypassed municipal lockout and they knew exactly where to cut in.',
    desk:
      'Field Desk: Ask one clean question at a time: what was seen, what was heard, what can be verified. Do not let rumor language contaminate your notes.',
    villain:
      'Curator of Static: You call it contradiction. I call it rehearsal. Keep listening and you will hear the version where you fail first.'
  },
  {
    narrative:
      'An unscheduled message drop arrives from a number registered to a transit contractor dissolved six years ago. Attached is a relay-room access hash that validates on old infrastructure but fails on current systems. Someone is emulating a dead environment to make forged evidence pass as archival truth.',
    operator:
      'Mara Quinn: We treat this as hostile mimicry. Validate the hash against legacy firmware and current firmware side by side.',
    witness:
      'Ilya Ross: The format is real. The key is not. Whoever sent this had one authentic sample and built the rest from memory.',
    desk:
      'Field Desk: Day 4 priority is fork control - decide whether to publish the mismatch now or hold until we can attribute the sender with confidence.'
  },
  {
    narrative:
      'A blocked call reaches three witnesses in sequence, each hearing a different confession but the same background sound: a loose signal bell striking once every eleven seconds. The bell pattern matches archived test cycles from Platform Zero. The line is not random. It is staging.',
    operator:
      'Mara Quinn: We are entering targeted psychological pressure. Document the bell interval and match it to archived maintenance routines.',
    witness:
      'Nia Vale: The voice said my name, then read a memory only my brother knew. He died in the tunnel collapse. I need to know if this is stolen audio or something worse.',
    desk:
      'Field Desk: Explain the player objective clearly in every update - identify source, verify method, protect witnesses. Repetition here is operational discipline, not filler.'
  },
  {
    narrative:
      'The municipal tape archive has been accessed twice without badge records. A voicemail transcript references your previous branch choice before that choice was publicly logged. That means either an internal observer, or a live listener inside your team communication path.',
    operator:
      'Mara Quinn: Assume surveillance until disproven. Rotate comm identifiers and move sensitive notes to segmented channels.',
    witness:
      'Bram Keene: Somebody is reading your workflow. The transcript names your habit of checking witness first. That detail never left internal briefing.',
    desk:
      'Field Desk: Today is about operational hygiene. Build from facts already verified and do not improvise in channels that could be mirrored.',
    villain:
      'Curator of Static: You are not being watched. You are being studied. There is a difference, and it is not in your favor.'
  },
  {
    narrative:
      'Trust forks open. Two allied contacts provide mutually exclusive explanations for how the relay room reactivated. Both versions contain one true technical element and one fabricated timeline marker. Your job is not to pick who sounds sincere. Your job is to pick the version that survives forensic friction.',
    operator:
      'Mara Quinn: Force both accounts onto the same minute-by-minute grid and mark every unsupported minute in red.',
    witness:
      'Ilya Ross: I can walk you through dispatch override keys, but if this leaks with my name attached, I am done. Keep my channel closed.',
    desk:
      'Field Desk: End of Week 1 checkpoint - player should now understand motive candidates, method hypothesis, and at least one proven tamper event.'
  },
  {
    narrative:
      'Signal contamination begins. Fresh drops arrive with correct metadata headers but impossible microphone signatures. Forensic review shows blended room tones from two separate environments layered into a single call. The antagonist is no longer planting evidence. They are manufacturing plausibility at scale.',
    operator:
      'Mara Quinn: Mark every sample with provenance confidence before discussing content. If provenance fails, narrative value is irrelevant.',
    witness:
      'Nia Vale: I compared the new clip with my original voicemail. The breaths are mine. The pauses are not. Someone edited the spaces between words.',
    desk:
      'Field Desk: Introduce players to the contamination rule - trusted format is not trusted truth. Verification precedes interpretation.'
  },
  {
    narrative:
      'A trap site is seeded on a public map with coordinates leading to a flooded service tunnel. The file includes your team’s private internal label for the tunnel, which was never published. This is both a lure and a signal: the antagonist can read your map layer terminology.',
    operator:
      'Mara Quinn: No one enters that tunnel blind. Remote camera first, structural check second, personnel last.',
    witness:
      'Bram Keene: That coordinate tag came from audit software no one outside transit should have. Either someone stole credentials or someone in transit is feeding them.',
    desk:
      'Field Desk: Day 9 objective - convert bait into attribution. Preserve geodata, route logs, and screenshot chain before the link is scrubbed.'
  },
  {
    narrative:
      'Protective relocation details for a witness appear in an anonymous blast within nine minutes of internal approval. The leak window is too short for manual transfer, pointing to automated forwarding or compromised notification rules. You are now investigating the case and your own infrastructure.',
    operator:
      'Mara Quinn: Freeze relocation protocol and issue manual handoff only. We cannot lose another witness to process leakage.',
    witness:
      'Ilya Ross: Whoever posted that route knew the decoy vehicle too. That detail lives in one encrypted file and two human heads.',
    desk:
      'Field Desk: Clarify stakes for the player - misuse of hints and over-sharing now carry immediate in-world consequences.'
  },
  {
    narrative:
      'Impersonation escalates. A caller mimics Mara Quinn’s cadence and sends a credible but false instruction to destroy an evidence duplicate. Voiceprint checks show 92% match with synthetic interpolation over archived command audio. The villain is weaponizing authority.',
    operator:
      'Mara Quinn: From this point forward, destructive instructions require dual verification phrase and secondary channel confirmation.',
    witness:
      'Nia Vale: I almost followed the fake order. It sounded exactly like her, down to the breath before she gives bad news.',
    desk:
      'Field Desk: Teach the novice rule explicitly - urgent authority requests are highest risk; verify identity before action.'
  },
  {
    narrative:
      'An impossible record surfaces: a shipping manifest listing relay components delivered three months after the supplier filed dissolution. Hidden in the footer is a routing code tied to a private storage lot near the old signal tower. Someone built a shadow supply chain for this operation.',
    operator:
      'Mara Quinn: Treat the manifest as mixed truth. Verify every line item physically before assigning intent.',
    witness:
      'Bram Keene: The lot code belongs to municipal overflow storage. Nobody audits it unless procurement requests a variance.',
    desk:
      'Field Desk: Day 12 check - players should now connect financial cover-up, hardware access, and staged confession traffic as one system.'
  },
  {
    narrative:
      'Evidence tamper attempt detected. A high-confidence photograph is silently replaced in the archive with a cleaner copy missing one reflection in the glass panel. The missing reflection originally showed a second figure near the rack door. The antagonist is editing witnesses out of reality one file at a time.',
    operator:
      'Mara Quinn: Recover prior hash from cold storage and lock all image assets to immutable versioning now.',
    witness:
      'Ilya Ross: I remember that reflection because I asked who the second person was. They told me it was lens flare. It was not.',
    desk:
      'Field Desk: Frame this for players as a solvable puzzle: compare versions, isolate deltas, infer motive for each removed detail.'
  },
  {
    narrative:
      'Pressure call night. The antagonist sends a timed ultimatum: release one suspect publicly within forty minutes or lose access to the next confession stream. This is a trap designed to trade your credibility for short-term velocity. The correct move is disciplined uncertainty.',
    operator:
      'Mara Quinn: Do not name a suspect on an ultimatum clock. We control pace or we lose the case.',
    witness:
      'Nia Vale: If you accuse the wrong person now, the whole city will believe the lie before morning.',
    desk:
      'Field Desk: Record your decision rationale in plain language. This is where novice players either learn restraint or get captured by momentum.'
  },
  {
    narrative:
      'Recovered tape from a rail maintenance locker contains raw room audio from the night of closure. Under the hiss, a supervisor voice mentions “second relay path still live” minutes before the tunnel incident. This line reopens the central question: was the collapse an accident, or cover for an earlier network build-out?',
    operator:
      'Mara Quinn: Prioritize tape authenticity test, then transcript with uncertainty markers. No definitive claims until restoration pass completes.',
    witness:
      'Bram Keene: I know that supervisor voice. He testified the second path was dead. On tape, he says the opposite.',
    desk:
      'Field Desk: Day 15 starts danger phase. Every conclusion must show source, confidence, and what could still disprove it.'
  },
  {
    narrative:
      'Hidden network map recovered from a maintenance tablet reveals four mirror relay points outside city limits, each pinged within minutes of your major choices. The villain is not just observing the investigation. They are adapting distribution nodes in response to your behavior.',
    operator:
      'Mara Quinn: Assume adaptive adversary. Branch decisions now change both story outcome and active threat geometry.',
    witness:
      'Ilya Ross: Those mirror points were never part of official transit diagrams. Someone built a parallel rail for data.',
    desk:
      'Field Desk: Explain consequence clearly - delayed decisions increase node spread; decisive verified action narrows antagonist maneuver space.'
  },
  {
    narrative:
      'A twelve-minute gap appears in control-room access logs exactly when a key witness changed testimony. Backup logs confirm the door opened, but camera feeds for that window are overwritten with old footage. The missing minutes are now the center of gravity of the entire case.',
    operator:
      'Mara Quinn: Build two timelines - official and reconstructed. Every mismatch gets tracked to actor, system, or unknown.',
    witness:
      'Nia Vale: I switched my statement because someone played me a clip of my daughter’s voice over station static. They knew I would break.',
    desk:
      'Field Desk: This beat should feel personal but still investigable. Anchor emotion to evidence, not to speculation.'
  },
  {
    narrative:
      'Panic wave hits public channels after edited confession clips spread under emergency hashtags. Crowds gather near sealed platforms while false location pins redirect responders. The antagonist is turning information chaos into physical risk.',
    operator:
      'Mara Quinn: We split response - one team handles narrative containment, one team secures physical access points.',
    witness:
      'Bram Keene: They posted three fake dispatch screenshots in ten minutes. People think the line is reopening tonight.',
    desk:
      'Field Desk: Day 18 objective - preserve civilian safety without sacrificing traceability of who launched the panic packet.'
  },
  {
    narrative:
      'Pattern marks emerge across evidence: recurring symbol clusters hidden in map annotations, voicemail spectrograms, and maintenance notes. The pattern resolves to train-order shorthand used by a retired signal engineer who died before line closure. Either the villain inherited a private codebook, or that death was misreported.',
    operator:
      'Mara Quinn: Cross-reference marks against historical signal doctrine and identify anyone still fluent in that notation.',
    witness:
      'Ilya Ross: My old supervisor called that shorthand “night math.” Only eight people in the district could read it clean.',
    desk:
      'Field Desk: Convert symbolism into mechanics for players - where it appears, what it encodes, what action it unlocks.'
  },
  {
    narrative:
      'Reroute trace confirms outbound confession traffic bouncing through a municipal substation slated for demolition. Utility tickets show last-minute cancellation signed by a proxy identity tied to your false-lead suspect. The villain is laundering command traffic through city maintenance blind spots.',
    operator:
      'Mara Quinn: Secure substation entry logs and power-cycle records before utility legal can lock us out.',
    witness:
      'Nia Vale: If that substation stays live through dawn, they can broadcast another citywide wave without touching rail hardware.',
    desk:
      'Field Desk: This is a method-proof beat. Document the technical path end to end so a novice can repeat the logic independently.'
  },
  {
    narrative:
      'A primary witness collapses after receiving a private audio drop that includes unreleased interview footage. Medical intake confirms acute stress response, but the attached file metadata points to your internal evidence export queue. Someone is siphoning material between review and storage.',
    operator:
      'Mara Quinn: Lock export queue, freeze external sharing, and preserve witness confidentiality at all costs.',
    witness:
      'Bram Keene: I can keep talking, but not if every sentence becomes ammunition before we verify context.',
    desk:
      'Field Desk: Day 21 closes danger phase. Player should now feel urgency, but still have a clear solvable objective in view.'
  },
  {
    narrative:
      'Ultimatum night. The villain demands a binary choice: expose the full network and trigger citywide panic, or suppress key evidence and save targeted hostages. This is a moral trap designed to convert your process into guilt. The right answer is not immediate compliance or defiance. It is proof-backed reframing.',
    operator:
      'Mara Quinn: We answer with terms, not fear. Build a response that protects lives and preserves prosecutable truth.',
    witness:
      'Ilya Ross: The hostages are real. But if we bury evidence now, this machine keeps running after tonight.',
    desk:
      'Field Desk: Make the dilemma legible: safety, truth, and time are all constrained; the player must justify tradeoffs explicitly.'
  },
  {
    narrative:
      'Identity reveal lands through a stitched dossier linking the Curator to an internal transit modernization team dissolved after the tunnel incident. The dossier is partly authentic and partly salted with false witness signatures. You finally have a face, but not yet an uncontested case.',
    operator:
      'Mara Quinn: Verify identity through independent records before confronting. A wrong reveal here detonates the prosecution path.',
    witness:
      'Nia Vale: I know that face from closure hearings. He sat in back, never spoke, and took notes when families read statements.',
    desk:
      'Field Desk: Players need to understand this distinction - suspect identified does not equal guilt proven. Keep standards high.'
  },
  {
    narrative:
      'Legacy file recovered from cold storage includes suppressed engineering memos warning that emergency relay redundancy could be repurposed for voice injection. Leadership marked the risk as “non-operational” two weeks before closure. The conspiracy shape changes: negligence may have become intent.',
    operator:
      'Mara Quinn: Build the negligence-to-intent bridge carefully. We need document provenance, signatory authority, and motive alignment.',
    witness:
      'Bram Keene: We raised this risk in committee. They shut the meeting down and called it speculative. It was not speculative.',
    desk:
      'Field Desk: Day 24 objective - integrate historical motive with present-day method so the ending does not feel arbitrary.'
  },
  {
    narrative:
      'Chronology hearing preparation begins. Competing narratives are now fixed: isolated sabotage, institutional cover-up, or coordinated psychological operation built on both. Your board must support one coherent timeline that can withstand hostile cross-examination and public scrutiny.',
    operator:
      'Mara Quinn: Draft the final chronology as if defense counsel is reading over your shoulder. Every claim needs source and confidence.',
    witness:
      'Ilya Ross: If you place one event out of order, they will call all of us unreliable and walk.',
    desk:
      'Field Desk: This is a comprehension beat - ensure novice players can explain the case in five clear steps without losing accuracy.'
  },
  {
    narrative:
      'Compromise offer arrives through a private channel: release hostages and shut down broadcasts in exchange for redacting the legacy memos and naming a scapegoat. It is the cleanest path to immediate calm and the dirtiest path to truth. The villain is testing whether you are here to solve the case or survive it.',
    operator:
      'Mara Quinn: We log the offer, preserve the channel, and decide in writing. No off-book negotiation.',
    witness:
      'Nia Vale: If we take that deal, people live tonight - but the next line goes live somewhere else in six months.',
    desk:
      'Field Desk: Be explicit about consequence. Compromise can be strategic, but hidden compromise becomes corruption.'
  },
  {
    narrative:
      'Countdown board goes public: four timed releases remain, each tied to an unresolved contradiction on your evidence wall. The antagonist has mapped your blind spots and set a schedule around them. This is your final chance to close gaps before the ending locks.',
    operator:
      'Mara Quinn: Prioritize contradictions with highest civilian impact first. We do not chase dramatic clues while critical gaps stay open.',
    witness:
      'Bram Keene: The countdown mirrors old rail dispatch cadence. If we miss one window, the next release doubles in reach.',
    desk:
      'Field Desk: Day 27 is execution discipline - resolve, document, and communicate in strict order.'
  },
  {
    narrative:
      'Final reckoning. You now hold enough evidence to trigger justice, containment, compromise, or collapse. The Curator’s final transmission invites you to “choose the version that hurts least.” Your answer determines whether this city inherits truth, comforting fiction, or another buried line waiting to wake.',
    operator:
      'Mara Quinn: Final directive - choose the ending you can defend with evidence, ethics, and consequence awareness. Then close the file cleanly.',
    witness:
      'Ilya Ross: Whatever you decide tonight becomes the story people live with. Make sure it is a story that can be checked.',
    desk:
      'Field Desk: End-state criteria: coherent motive, verified method, explained timeline, and clear consequence for every major branch.'
  }
];

const CLUE_MAP = {
  'spectrogram-of-confession-bu': 'Spectrogram of confession burst',
  'maintenance-ledger-anomaly': 'Maintenance ledger anomaly',
  'turnstile-camera-still': 'Turnstile camera still',
  'relay-room-access-hash': 'Relay-room access hash'
};

function toCluePhrase(rawClueId) {
  if (!rawClueId) {
    return 'primary evidence thread';
  }
  const cleaned = String(rawClueId)
    .replace(/^.*?-d\d+-/, '')
    .replaceAll('-', ' ')
    .trim();
  const normalized = String(rawClueId)
    .replace(/^.*?-d\d+-/, '')
    .trim();
  if (normalized.includes('spectrogram-of-confession')) {
    return 'Spectrogram of confession burst';
  }
  if (normalized.includes('maintenance-ledger-anomaly')) {
    return 'Maintenance ledger anomaly';
  }
  if (normalized.includes('turnstile-camera-still')) {
    return 'Turnstile camera still';
  }
  if (normalized.includes('relay-room-access-hash')) {
    return 'Relay-room access hash';
  }
  return CLUE_MAP[normalized] || cleaned || 'primary evidence thread';
}

function stageDelays(stage) {
  if (stage === 1) return [4, 16, 30, 44];
  if (stage === 2) return [4, 15, 28, 42];
  if (stage === 3) return [3, 13, 24, 38];
  return [2, 11, 21, 34];
}

const drama = JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

if (!Array.isArray(drama.beats) || drama.beats.length < DAY_PASSES.length) {
  throw new Error(`Expected at least ${DAY_PASSES.length} beats in ${filePath}.`);
}

drama.version = 'director-cut-v3-hand-authored';
drama.playerBriefing = {
  roleTitle: 'Senior Incident Analyst - Bracken Line Taskforce',
  callSign: '{{player_alias}}',
  recruitmentReason:
    'You were recruited after closure-case specialists reviewed your prior investigations and found one pattern: you can separate panic from proof under hostile time pressure.',
  openingIncident:
    'At 02:17 local time, the dead Bracken Line broadcast synchronized confessions in the recipients’ own voices across Telegram, SMS, and email.',
  personalStakes:
    'A wrong accusation will destroy witnesses and cement a false public narrative. A slow response will leave civilians exposed to escalating manipulative drops.',
  firstDirective:
    'Treat this as a real investigation: build verifiable chronology, preserve chain-of-custody, and make every branch decision defensible to someone seeing the file for the first time.'
};

drama.caseFile = {
  objective:
    'Prove who reactivated the dead rail relay, how forged confession media is being produced, and which historical event the operation is trying to bury.',
  primaryQuestion:
    'Is the Bracken broadcast campaign isolated sabotage, institutional concealment, or a coordinated psychological operation built from both?',
  operationWindow:
    'First 72 hours: stabilize witnesses and lock provenance. Remaining window: pressure-test motive and method until final branch selection.',
  successCriteria: [
    'At least one complete timeline from first breach to final confrontation with source confidence on each step.',
    'Witness testimony that remains coherent under cross-check and hostile reinterpretation.',
    'Evidence chain that distinguishes authentic artifacts from planted or modified material.',
    'An ending choice that is ethically explicit and technically supported.'
  ],
  failureConsequences: [
    'Confession media becomes accepted fact before attribution is established.',
    'Witnesses withdraw or are manipulated into contradictory testimony.',
    'Public panic events outpace investigative communication discipline.',
    'The Curator controls the post-case narrative regardless of underlying truth.'
  ]
};

drama.campaignPlan = {
  totalDays: 45,
  recommendedDays: 28,
  maxDays: 45,
  weeks: [
    {
      week: 1,
      label: 'Week 1 - Breach & Validation',
      objective: 'Establish what is real, what is forged, and who has access to the relay environment.',
      keyMoments: ['First confession burst', 'ledger contradiction', 'trust fork']
    },
    {
      week: 2,
      label: 'Week 2 - Interference & Exposure',
      objective: 'Survive impersonation and contamination while preserving admissible chronology.',
      keyMoments: ['Signal contamination', 'trap-site lure', 'impossible record']
    },
    {
      week: 3,
      label: 'Week 3 - Active Threat',
      objective: 'Balance immediate safety decisions with long-term case integrity under direct antagonist pressure.',
      keyMoments: ['Recovered tape', 'missing minutes', 'panic wave']
    },
    {
      week: 4,
      label: 'Week 4 - Ultimatum & Judgement',
      objective: 'Resolve motive, method, and accountability under forced moral tradeoffs.',
      keyMoments: ['Ultimatum night', 'legacy file', 'final reckoning']
    }
  ]
};

drama.beats = drama.beats.map((beat, index) => {
  const pass = DAY_PASSES[index];
  const stage = Number(beat.stage) || (index < 7 ? 1 : index < 14 ? 2 : index < 21 ? 3 : 4);
  const [delayOperator, delayWitness, delayDesk, delayVillain] = stageDelays(stage);
  const cluePhrase = toCluePhrase(beat.revealClueIds?.[0]);

  const nextBeat = {
    ...beat,
    narrative: pass.narrative,
    unlockAfterSeconds: stage === 1 ? 420 : stage === 2 ? 480 : stage === 3 ? 540 : 600
  };

  const incoming = Array.isArray(beat.incomingMessages) ? [...beat.incomingMessages] : [];
  if (incoming[0]) {
    incoming[0] = {
      ...incoming[0],
      text: pass.operator,
      delaySeconds: delayOperator
    };
  }
  if (incoming[1]) {
    incoming[1] = {
      ...incoming[1],
      text: pass.witness,
      delaySeconds: delayWitness
    };
  }
  if (incoming[2]) {
    incoming[2] = {
      ...incoming[2],
      text: pass.desk,
      delaySeconds: delayDesk
    };
  }
  if (incoming[3]) {
    incoming[3] = {
      ...incoming[3],
      text:
        pass.villain ??
        `Curator of Static: You keep calling ${cluePhrase} evidence. I call it the line where your certainty starts to break.`,
      delaySeconds: delayVillain
    };
  }
  nextBeat.incomingMessages = incoming;

  if (Array.isArray(beat.responseOptions)) {
    nextBeat.responseOptions = beat.responseOptions.map((option, optionIndex) => {
      if (optionIndex === 0) {
        return {
          ...option,
          summary: `Protect witnesses and keep ${cluePhrase} admissible without losing pace.`
        };
      }
      if (optionIndex === 1) {
        return {
          ...option,
          summary: `Apply direct pressure to force disclosure around ${cluePhrase}, even at political cost.`
        };
      }
      return {
        ...option,
        summary: `Run covert verification and trap edits before hostile actors can rewrite ${cluePhrase}.`
      };
    });
  }

  return nextBeat;
});

writeFileSync(filePath, `${JSON.stringify(drama, null, 2)}\n`, 'utf8');
console.log(`Authored pass complete: ${filePath}`);
