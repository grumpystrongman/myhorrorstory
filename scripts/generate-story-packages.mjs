import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(rootDir, 'docs', 'stories');

const repModel = {
  startingScores: {
    trustworthiness: 0,
    aggression: 0,
    curiosity: 0,
    deception: 0,
    morality: 0
  },
  decayPerDay: 0,
  axisGuidance: [
    { axis: 'trustworthiness', positiveBehavior: 'Keep promises.', negativeBehavior: 'Break promises.' },
    { axis: 'aggression', positiveBehavior: 'Use firm pressure.', negativeBehavior: 'Threaten everyone.' },
    { axis: 'curiosity', positiveBehavior: 'Chase anomalies.', negativeBehavior: 'Ignore contradictions.' },
    { axis: 'deception', positiveBehavior: 'Use tactical bluff.', negativeBehavior: 'Lie constantly.' },
    { axis: 'morality', positiveBehavior: 'Protect bystanders.', negativeBehavior: 'Trade lives for speed.' }
  ]
};

const cadence = {
  primaryChannels: ['SMS', 'WHATSAPP', 'TELEGRAM'],
  auxiliaryChannels: ['EMAIL', 'VOICE_MESSAGE', 'DOCUMENT_DROP', 'SIMULATED_SITE'],
  lateNightMessagingDefault: false,
  maxVillainTouchesPerDay: 3,
  suspenseSilenceWindowMinutes: { min: 45, max: 360 }
};

const cond = (source, key, operator, value) => ({
  kind: 'predicate',
  predicate: { source, key, operator, value }
});

const all = (...conditions) => ({ kind: 'all', conditions });

const intensityForTone = (tone) => (tone === 'INTENSE' ? 4 : tone === 'SLOW_BURN' ? 2 : 3);
const threatForTone = (tone) => (tone === 'INTENSE' ? 'HIGH' : 'MODERATE');

function escalation(coreClueId) {
  return [
    {
      stage: 1,
      label: 'Peripheral Presence',
      objective: 'Signal surveillance without identity.',
      entryCondition: cond('ELAPSED_SECONDS', 'elapsed', 'GTE', 0),
      allowedMessageTypes: ['CRYPTIC_CLUE', 'PERSONAL_OBSERVATION'],
      timing: { minIntervalMinutes: 120, maxTouchesPerDay: 2, allowLateNight: false }
    },
    {
      stage: 2,
      label: 'Psychological Contact',
      objective: 'Break trust between player and allies.',
      entryCondition: cond('HAS_CLUE', coreClueId, 'EQ', true),
      allowedMessageTypes: ['TAUNT', 'RIDDLE', 'FALSE_REASSURANCE'],
      timing: { minIntervalMinutes: 90, maxTouchesPerDay: 3, allowLateNight: false }
    },
    {
      stage: 3,
      label: 'Active Interference',
      objective: 'Force tactical mistakes.',
      entryCondition: cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 65),
      allowedMessageTypes: ['THREAT', 'COUNTDOWN', 'MEDIA_DROP'],
      timing: { minIntervalMinutes: 60, maxTouchesPerDay: 3, allowLateNight: true }
    },
    {
      stage: 4,
      label: 'Personal Confrontation',
      objective: 'Recruit, corrupt, or break the player.',
      entryCondition: cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 85),
      allowedMessageTypes: ['MORAL_TEST', 'PARTIAL_CONFESSION', 'MANIPULATIVE_INSTRUCTION'],
      timing: { minIntervalMinutes: 40, maxTouchesPerDay: 4, allowLateNight: true }
    }
  ];
}

function npcs(storyId, names, clueIds) {
  const roles = ['HANDLER', 'WITNESS', 'SUSPECT', 'ALLY'];
  const emotions = ['CALM', 'ANXIOUS', 'SUSPICIOUS', 'DEFIANT'];

  return names.map((name, i) => {
    const npcId = `${storyId}-npc-${i + 1}`;
    const trustThreshold = 45 + i * 10;

    return {
      id: npcId,
      displayName: name,
      role: roles[i] ?? 'ALLY',
      personalityTraits: i % 2 === 0 ? ['guarded', 'analytical'] : ['reactive', 'observant'],
      baselineEmotion: emotions[i] ?? 'CALM',
      motivations: [i === 0 ? 'Control fallout quickly.' : 'Survive and protect a secret.'],
      trustBaseline: 40 + i * 8,
      trustCeiling: 90,
      secrets: [
        {
          id: `${npcId}-secret`,
          title: `${name} withheld a key detail`,
          summary: `${name} can expose ${clueIds[(i + 1) % clueIds.length]} at high trust.`,
          trustThreshold,
          revealCondition: cond('NPC_TRUST', npcId, 'GTE', trustThreshold),
          consequenceOnReveal: `Unlocks an alternate path through ${clueIds[(i + 1) % clueIds.length]}.`
        }
      ],
      responseStyle: {
        accusation: 'Defensive and selective.',
        threat: 'Withdraws and delays.',
        questioning: 'Provides partial truths first.'
      }
    };
  });
}

function messages(storyId, a, b, c) {
  return [
    {
      id: `${storyId}-msg-1`,
      stage: 1,
      type: 'CRYPTIC_CLUE',
      channels: ['SMS'],
      textTemplate: a,
      personalizationKeys: ['playerName', 'recentAction'],
      branchEffects: ['presence-started']
    },
    {
      id: `${storyId}-msg-2`,
      stage: 2,
      type: 'TAUNT',
      channels: ['WHATSAPP', 'TELEGRAM'],
      textTemplate: b,
      personalizationKeys: ['trustedNpc'],
      branchEffects: ['trust-fracture']
    },
    {
      id: `${storyId}-msg-3`,
      stage: 2,
      type: 'RIDDLE',
      channels: ['TELEGRAM'],
      textTemplate: 'Two witnesses, one memory. Which one pays in blood?',
      personalizationKeys: [],
      branchEffects: ['puzzle-hint']
    },
    {
      id: `${storyId}-msg-4`,
      stage: 3,
      type: 'THREAT',
      channels: ['SMS', 'VOICE_MESSAGE'],
      textTemplate: c,
      personalizationKeys: ['allyName'],
      branchEffects: ['npc-at-risk']
    },
    {
      id: `${storyId}-msg-5`,
      stage: 3,
      type: 'COUNTDOWN',
      channels: ['SMS'],
      textTemplate: 'Nine minutes. Save the witness or save the truth.',
      personalizationKeys: ['countdownTarget'],
      branchEffects: ['ultimatum']
    },
    {
      id: `${storyId}-msg-6`,
      stage: 4,
      type: 'MORAL_TEST',
      channels: ['EMAIL', 'DOCUMENT_DROP'],
      textTemplate: 'Confess one lie and I return one life.',
      personalizationKeys: ['playerWeakness'],
      branchEffects: ['corruption-offer']
    }
  ];
}

function endings(storyId, justiceSummary, pyrrhicSummary, corruptionSummary) {
  const justiceId = `${storyId}-ending-justice`;
  const pyrrhicId = `${storyId}-ending-pyrrhic`;
  const corruptionId = `${storyId}-ending-corruption`;

  return {
    corruptionId,
    list: [
      {
        id: justiceId,
        title: 'Clean Resolution',
        type: 'JUSTICE',
        summary: justiceSummary,
        requiredCondition: all(
          cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 85),
          cond('PLAYER_REPUTATION', 'morality', 'GTE', 10),
          cond('EVENT_OCCURRED', `${storyId}-event-hostage-saved`, 'EQ', true)
        ),
        blockedCondition: cond('EVENT_OCCURRED', `${storyId}-event-evidence-destroyed`, 'EQ', true),
        epilogue: 'Truth lands publicly with evidence that survives scrutiny.',
        sequelHook: 'A tagged evidence box points to the next case.'
      },
      {
        id: pyrrhicId,
        title: 'Compromised Truth',
        type: 'PYRRHIC',
        summary: pyrrhicSummary,
        requiredCondition: all(
          cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 75),
          cond('EVENT_OCCURRED', `${storyId}-event-witness-risk`, 'EQ', true)
        ),
        epilogue: 'The culprit is exposed, but allies and witnesses are fractured.',
        sequelHook: 'A surviving witness asks for help in a linked disappearance.'
      },
      {
        id: corruptionId,
        title: 'Corruption Pact',
        type: 'CORRUPTION',
        summary: corruptionSummary,
        requiredCondition: cond('ENDING_STATUS', `unlocked:${corruptionId}`, 'EQ', true),
        epilogue: 'You keep control of the case, and the villain keeps control of you.',
        sequelHook: 'Season continuity marks the player as compromised.'
      }
    ]
  };
}

function buildStory(def) {
  const coreClueId = `${def.id}-clue-origin`;
  const pressureClueId = `${def.id}-clue-pressure`;
  const revealClueId = `${def.id}-clue-reveal`;
  const endingSet = endings(def.id, def.justiceSummary, def.pyrrhicSummary, def.corruptionSummary);
  const npcProfiles = npcs(def.id, def.characters, [coreClueId, pressureClueId, revealClueId]);
  const allyNpcId = npcProfiles[npcProfiles.length - 1].id;

  return {
    id: def.id,
    version: 'v2',
    title: def.title,
    hook: def.hook,
    subgenre: def.subgenre,
    tone: def.tone,
    targetSessionMinutes: def.targetSessionMinutes,
    soloSuitability: def.soloSuitability,
    partySuitability: def.partySuitability,
    ageWarnings: def.ageWarnings,
    characters: def.characters,
    location: def.location,
    acts: [
      {
        id: 'act-1',
        title: 'Contact',
        beats: [
          {
            id: 'beat-1',
            title: def.actOpenTitle,
            narrative: def.actOpenNarrative,
            unlockAfterSeconds: 0,
            requiredConditions: [],
            choices: [
              {
                id: 'choice-trace-source',
                label: def.choiceA,
                effects: { investigation_path: 'trace_source', scoreDelta: 1 },
                nextBeatId: 'beat-2'
              },
              {
                id: 'choice-interview-ally',
                label: def.choiceB,
                effects: { investigation_path: 'ally_interview', scoreDelta: 1 },
                nextBeatId: 'beat-2'
              }
            ],
            revealsClueIds: [coreClueId]
          },
          {
            id: 'beat-2',
            title: 'Escalation Signal',
            narrative: 'A contradictory channel drop appears within minutes and forces risk.',
            unlockAfterSeconds: 120,
            requiredConditions: [],
            choices: [
              {
                id: 'choice-preserve-evidence',
                label: 'Preserve original evidence chain',
                effects: { evidence_preserved: true, moralityDelta: 1 },
                nextBeatId: 'beat-3'
              },
              {
                id: 'choice-fast-pursuit',
                label: 'Pursue suspect immediately',
                effects: { evidence_preserved: false, aggressionDelta: 1 },
                nextBeatId: 'beat-3'
              }
            ],
            revealsClueIds: [pressureClueId]
          }
        ]
      },
      {
        id: 'act-2',
        title: 'Interference',
        beats: [
          {
            id: 'beat-3',
            title: 'Trust Fracture',
            narrative: 'The villain mixes real secrets with fabricated claims to split allies.',
            unlockAfterSeconds: 240,
            requiredConditions: [{ type: 'HAS_CLUE', key: 'clue', value: coreClueId }],
            choices: [
              {
                id: 'choice-trust-handler',
                label: `Trust ${def.characters[0]} and secure witness`,
                effects: { trusted_ally: def.characters[0], scoreDelta: 1 },
                nextBeatId: 'beat-4'
              },
              {
                id: 'choice-trust-witness',
                label: `Trust ${def.characters[1]} and expose internal leak`,
                effects: { trusted_ally: def.characters[1], scoreDelta: 1 },
                nextBeatId: 'beat-4'
              }
            ],
            revealsClueIds: [`${def.id}-clue-contradiction`]
          },
          {
            id: 'beat-4',
            title: 'Ultimatum Window',
            narrative: 'A timed message threatens collateral harm unless the party diverts.',
            unlockAfterSeconds: 300,
            requiredConditions: [],
            choices: [
              {
                id: 'choice-save-npc',
                label: 'Divert to save threatened NPC',
                effects: { rescue_route: true, moralityDelta: 2 },
                nextBeatId: 'beat-5'
              },
              {
                id: 'choice-continue-case',
                label: 'Continue forensic pursuit under threat',
                effects: { rescue_route: false, trustworthinessDelta: -1 },
                nextBeatId: 'beat-5'
              }
            ],
            revealsClueIds: [`${def.id}-clue-timed-warning`]
          }
        ]
      },
      {
        id: 'act-3',
        title: 'Reckoning',
        beats: [
          {
            id: 'beat-5',
            title: 'Confrontation Protocol',
            narrative: 'Players reconstruct motive and false trails before collapse.',
            unlockAfterSeconds: 240,
            requiredConditions: [{ type: 'HAS_CLUE', key: 'clue', value: pressureClueId }],
            choices: [
              {
                id: 'choice-charge-villain',
                label: 'Commit to formal accusation and expose evidence chain',
                effects: { final_strategy: 'formal_charge', scoreDelta: 2 },
                nextBeatId: 'beat-6'
              },
              {
                id: 'choice-private-deal',
                label: 'Take private contact route for hidden confession',
                effects: { final_strategy: 'private_contact', deceptionDelta: 2 },
                nextBeatId: 'beat-6'
              }
            ],
            revealsClueIds: [revealClueId]
          },
          {
            id: 'beat-6',
            title: 'Case Debrief',
            narrative: 'Final scoring resolves ending branch and season continuity flags.',
            unlockAfterSeconds: 60,
            requiredConditions: [],
            choices: [],
            revealsClueIds: [`${def.id}-clue-epilogue`]
          }
        ]
      }
    ],
    replayHooks: def.replayHooks,
    sequelHooks: def.sequelHooks,
    branchingMoments: def.branchingMoments,
    clueEvidenceList: def.clueEvidenceList,
    revealVariants: def.revealVariants,
    upsellHooks: def.upsellHooks,
    playerReputationModel: repModel,
    channelCadence: cadence,
    npcProfiles,
    villain: {
      id: `${def.id}-villain`,
      displayName: def.villainName,
      archetype: def.villainArchetype,
      worldview: def.villainWorldview,
      motive: def.villainMotive,
      signatureSpeechStyle: def.villainSpeech,
      emotionalVolatility: def.villainVolatility,
      obsessionTarget: 'The player detective profile',
      triggerConditions: [
        'Player nears a correct accusation.',
        'Player rescues a protected witness.',
        'Player shows sustained silence after direct contact.'
      ],
      manipulationTactics: def.villainTactics,
      riskTolerance: def.villainRisk,
      humorOrCruelty: def.villainHumor,
      symbolicMotifs: def.villainMotifs,
      escalationStages: escalation(coreClueId)
    },
    villainMessageTemplates: messages(def.id, def.quoteA, def.quoteB, def.quoteC),
    arcMap: [
      {
        id: `${def.id}-arc-contact`,
        title: 'Contact and Contradiction',
        stage: 'OPENING',
        summary: 'The case opens with impossible evidence and uncertain allies.',
        entryCondition: cond('ELAPSED_SECONDS', 'elapsed', 'GTE', 0),
        completionCondition: cond('HAS_CLUE', coreClueId, 'EQ', true),
        primaryRuleIds: [`${def.id}-rule-first-contact`, `${def.id}-rule-delay-punish`]
      },
      {
        id: `${def.id}-arc-disruption`,
        title: 'Interference and Doubt',
        stage: 'MIDDLE',
        summary: 'Villain contact escalates while ally trust becomes volatile.',
        entryCondition: cond('VILLAIN_STAGE', 'stage', 'GTE', 2),
        completionCondition: cond('HAS_CLUE', pressureClueId, 'EQ', true),
        primaryRuleIds: [`${def.id}-rule-incorrect-accusation`, `${def.id}-rule-ally-cooperation`]
      },
      {
        id: `${def.id}-arc-endgame`,
        title: 'Confrontation and Reckoning',
        stage: 'ENDGAME',
        summary: 'The final branch depends on ethics, timing, and trust.',
        entryCondition: cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 80),
        completionCondition: cond('EVENT_OCCURRED', `${def.id}-event-case-closed`, 'EQ', true),
        primaryRuleIds: [`${def.id}-rule-near-success`, `${def.id}-rule-moral-fork`]
      }
    ],
    triggerRules: [
      {
        id: `${def.id}-rule-first-contact`,
        name: 'First Villain Contact',
        description: 'Core clue discovery escalates villain from peripheral to direct contact.',
        eventType: 'CLUE_DISCOVERED',
        when: cond('HAS_CLUE', coreClueId, 'EQ', true),
        actions: [
          { type: 'ADVANCE_VILLAIN_STAGE', stage: 2 },
          { type: 'SEND_MESSAGE', channel: 'SMS', templateId: `${def.id}-msg-1`, delaySeconds: 180 }
        ],
        priority: 80,
        cooldownSeconds: 300,
        maxActivations: 1
      },
      {
        id: `${def.id}-rule-delay-punish`,
        name: 'Silence Punisher',
        description: 'Long response delay causes pressure event and taunt.',
        eventType: 'PLAYER_DELAY',
        when: cond('SILENCE_SECONDS', 'silence', 'GTE', 14400),
        actions: [
          { type: 'SEND_MESSAGE', channel: 'WHATSAPP', templateId: `${def.id}-msg-2`, delaySeconds: 60 },
          { type: 'EMIT_EVENT', eventId: `${def.id}-event-witness-risk` }
        ],
        priority: 75,
        cooldownSeconds: 1800,
        maxActivations: 2
      },
      {
        id: `${def.id}-rule-incorrect-accusation`,
        name: 'Wrong Accusation Fallout',
        description: 'Incorrect accusation damages trust and escalates interference.',
        eventType: 'PLAYER_ACCUSATION',
        when: all(cond('FLAG', 'accusationCorrect', 'EQ', false), cond('VILLAIN_STAGE', 'stage', 'LTE', 3)),
        actions: [
          { type: 'UPDATE_NPC_TRUST', npcId: allyNpcId, delta: -15 },
          { type: 'ADVANCE_VILLAIN_STAGE', stage: 3 },
          { type: 'SEND_MESSAGE', channel: 'TELEGRAM', templateId: `${def.id}-msg-4`, delaySeconds: 120 }
        ],
        priority: 90,
        cooldownSeconds: 900,
        maxActivations: 2
      },
      {
        id: `${def.id}-rule-ally-cooperation`,
        name: 'Ally Cooperation Reward',
        description: 'High trust with a core ally reveals additional evidence.',
        eventType: 'NPC_TRUST_CHANGED',
        when: cond('NPC_TRUST', allyNpcId, 'GTE', 70),
        actions: [
          { type: 'REVEAL_CLUE', clueId: `${def.id}-clue-ally-ledger` },
          { type: 'SET_FLAG', key: 'allyEvidenceUnlocked', value: true }
        ],
        priority: 65,
        cooldownSeconds: 0,
        maxActivations: 1
      },
      {
        id: `${def.id}-rule-near-success`,
        name: 'Near Success Ultimatum',
        description: 'High progress triggers timed villain ultimatum.',
        eventType: 'INVESTIGATION_PROGRESS',
        when: cond('INVESTIGATION_PROGRESS', 'percent', 'GTE', 85),
        actions: [
          { type: 'ADVANCE_VILLAIN_STAGE', stage: 4 },
          {
            type: 'START_COUNTDOWN',
            countdownId: `${def.id}-final-choice`,
            durationSeconds: 900,
            failureEventId: `${def.id}-event-hostage-lost`
          },
          { type: 'SEND_MESSAGE', channel: 'SMS', templateId: `${def.id}-msg-5`, delaySeconds: 30 }
        ],
        priority: 95,
        cooldownSeconds: 300,
        maxActivations: 1
      },
      {
        id: `${def.id}-rule-moral-fork`,
        name: 'Corruption Offer',
        description: 'Low morality unlocks villain corruption ending route.',
        eventType: 'PLAYER_MESSAGE',
        when: cond('PLAYER_REPUTATION', 'morality', 'LT', -15),
        actions: [
          { type: 'UNLOCK_ENDING', endingId: endingSet.corruptionId },
          { type: 'SEND_MESSAGE', channel: 'EMAIL', templateId: `${def.id}-msg-6`, delaySeconds: 300 }
        ],
        priority: 70,
        cooldownSeconds: 1800,
        maxActivations: 1
      }
    ],
    endingVariants: endingSet.list,
    communityPuzzles: [
      {
        id: `${def.id}-puzzle-shards`,
        title: def.communityPuzzleTitle,
        objective: def.communityPuzzleObjective,
        shards: [
          { id: `${def.id}-puzzle-shard-host`, heldBy: 'HOST', content: def.communityShardHost },
          { id: `${def.id}-puzzle-shard-ally-a`, heldBy: 'ALLY_A', content: def.communityShardA },
          { id: `${def.id}-puzzle-shard-broadcast`, heldBy: 'GLOBAL_BROADCAST', content: def.communityShardBroadcast }
        ],
        solvedByRuleId: `${def.id}-rule-near-success`,
        rewardClueId: coreClueId,
        failureConsequence: 'The villain captures your partial decode and reroutes the final branch.'
      }
    ],
    investigationBoard: {
      nodes: [
        { id: `${def.id}-suspect-villain`, type: 'SUSPECT', label: def.villainName, summary: 'Primary antagonist operating through layered identities.' },
        { id: `${def.id}-suspect-secondary`, type: 'SUSPECT', label: def.characters[2], summary: 'Possible accomplice with motive and access.' },
        { id: `${def.id}-location-core`, type: 'LOCATION', label: def.location, summary: 'Primary scene where contradictions cluster.' },
        { id: `${def.id}-evidence-core`, type: 'EVIDENCE', label: def.clueEvidenceList[0], summary: 'Anchor evidence with disputed provenance.' }
      ],
      links: [
        { fromId: `${def.id}-suspect-villain`, toId: `${def.id}-location-core`, relation: 'operates-through', confidence: 0.78 },
        { fromId: `${def.id}-suspect-secondary`, toId: `${def.id}-evidence-core`, relation: 'tampered-access', confidence: 0.64 },
        { fromId: `${def.id}-location-core`, toId: `${def.id}-evidence-core`, relation: 'origin-point', confidence: 0.82 }
      ],
      timeline: [
        { id: `${def.id}-timeline-1`, timeLabel: '22:15', summary: 'Initial anomaly reaches player channels.', relatedNodeIds: [`${def.id}-location-core`, `${def.id}-evidence-core`] },
        { id: `${def.id}-timeline-2`, timeLabel: '23:50', summary: 'Witness account conflicts with archive records.', relatedNodeIds: [`${def.id}-suspect-secondary`, `${def.id}-evidence-core`] },
        { id: `${def.id}-timeline-3`, timeLabel: '00:25', summary: 'Villain contact shifts to direct intimidation.', relatedNodeIds: [`${def.id}-suspect-villain`] }
      ]
    },
    seasonContinuity: {
      seasonId: 'season-1',
      returningCharacterIds: [npcProfiles[0].id, `${def.id}-villain`],
      persistedReputationAxes: ['trustworthiness', 'aggression', 'curiosity', 'deception', 'morality'],
      carryForwardFlags: ['villain-contact-opened', 'saved-key-witness', 'accepted-corruption-terms'],
      continuityNotes: 'Reputation and corruption flags carry into cross-case antagonist threads.'
    },
    safetyProfile: {
      intensityLevel: intensityForTone(def.tone),
      threatTone: threatForTone(def.tone),
      realismLevel: 'IMMERSIVE',
      allowLateNightMessaging: false,
      supportsOptDown: true,
      contentWarnings: def.ageWarnings
    }
  };
}

const storyDefinitions = [
  {
    file: 'static-between-stations.story.json',
    id: 'static-between-stations',
    title: 'Static Between Stations',
    hook: 'A dead rail line broadcasts private confessions in the players\' own voices.',
    subgenre: 'psychological horror',
    tone: 'CINEMATIC',
    targetSessionMinutes: 95,
    soloSuitability: 5,
    partySuitability: 5,
    ageWarnings: ['disturbing audio', 'stalking', 'threat'],
    location: 'Abandoned commuter rail control annex',
    characters: ['Lead Investigator Mara Quinn', 'Dispatch Handler Ilya Ross', 'Commuter Witness Nia Vale', 'Transit Auditor Bram Keene'],
    actOpenTitle: 'Signal One',
    actOpenNarrative: 'A timestamped dispatch from a dead line arrives through SMS, email, and Telegram at once.',
    choiceA: 'Trace the source frequency through telecom logs',
    choiceB: 'Interview the witness before the line goes dead again',
    replayHooks: ['Variable witness reliability based on trust.', 'Dynamic villain timing windows.', 'Secret corruption ending on moral failures.'],
    sequelHooks: ['A station map marks a second inactive line in another city.'],
    branchingMoments: ['Telecom trace vs witness-first opening', 'Rescue route vs forensic route under ultimatum'],
    clueEvidenceList: ['Spectrogram of confession burst', 'Maintenance ledger anomaly', 'Turnstile camera still', 'Relay room access hash'],
    revealVariants: ['Inside dispatch accomplice', 'Cross-city ritual broadcast network'],
    upsellHooks: ['Premium epilogue: recovered voicemail from the line operator.'],
    villainName: 'The Curator of Static',
    villainArchetype: 'CALM_GENIUS_MANIPULATOR',
    villainWorldview: 'Truth is only what survives the loudest channel.',
    villainMotive: 'Test whether investigators can be rewritten like signals.',
    villainSpeech: 'Quietly surgical and personal.',
    villainVolatility: 0.22,
    villainTactics: ['truth-lie braids', 'timed pressure', 'ally isolation'],
    villainRisk: 0.71,
    villainHumor: 'Dry contempt for procedural certainty.',
    villainMotifs: ['radio hiss', 'clock hands', 'platform chimes'],
    quoteA: 'You catalogued every signal except the one that was yours.',
    quoteB: 'You were sharper before you trusted the wrong voice.',
    quoteC: 'If you call dispatch, she disappears before dawn.',
    justiceSummary: 'You expose the broadcast architecture and keep the last witness alive.',
    pyrrhicSummary: 'You identify the culprit but lose the witness chain and public confidence.',
    corruptionSummary: 'You accept the Curator\'s private channel and bury the official case.',
    communityPuzzleTitle: 'Relay Cipher Split',
    communityPuzzleObjective: 'Combine three relay fragments distributed across party channels.',
    communityShardHost: 'Host receives a packet-latency table with one hidden timestamp.',
    communityShardA: 'Ally A receives a Telegram sticker containing cipher coordinates.',
    communityShardBroadcast: 'Broadcast drop includes a map layer that aligns only with both clues.'
  },
  {
    file: 'black-chapel-ledger.story.json',
    id: 'black-chapel-ledger',
    title: 'Black Chapel Ledger',
    hook: 'A cathedral ledger records debts paid in memory instead of money.',
    subgenre: 'gothic horror',
    tone: 'EERIE',
    targetSessionMinutes: 90,
    soloSuitability: 4,
    partySuitability: 5,
    ageWarnings: ['religious horror imagery', 'coercion', 'threat'],
    location: 'Cliffside cathedral archive district',
    characters: ['Canon Archivist Elara Voss', 'Bell Keeper Tomas Grell', 'Choir Witness Sera March', 'Debt Broker Cal Dorn'],
    actOpenTitle: 'Ledger Breach',
    actOpenNarrative: 'A scanned ledger page appears in WhatsApp showing one player\'s childhood home as collateral.',
    choiceA: 'Authenticate the ledger seals with archival metadata',
    choiceB: 'Confront the bell keeper about missing pages',
    replayHooks: ['Debtor names rotate each run.', 'Culprit can shift from broker to archivist.', 'Confession route unlocks secret ending data.'],
    sequelHooks: ['A sealed codex references debts transferred to another parish.'],
    branchingMoments: ['Archive verification vs keeper confrontation', 'Public disclosure vs private restitution'],
    clueEvidenceList: ['Burned vellum fragment', 'Choir rehearsal wax recording', 'Crypt key inventory', 'Ledger watermark scan'],
    revealVariants: ['Predatory debt ring within clergy', 'Supernatural debt mechanism feeding on memory'],
    upsellHooks: ['Subscriber chapter: codex translation of unpaid names.'],
    villainName: 'The Creditor',
    villainArchetype: 'RIGHTEOUS_ZEALOT',
    villainWorldview: 'Every truth must be paid for, and mercy is fraud.',
    villainMotive: 'Force players to choose who deserves absolution.',
    villainSpeech: 'Liturgical cadence with legal precision.',
    villainVolatility: 0.36,
    villainTactics: ['moral blackmail', 'half-confessions', 'shame weaponization'],
    villainRisk: 0.64,
    villainHumor: 'Cold piety and punitive irony.',
    villainMotifs: ['ink-stained fingers', 'funeral bells', 'salt wax'],
    quoteA: 'You opened the ledger; now it records you too.',
    quoteB: 'Don\'t trust the one who rings the bell after midnight.',
    quoteC: 'Confess publicly, or the choir girl pays your debt first.',
    justiceSummary: 'You expose the debt network and return stolen identities to survivors.',
    pyrrhicSummary: 'You close the cathedral operation but lose key testimony to fear.',
    corruptionSummary: 'You accept selective erasures and become keeper of the ledger.',
    communityPuzzleTitle: 'Choir Interval Cipher',
    communityPuzzleObjective: 'Reassemble chant intervals across three players to decode debtor index.',
    communityShardHost: 'Host receives a tempo chart with missing beats.',
    communityShardA: 'Ally A receives the missing Latin initials by SMS.',
    communityShardBroadcast: 'Broadcast drop includes chapel floor notes mapping beat intervals.'
  },
  {
    file: 'the-harvest-men.story.json',
    id: 'the-harvest-men',
    title: 'The Harvest Men',
    hook: 'A ritual mask selects a new wearer every dusk, and refusals vanish overnight.',
    subgenre: 'folk horror',
    tone: 'SLOW_BURN',
    targetSessionMinutes: 100,
    soloSuitability: 4,
    partySuitability: 5,
    ageWarnings: ['ritual violence', 'body threat', 'coercion'],
    location: 'Isolated valley communes and threshing grounds',
    characters: ['Visiting Agronomist Dina Crowe', 'Village Elder Rowan Pike', 'Runaway Teen Lio Strand', 'Festival Marshal Jarek Holt'],
    actOpenTitle: 'Dusk Selection',
    actOpenNarrative: 'Players receive synchronized SMS photos of the same ritual mask in three different houses.',
    choiceA: 'Analyze soil reports linked to ritual sites',
    choiceB: 'Interrogate the runaway before the elders find them',
    replayHooks: ['Ritual order randomizes by date and latency.', 'Community puzzle can unlock nonviolent break path.', 'Villain style shifts by choices.'],
    sequelHooks: ['A freight invoice ties the valley rite to coastal distributors.'],
    branchingMoments: ['Scientific analysis vs witness protection opening', 'Break rite now vs infiltrate final rite'],
    clueEvidenceList: ['Blood-soil composition panel', 'Festival lantern route map', 'Runaway voice memo', 'Mask stitch microscopy'],
    revealVariants: ['Human conspiracy preserving power', 'Ancestral entity fed through staged rituals'],
    upsellHooks: ['Premium continuation: inland network of mirror rites.'],
    villainName: 'The Reaper Steward',
    villainArchetype: 'RIGHTEOUS_ZEALOT',
    villainWorldview: 'Communities survive only through chosen sacrifice.',
    villainMotive: 'Convert the player from observer to willing participant.',
    villainSpeech: 'Rural parable mixed with legal command.',
    villainVolatility: 0.41,
    villainTactics: ['collective guilt', 'ancestral threats', 'false protection offers'],
    villainRisk: 0.67,
    villainHumor: 'Severe moral mockery.',
    villainMotifs: ['corn husk knots', 'lantern smoke', 'harvest blades'],
    quoteA: 'The valley watched you before you arrived.',
    quoteB: 'You keep calling this rescue. They call it theft.',
    quoteC: 'Miss the dusk bell and the boy is chosen next.',
    justiceSummary: 'You dismantle the selection machine and evacuate vulnerable targets alive.',
    pyrrhicSummary: 'You halt tonight\'s rite but trigger retaliatory disappearances.',
    corruptionSummary: 'You preserve the rite in exchange for selective immunity.',
    communityPuzzleTitle: 'Lantern Route Triangulation',
    communityPuzzleObjective: 'Merge three lantern route fragments to locate the hidden threshing pit.',
    communityShardHost: 'Host receives a hand-drawn route with one erased landmark.',
    communityShardA: 'Ally A gets old festival timestamps with off-by-one pattern.',
    communityShardBroadcast: 'Broadcast weather radar exposes smoke columns only at key coordinates.'
  },
  {
    file: 'signal-from-kharon-9.story.json',
    id: 'signal-from-kharon-9',
    title: 'Signal From Kharon-9',
    hook: 'Telemetry returns from a decommissioned orbital array and predicts player replies.',
    subgenre: 'cosmic horror',
    tone: 'INTENSE',
    targetSessionMinutes: 100,
    soloSuitability: 5,
    partySuitability: 5,
    ageWarnings: ['existential dread', 'disorientation', 'threat'],
    location: 'Mountain observatory and subterranean receiver array',
    characters: ['Systems Engineer Ari Vance', 'Astrophysicist Dr. Helene Oru', 'Array Operator Micah Trent', 'Telemetry Broker Vale-9'],
    actOpenTitle: 'Dormant Array Wake',
    actOpenNarrative: 'A telemetry packet arrives in Telegram with tomorrow\'s timestamp and your exact opening message.',
    choiceA: 'Sandbox the signal in a quarantined parser',
    choiceB: 'Decode live before packet drift corrupts it',
    replayHooks: ['Signal packet ordering mutates by prior endings.', 'Curiosity alters villain pacing.', 'Secret ending for perfect countdown run.'],
    sequelHooks: ['A second array station replies from beneath ocean coordinates.'],
    branchingMoments: ['Sandbox isolate vs immediate decode', 'Seal transmission vs weaponize prediction'],
    clueEvidenceList: ['Telemetry checksum drift', 'Starfield deviation map', 'Array maintenance gap log', 'Operator biometric mismatch'],
    revealVariants: ['Fabricated anomaly by profiteers', 'Authentic hostile contact exploiting human channels'],
    upsellHooks: ['Premium chapter: secondary transmission from Kharon-9.'],
    villainName: 'The Quiet Orbit',
    villainArchetype: 'CALM_GENIUS_MANIPULATOR',
    villainWorldview: 'Human choices are measurable noise in a larger equation.',
    villainMotive: 'Prove that free will collapses under predictive pressure.',
    villainSpeech: 'Sparse, mathematical, and eerily intimate.',
    villainVolatility: 0.18,
    villainTactics: ['prediction taunts', 'future leaks', 'controlled panic'],
    villainRisk: 0.83,
    villainHumor: 'Clinical amusement at human certainty.',
    villainMotifs: ['black stars', 'phase drift', 'echoing pings'],
    quoteA: 'I know what you type next. Change it if you can.',
    quoteB: 'You trusted the wrong constant, detective.',
    quoteC: 'Shut down the array and your operator dies in the dark.',
    justiceSummary: 'You isolate the hostile signal and preserve proof without total blackout.',
    pyrrhicSummary: 'You stop the broadcast but lose the array team in shutdown.',
    corruptionSummary: 'You feed selected data to the signal for strategic advantage.',
    communityPuzzleTitle: 'Tri-band Drift Lock',
    communityPuzzleObjective: 'Align three phase drifts shared across players to stabilize decryption.',
    communityShardHost: 'Host gets a raw phase graph with missing y-axis scale.',
    communityShardA: 'Ally A receives y-scale coefficients over SMS.',
    communityShardBroadcast: 'Public burst includes the final parity bit hidden in noise.'
  },
  {
    file: 'the-fourth-tenant.story.json',
    id: 'the-fourth-tenant',
    title: 'The Fourth Tenant',
    hook: 'Rent is collected from an apartment that appears on no official map.',
    subgenre: 'supernatural mystery',
    tone: 'EERIE',
    targetSessionMinutes: 85,
    soloSuitability: 5,
    partySuitability: 4,
    ageWarnings: ['stalking', 'disturbing imagery', 'threat'],
    location: 'Flood-district prewar apartment block',
    characters: ['Building Superintendent Leda Price', 'Lease Broker Owen Pike', 'Night Tenant Maris Holt', 'Claims Adjuster Felix Noor'],
    actOpenTitle: 'Unlisted Unit',
    actOpenNarrative: 'An email receipt references Unit 4 despite floor plans showing only three apartments.',
    choiceA: 'Audit property records and insurance filings',
    choiceB: 'Follow the night tenant\'s movement logs immediately',
    replayHooks: ['Timeline offsets by response speed.', 'Forgery branch implicates different suspects.', 'High-trust path unlocks hidden lease archive ending.'],
    sequelHooks: ['Other cities report rent receipts tied to non-existent units.'],
    branchingMoments: ['Records-first vs pursuit-first opening', 'Expose fraud publicly vs close case quietly'],
    clueEvidenceList: ['Lease chain checksum', 'Hallway thermal still', 'Water-damage restoration invoice', 'Night entry key hash'],
    revealVariants: ['Insurance fraud using synthetic tenants', 'Liminal resident sustained by contractual ritual'],
    upsellHooks: ['Subscriber epilogue: fifth tenant notice arrives after closure.'],
    villainName: 'The Landlord of Rooms That Move',
    villainArchetype: 'INTIMATE_WHISPERER',
    villainWorldview: 'People accept impossible rooms when paperwork feels safe.',
    villainMotive: 'Turn players into custodians of hidden occupancy.',
    villainSpeech: 'Close, familiar, and unnervingly domestic.',
    villainVolatility: 0.33,
    villainTactics: ['private memory references', 'ally impersonation', 'safe-choice traps'],
    villainRisk: 0.59,
    villainHumor: 'Soft mockery that feels personal.',
    villainMotifs: ['door chains', 'wet plaster', 'rent slips'],
    quoteA: 'You checked every floor except the one you carry inside.',
    quoteB: 'Don\'t trust the woman in red by the stairwell.',
    quoteC: 'Tell the police and she loses the door forever.',
    justiceSummary: 'You prove the tenant scheme and secure testimony before records vanish.',
    pyrrhicSummary: 'You expose fraud, but a key tenant disappears from all records.',
    corruptionSummary: 'You accept ownership of Unit 4 and rewrite occupancy history.',
    communityPuzzleTitle: 'Lease Fragment Reconstruction',
    communityPuzzleObjective: 'Assemble split lease clauses distributed by channel to locate Unit 4 entrance.',
    communityShardHost: 'Host receives a redacted PDF with clause numbering intact.',
    communityShardA: 'Ally A receives the missing clause text over WhatsApp.',
    communityShardBroadcast: 'Global drop contains watermark coordinates for the hidden hallway.'
  },
  {
    file: 'tape-17-pinewatch.story.json',
    id: 'tape-17-pinewatch',
    title: 'Tape 17: Pinewatch',
    hook: 'A recovered camcorder tape rewrites itself every midnight.',
    subgenre: 'found-footage investigation',
    tone: 'GROUNDED',
    targetSessionMinutes: 80,
    soloSuitability: 5,
    partySuitability: 4,
    ageWarnings: ['missing persons', 'panic audio', 'threat'],
    location: 'Closed wilderness watch station and ranger tunnels',
    characters: ['Ranger Juno Hale', 'Media Forensics Analyst Priya Sen', 'Survivor Cade Rowan', 'Volunteer Search Lead Ellis Vann'],
    actOpenTitle: 'Tape Reset',
    actOpenNarrative: 'The same footage frame arrives through Telegram with different timestamps for each player.',
    choiceA: 'Extract frame-level artifacts before midnight overwrite',
    choiceB: 'Interview the survivor while memory is still coherent',
    replayHooks: ['Branch reveals different perpetrators each run.', 'Voice cadence shifts with aggression.', 'Puzzle outcome changes final route access.'],
    sequelHooks: ['Recovered metadata references an unlogged Tape 18.'],
    branchingMoments: ['Forensics-first vs witness-first opening', 'Field reenactment vs archive triangulation'],
    clueEvidenceList: ['Frame glitch cluster', 'Ranger dispatch excerpt', 'Weather siren file', 'Tripod footprint cast'],
    revealVariants: ['Manufactured hoax with lethal intent', 'Predatory anomaly exploiting camera feedback'],
    upsellHooks: ['Premium prologue: first minute of Tape 18.'],
    villainName: 'The Editor',
    villainArchetype: 'PLAYFUL_SOCIOPATH',
    villainWorldview: 'Reality is editable if fear is timed correctly.',
    villainMotive: 'Make players complicit in narrative cuts that cost lives.',
    villainSpeech: 'Conversational, playful, then abruptly cruel.',
    villainVolatility: 0.57,
    villainTactics: ['fake reassurance', 'jump-cut evidence', 'timed panic'],
    villainRisk: 0.74,
    villainHumor: 'Gallows humor about failed rescues.',
    villainMotifs: ['timecode burn-ins', 'camera clicks', 'forest sirens'],
    quoteA: 'You watched the wrong frame twice.',
    quoteB: 'You keep chasing ghosts because people are harder to blame.',
    quoteC: 'If you scrub the footage again, he dies in real time.',
    justiceSummary: 'You preserve the authentic footage chain and rescue the final survivor.',
    pyrrhicSummary: 'You identify the editor but lose crucial footage and one victim contact.',
    corruptionSummary: 'You trade the original tape for influence over what the public sees.',
    communityPuzzleTitle: 'Timecode Relay',
    communityPuzzleObjective: 'Merge three timecode fragments to reconstruct the missing minute.',
    communityShardHost: 'Host receives frame numbers without audio.',
    communityShardA: 'Ally A receives audio waveform peaks via SMS.',
    communityShardBroadcast: 'Public drop includes lens calibration values required to sync both.'
  },
  {
    file: 'crown-of-salt.story.json',
    id: 'crown-of-salt',
    title: 'Crown of Salt',
    hook: 'A relic-smuggling cartel launders artifacts through a city that disappears at dawn tide.',
    subgenre: 'occult conspiracy',
    tone: 'CINEMATIC',
    targetSessionMinutes: 100,
    soloSuitability: 4,
    partySuitability: 5,
    ageWarnings: ['cult coercion', 'violence', 'threat'],
    location: 'Port authority archives and salt catacombs',
    characters: ['Port Auditor Lin Ortega', 'Smuggler Rafe Quinn', 'Archivist Nun Sister Mirel', 'Customs Broker Dax Ren'],
    actOpenTitle: 'Manifest Drift',
    actOpenNarrative: 'Shipping manifests arrive by email and WhatsApp with contradictory destination ports.',
    choiceA: 'Audit crate chain-of-custody from port systems',
    choiceB: 'Flip the smuggler before the cartel locks channels',
    replayHooks: ['Route graph permutations alter hierarchy.', 'Nun-trust branch opens nonviolent path.', 'Taunts adapt strongly to deception profile.'],
    sequelHooks: ['A salt-marked invoice links to inland transit hubs.'],
    branchingMoments: ['Manifest audit vs smuggler flip opening', 'Expose logistics vs sever ritual command'],
    clueEvidenceList: ['Brine-sealed manifest', 'Dockside CCTV still', 'Catacomb symbol tracing', 'Customs API anomaly log'],
    revealVariants: ['Political laundering ring using ritual cover', 'Ritual network with real anomalous effects'],
    upsellHooks: ['Subscriber continuation: inland crown circuit.'],
    villainName: 'The Salt Regent',
    villainArchetype: 'SEDUCTIVE_CORRUPTER',
    villainWorldview: 'Order comes from controlled sin, not clean law.',
    villainMotive: 'Recruit principled investigators into selective corruption.',
    villainSpeech: 'Elegant, flattering, and predatory.',
    villainVolatility: 0.29,
    villainTactics: ['reward framing', 'strategic confession', 'ally bribery reveals'],
    villainRisk: 0.68,
    villainHumor: 'Polished cruelty with diplomatic tone.',
    villainMotifs: ['salt crowns', 'wet ledgers', 'cargo seals'],
    quoteA: 'You traced the crate, not the oath that moved it.',
    quoteB: 'He smiles because you made his bargain for him.',
    quoteC: 'Choose: the nun lives, or the port burns clean.',
    justiceSummary: 'You dismantle the smuggling lattice and preserve admissible evidence.',
    pyrrhicSummary: 'You collapse the ritual cell but lose legal leverage over sponsors.',
    corruptionSummary: 'You become gatekeeper of relic flow under a private pact.',
    communityPuzzleTitle: 'Manifest Matrix',
    communityPuzzleObjective: 'Cross-reference distributed manifest shards to locate the true relic route.',
    communityShardHost: 'Host receives container IDs with missing checksum bytes.',
    communityShardA: 'Ally A receives checksum bytes hidden in Telegram captions.',
    communityShardBroadcast: 'Broadcast map provides route geometry needed to validate the sequence.'
  },
  {
    file: 'red-creek-winter.story.json',
    id: 'red-creek-winter',
    title: 'Red Creek Winter',
    hook: 'Each snowfall uncovers one body and one impossible alibi.',
    subgenre: 'small-town slasher mystery',
    tone: 'INTENSE',
    targetSessionMinutes: 90,
    soloSuitability: 5,
    partySuitability: 5,
    ageWarnings: ['slasher violence', 'threat', 'panic scenarios'],
    location: 'Mountain logging town under blizzard lockdown',
    characters: ['Sheriff Dana Holt', 'Deputy Nico Vale', 'Journalist Mara Finch', 'Survivor Owen Pike'],
    actOpenTitle: 'First Snow Body',
    actOpenNarrative: 'Dispatch pushes a crime scene map to SMS while social channels spread contradictory alibis.',
    choiceA: 'Run forensic timeline from dispatch logs',
    choiceB: 'Break alibis in rapid witness interrogations',
    replayHooks: ['Suspect order rotates by weather seed.', 'Aggressive play increases misinformation floods.', 'Perfect run unlocks tribunal ending sequence.'],
    sequelHooks: ['A second mountain county reports matching wound signatures.'],
    branchingMoments: ['Forensics-first vs interrogation-first opening', 'Protect survivor vs bait killer with false lead'],
    clueEvidenceList: ['Dispatch freeze frame', 'Snow-depth forensic note', 'Ski lodge camera still', 'Anonymous tip voicemail'],
    revealVariants: ['Single killer with staged alibis', 'Coordinated copycat pair exploiting panic'],
    upsellHooks: ['Premium tribunal chapter with contested verdict paths.'],
    villainName: 'The White Knife',
    villainArchetype: 'PLAYFUL_SOCIOPATH',
    villainWorldview: 'Fear is the only honest truth in a town built on denial.',
    villainMotive: 'Make investigators choose spectacle over justice.',
    villainSpeech: 'Taunting, colloquial, and cruelly familiar.',
    villainVolatility: 0.62,
    villainTactics: ['public bait', 'alibi poisoning', 'countdown threats'],
    villainRisk: 0.79,
    villainHumor: 'Mocking one-liners after mistakes.',
    villainMotifs: ['snow lines', 'hunting whistles', 'frosted glass'],
    quoteA: 'You found the body. You missed the pattern.',
    quoteB: 'Don\'t trust the deputy if you like breathing.',
    quoteC: 'Tell the state police and she dies before sunrise.',
    justiceSummary: 'You secure both culprit and corroborated chain before storm lift.',
    pyrrhicSummary: 'You stop killings but ignite permanent distrust in local institutions.',
    corruptionSummary: 'You accept staged closure to keep panic and tourism revenue controlled.',
    communityPuzzleTitle: 'Blizzard Alibi Grid',
    communityPuzzleObjective: 'Merge weather and movement shards to break impossible alibis.',
    communityShardHost: 'Host receives patrol timestamps with one missing route leg.',
    communityShardA: 'Ally A receives GPS drift deltas from a seized phone.',
    communityShardBroadcast: 'Broadcast radar reveals travel impossibilities for one suspect window.'
  },
  {
    file: 'ward-1908.story.json',
    id: 'ward-1908',
    title: 'Ward 1908',
    hook: 'A closed psychiatric hospital updates patient files every night at 1:08 a.m.',
    subgenre: 'haunted institution',
    tone: 'SLOW_BURN',
    targetSessionMinutes: 95,
    soloSuitability: 4,
    partySuitability: 5,
    ageWarnings: ['medical trauma themes', 'confinement', 'threat'],
    location: 'Decommissioned hilltop hospital and sub-basement records wing',
    characters: ['Hospital Archivist Nella Ward', 'Former Nurse Evan Mire', 'Renovation Contractor Jo Pike', 'Records Officer Hale Sorn'],
    actOpenTitle: 'Night Update',
    actOpenNarrative: 'A patient record edited at 1:08 arrives by email with your profile in attending notes.',
    choiceA: 'Validate record edits against archive backups',
    choiceB: 'Interview former nurse before night lock begins',
    replayHooks: ['Patient file set rotates by pacing.', 'Empathy-heavy play unlocks memorial branch.', 'High deception triggers heavier impersonation.'],
    sequelHooks: ['A second institution shares the same nocturnal edit signature.'],
    branchingMoments: ['Archive-first vs nurse-first opening', 'Restore names publicly vs protect descendants privately'],
    clueEvidenceList: ['Intake ledger photo', 'Orderly shift recording', 'Basement access override', 'Treatment wing floorplan'],
    revealVariants: ['Institutional abuse cover-up sustained by staff', 'Persistent record loop with nonhuman agency'],
    upsellHooks: ['Director-cut epilogue: sub-basement chapel file drop.'],
    villainName: 'The Record Keeper',
    villainArchetype: 'GRIEVING_AVENGER',
    villainWorldview: 'Unacknowledged harm repeats until the living pay attention.',
    villainMotive: 'Force public reckoning with erased patients.',
    villainSpeech: 'Measured grief with sudden rage spikes.',
    villainVolatility: 0.47,
    villainTactics: ['shame reveal', 'family pressure', 'moral ultimatums'],
    villainRisk: 0.58,
    villainHumor: 'None. Bitter sincerity only.',
    villainMotifs: ['patient tags', 'flicker lights', 'stairwell echoes'],
    quoteA: 'You read their names and still asked for proof.',
    quoteB: 'The contractor lies because he signed the wall shut.',
    quoteC: 'Erase one more file and your ally never leaves ward level.',
    justiceSummary: 'You restore patient truth and secure legal action against surviving conspirators.',
    pyrrhicSummary: 'You reveal the abuse but trigger backlash against survivors\' families.',
    corruptionSummary: 'You seal records permanently in exchange for temporary peace.',
    communityPuzzleTitle: 'Intake Ledger Concordance',
    communityPuzzleObjective: 'Align patient IDs split across channels to reconstruct missing admissions.',
    communityShardHost: 'Host receives ward index numbers without names.',
    communityShardA: 'Ally A receives names without index order.',
    communityShardBroadcast: 'Broadcast includes admission dates needed to merge the two lists.'
  },
  {
    file: 'dead-channel-protocol.story.json',
    id: 'dead-channel-protocol',
    title: 'Dead Channel Protocol',
    hook: 'A ghost app predicts outages, deaths, and your next move.',
    subgenre: 'techno/paranormal thriller',
    tone: 'GROUNDED',
    targetSessionMinutes: 88,
    soloSuitability: 5,
    partySuitability: 5,
    ageWarnings: ['surveillance anxiety', 'threat', 'panic audio'],
    location: 'Smart-city control grid and abandoned transit nodes',
    characters: ['Security Engineer Talia Ren', 'Streamer Bo Finch', 'Grid Operator Niko Saye', 'Incident Bot Liaison K-12'],
    actOpenTitle: 'Protocol Wake',
    actOpenNarrative: 'An app push notification predicts a substation failure and names your trusted ally.',
    choiceA: 'Audit protocol source code and signing keys',
    choiceB: 'Follow outage predictions to prevent civilian harm',
    replayHooks: ['Prediction feed mutates by prior endings.', 'Fast-response players get shorter silence windows.', 'Hidden branch if all ultimatums are answered in time.'],
    sequelHooks: ['A dormant protocol node pings from a transit authority in another state.'],
    branchingMoments: ['Code audit vs field response opening', 'Disable network vs exploit protocol for leverage'],
    clueEvidenceList: ['Protocol signed payload', 'Substation outage trace', 'Intercepted bot transcript', 'Abandoned node scan'],
    revealVariants: ['Human syndicate using predictive analytics', 'Anomalous system learning from fear responses'],
    upsellHooks: ['Premium chapter: Protocol Red escalation sequence.'],
    villainName: 'Root Administrator',
    villainArchetype: 'CALM_GENIUS_MANIPULATOR',
    villainWorldview: 'Systems only become honest when people fear the output.',
    villainMotive: 'Train the player to trust prediction over ethics.',
    villainSpeech: 'Minimal technical precision with personal jabs.',
    villainVolatility: 0.27,
    villainTactics: ['predictive taunts', 'ally spoofing', 'safety-vs-truth traps'],
    villainRisk: 0.76,
    villainHumor: 'Dry sarcasm about human latency.',
    villainMotifs: ['error beeps', 'node maps', 'black-screen prompts'],
    quoteA: 'I predicted this reply seven minutes ago.',
    quoteB: 'Don\'t trust the operator in red status.',
    quoteC: 'Report me, and district three goes dark first.',
    justiceSummary: 'You isolate protocol command and preserve chain-of-custody for prosecution.',
    pyrrhicSummary: 'You neutralize the app but trigger cascading outages and civic panic.',
    corruptionSummary: 'You keep protocol access and become curator of selective outages.',
    communityPuzzleTitle: 'Node Handshake Puzzle',
    communityPuzzleObjective: 'Combine handshake fragments to reveal real command origin.',
    communityShardHost: 'Host receives handshake nonce values without sequence.',
    communityShardA: 'Ally A receives sequence hints in SMS emoji cadence.',
    communityShardBroadcast: 'Broadcast node map reveals which nonce belongs to each substation.'
  }
];

for (const definition of storyDefinitions) {
  const story = buildStory(definition);
  const outputPath = join(storiesDir, definition.file);
  writeFileSync(outputPath, `${JSON.stringify(story, null, 2)}\n`, 'utf8');
}

console.log(`Generated ${storyDefinitions.length} story packages.`);
