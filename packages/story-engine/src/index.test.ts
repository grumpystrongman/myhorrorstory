import { describe, expect, it } from 'vitest';
import { createInitialRuntimeState, evaluateAndApplyRules, getUnlockedBeats } from './index';
import type { StoryPackage, TriggerCondition } from '@myhorrorstory/contracts';

const alwaysTrueCondition: TriggerCondition = {
  kind: 'predicate',
  predicate: {
    source: 'ELAPSED_SECONDS',
    key: 'elapsed',
    operator: 'GTE',
    value: 0
  }
};

const story: StoryPackage = {
  id: 'case-1',
  version: 'v2',
  title: 'Case',
  hook: 'Hook',
  subgenre: 'psychological horror',
  tone: 'CINEMATIC',
  targetSessionMinutes: 90,
  soloSuitability: 5,
  partySuitability: 5,
  ageWarnings: ['violence'],
  characters: ['A', 'B', 'C'],
  location: 'Mansion',
  replayHooks: ['alt ending'],
  sequelHooks: ['new cult'],
  branchingMoments: ['suspect split', 'late-game confession'],
  clueEvidenceList: ['memo', 'recording', 'fingerprint', 'photo'],
  revealVariants: ['human culprit', 'ritual culprit'],
  upsellHooks: ['director cut epilogue'],
  playerReputationModel: {
    startingScores: {
      trustworthiness: 0,
      aggression: 0,
      curiosity: 0,
      deception: 0,
      morality: 0
    },
    decayPerDay: 0,
    axisGuidance: [
      {
        axis: 'trustworthiness',
        positiveBehavior: 'Keep promises.',
        negativeBehavior: 'Break promises.'
      },
      {
        axis: 'aggression',
        positiveBehavior: 'Assert boundaries.',
        negativeBehavior: 'Use threats often.'
      },
      {
        axis: 'curiosity',
        positiveBehavior: 'Ask follow-up questions.',
        negativeBehavior: 'Ignore anomalies.'
      },
      {
        axis: 'deception',
        positiveBehavior: 'Use strategic bluff sparingly.',
        negativeBehavior: 'Lie constantly.'
      },
      {
        axis: 'morality',
        positiveBehavior: 'Protect bystanders.',
        negativeBehavior: 'Sacrifice innocents.'
      }
    ]
  },
  channelCadence: {
    primaryChannels: ['SMS', 'WHATSAPP', 'TELEGRAM'],
    auxiliaryChannels: ['EMAIL', 'VOICE_MESSAGE', 'DOCUMENT_DROP'],
    lateNightMessagingDefault: false,
    maxVillainTouchesPerDay: 3,
    suspenseSilenceWindowMinutes: {
      min: 45,
      max: 240
    }
  },
  acts: [
    {
      id: 'a1',
      title: 'Act I',
      beats: [
        {
          id: 'beat-1',
          title: 'Start',
          narrative: 'Open',
          unlockAfterSeconds: 0,
          requiredConditions: [],
          choices: [],
          revealsClueIds: []
        }
      ]
    }
  ],
  npcProfiles: [
    {
      id: 'npc-handler',
      displayName: 'Handler',
      role: 'HANDLER',
      personalityTraits: ['methodical', 'guarded'],
      baselineEmotion: 'CALM',
      motivations: ['Close case quickly'],
      trustBaseline: 55,
      trustCeiling: 90,
      secrets: [
        {
          id: 'handler-secret',
          title: 'Past mistake',
          summary: 'Handler buried a report.',
          trustThreshold: 65,
          revealCondition: alwaysTrueCondition,
          consequenceOnReveal: 'Opens alternate witness branch.'
        }
      ],
      responseStyle: {
        accusation: 'deflect',
        threat: 'withdraw',
        questioning: 'procedural'
      }
    },
    {
      id: 'npc-witness',
      displayName: 'Witness',
      role: 'WITNESS',
      personalityTraits: ['anxious', 'observant'],
      baselineEmotion: 'ANXIOUS',
      motivations: ['Stay alive'],
      trustBaseline: 40,
      trustCeiling: 85,
      secrets: [
        {
          id: 'witness-secret',
          title: 'Saw the scene twice',
          summary: 'Witness was present during both incidents.',
          trustThreshold: 50,
          revealCondition: alwaysTrueCondition,
          consequenceOnReveal: 'Unlocks timeline correction.'
        }
      ],
      responseStyle: {
        accusation: 'panic',
        threat: 'silent',
        questioning: 'fragmented'
      }
    },
    {
      id: 'npc-rival',
      displayName: 'Rival Detective',
      role: 'RIVAL',
      personalityTraits: ['competitive', 'skeptical'],
      baselineEmotion: 'SUSPICIOUS',
      motivations: ['Protect own career'],
      trustBaseline: 35,
      trustCeiling: 80,
      secrets: [
        {
          id: 'rival-secret',
          title: 'Tampered evidence',
          summary: 'Rival removed one timestamped photo.',
          trustThreshold: 75,
          revealCondition: alwaysTrueCondition,
          consequenceOnReveal: 'Opens secret ending eligibility.'
        }
      ],
      responseStyle: {
        accusation: 'counter-accuse',
        threat: 'escalate',
        questioning: 'legalistic'
      }
    }
  ],
  villain: {
    id: 'villain-the-curator',
    displayName: 'The Curator',
    archetype: 'CALM_GENIUS_MANIPULATOR',
    worldview: 'Truth is a staged performance.',
    motive: 'Force investigators to betray their ethics.',
    signatureSpeechStyle: 'Precise, clipped, and intimate.',
    emotionalVolatility: 0.25,
    obsessionTarget: 'The lead detective',
    triggerConditions: ['Player nears the correct suspect.', 'Player protects a witness.'],
    manipulationTactics: ['truth-lie blends', 'ally isolation', 'false urgency'],
    riskTolerance: 0.72,
    humorOrCruelty: 'Dry contempt.',
    symbolicMotifs: ['rail static', 'clock faces'],
    escalationStages: [
      {
        stage: 1,
        label: 'Peripheral Presence',
        objective: 'Establish surveillance dread.',
        entryCondition: alwaysTrueCondition,
        allowedMessageTypes: ['CRYPTIC_CLUE', 'PERSONAL_OBSERVATION'],
        timing: {
          minIntervalMinutes: 120,
          maxTouchesPerDay: 2,
          allowLateNight: false
        }
      },
      {
        stage: 2,
        label: 'Psychological Contact',
        objective: 'Erode trust in allies.',
        entryCondition: alwaysTrueCondition,
        allowedMessageTypes: ['TAUNT', 'FALSE_REASSURANCE', 'RIDDLE'],
        timing: {
          minIntervalMinutes: 90,
          maxTouchesPerDay: 3,
          allowLateNight: false
        }
      },
      {
        stage: 3,
        label: 'Active Interference',
        objective: 'Force high-cost decisions.',
        entryCondition: alwaysTrueCondition,
        allowedMessageTypes: ['THREAT', 'COUNTDOWN', 'MEDIA_DROP'],
        timing: {
          minIntervalMinutes: 60,
          maxTouchesPerDay: 3,
          allowLateNight: true
        }
      },
      {
        stage: 4,
        label: 'Personal Confrontation',
        objective: 'Attempt recruitment or ruin.',
        entryCondition: alwaysTrueCondition,
        allowedMessageTypes: ['MORAL_TEST', 'PARTIAL_CONFESSION', 'MANIPULATIVE_INSTRUCTION'],
        timing: {
          minIntervalMinutes: 45,
          maxTouchesPerDay: 4,
          allowLateNight: true
        }
      }
    ]
  },
  villainMessageTemplates: [
    {
      id: 'msg-1',
      stage: 1,
      type: 'CRYPTIC_CLUE',
      channels: ['SMS'],
      textTemplate: 'You missed what mattered at {{location}}.',
      personalizationKeys: ['location'],
      branchEffects: ['seed-doubt']
    },
    {
      id: 'msg-2',
      stage: 2,
      type: 'TAUNT',
      channels: ['WHATSAPP'],
      textTemplate: 'You were smarter yesterday, {{playerName}}.',
      personalizationKeys: ['playerName'],
      branchEffects: ['aggression-rise']
    },
    {
      id: 'msg-3',
      stage: 2,
      type: 'RIDDLE',
      channels: ['TELEGRAM'],
      textTemplate: 'Three clocks, one lie. Which one stops for blood?',
      personalizationKeys: [],
      branchEffects: ['puzzle-unlock']
    },
    {
      id: 'msg-4',
      stage: 3,
      type: 'THREAT',
      channels: ['SMS', 'VOICE_MESSAGE'],
      textTemplate: 'If you call this justice again, someone else bleeds.',
      personalizationKeys: [],
      branchEffects: ['witness-risk']
    },
    {
      id: 'msg-5',
      stage: 3,
      type: 'COUNTDOWN',
      channels: ['SMS'],
      textTemplate: 'Ten minutes. Choose the station or the witness.',
      personalizationKeys: [],
      branchEffects: ['countdown-armed']
    },
    {
      id: 'msg-6',
      stage: 4,
      type: 'MORAL_TEST',
      channels: ['EMAIL'],
      textTemplate: 'Tell me one truth you hide, and I return one life.',
      personalizationKeys: [],
      branchEffects: ['corruption-branch']
    }
  ],
  arcMap: [
    {
      id: 'arc-contact',
      title: 'Static Contact',
      stage: 'OPENING',
      summary: 'The first impossible broadcast establishes the case.',
      entryCondition: alwaysTrueCondition,
      completionCondition: {
        kind: 'predicate',
        predicate: {
          source: 'HAS_CLUE',
          key: 'clue-origin',
          operator: 'EQ',
          value: true
        }
      },
      primaryRuleIds: ['rule-first-contact', 'rule-delay-punish']
    },
    {
      id: 'arc-disruption',
      title: 'Trust Collapse',
      stage: 'MIDDLE',
      summary: 'Ally trust destabilizes while false evidence appears.',
      entryCondition: {
        kind: 'predicate',
        predicate: {
          source: 'VILLAIN_STAGE',
          key: 'stage',
          operator: 'GTE',
          value: 2
        }
      },
      completionCondition: {
        kind: 'predicate',
        predicate: {
          source: 'INVESTIGATION_PROGRESS',
          key: 'percent',
          operator: 'GTE',
          value: 70
        }
      },
      primaryRuleIds: ['rule-incorrect-accusation', 'rule-ally-cooperation']
    },
    {
      id: 'arc-confrontation',
      title: 'Final Ledger',
      stage: 'ENDGAME',
      summary: 'The final confrontation decides justice, compromise, or collapse.',
      entryCondition: {
        kind: 'predicate',
        predicate: {
          source: 'INVESTIGATION_PROGRESS',
          key: 'percent',
          operator: 'GTE',
          value: 80
        }
      },
      completionCondition: {
        kind: 'predicate',
        predicate: {
          source: 'EVENT_OCCURRED',
          key: 'case.closed',
          operator: 'EQ',
          value: true
        }
      },
      primaryRuleIds: ['rule-near-success', 'rule-moral-fork']
    }
  ],
  triggerRules: [
    {
      id: 'rule-first-contact',
      name: 'First Contact',
      description: 'The villain reveals awareness after the first clue.',
      eventType: 'CLUE_DISCOVERED',
      when: {
        kind: 'predicate',
        predicate: {
          source: 'HAS_CLUE',
          key: 'clue-origin',
          operator: 'EQ',
          value: true
        }
      },
      actions: [
        {
          type: 'ADVANCE_VILLAIN_STAGE',
          stage: 2
        },
        {
          type: 'SEND_MESSAGE',
          channel: 'SMS',
          templateId: 'msg-1',
          delaySeconds: 180
        }
      ],
      priority: 80,
      cooldownSeconds: 300,
      maxActivations: 1
    },
    {
      id: 'rule-delay-punish',
      name: 'Silence Is Consent',
      description: 'Long silence causes threat escalation.',
      eventType: 'PLAYER_DELAY',
      when: {
        kind: 'predicate',
        predicate: {
          source: 'SILENCE_SECONDS',
          key: 'silence',
          operator: 'GTE',
          value: 14400
        }
      },
      actions: [
        {
          type: 'SEND_MESSAGE',
          channel: 'WHATSAPP',
          templateId: 'msg-2',
          delaySeconds: 60
        },
        {
          type: 'EMIT_EVENT',
          eventId: 'witness.missing'
        }
      ],
      priority: 75,
      cooldownSeconds: 1800,
      maxActivations: 2
    },
    {
      id: 'rule-incorrect-accusation',
      name: 'Wrong Target',
      description: 'Incorrect accusations reduce trust and push danger upward.',
      eventType: 'PLAYER_ACCUSATION',
      when: {
        kind: 'all',
        conditions: [
          {
            kind: 'predicate',
            predicate: {
              source: 'FLAG',
              key: 'accusationCorrect',
              operator: 'EQ',
              value: false
            }
          },
          {
            kind: 'predicate',
            predicate: {
              source: 'VILLAIN_STAGE',
              key: 'stage',
              operator: 'LTE',
              value: 3
            }
          }
        ]
      },
      actions: [
        {
          type: 'UPDATE_NPC_TRUST',
          npcId: 'npc-witness',
          delta: -15
        },
        {
          type: 'ADVANCE_VILLAIN_STAGE',
          stage: 3
        },
        {
          type: 'SEND_MESSAGE',
          channel: 'TELEGRAM',
          templateId: 'msg-4',
          delaySeconds: 120
        }
      ],
      priority: 90,
      cooldownSeconds: 900,
      maxActivations: 2
    },
    {
      id: 'rule-ally-cooperation',
      name: 'Trusted Ally Reveal',
      description: 'High ally trust unlocks deeper truth clues.',
      eventType: 'NPC_TRUST_CHANGED',
      when: {
        kind: 'predicate',
        predicate: {
          source: 'NPC_TRUST',
          key: 'npc-handler',
          operator: 'GTE',
          value: 70
        }
      },
      actions: [
        {
          type: 'REVEAL_CLUE',
          clueId: 'clue-archivist-ledger'
        },
        {
          type: 'SET_FLAG',
          key: 'allyEvidenceUnlocked',
          value: true
        }
      ],
      priority: 65,
      cooldownSeconds: 0,
      maxActivations: 1
    },
    {
      id: 'rule-near-success',
      name: 'Near Success Panic',
      description: 'As players near success, the villain issues an ultimatum.',
      eventType: 'INVESTIGATION_PROGRESS',
      when: {
        kind: 'predicate',
        predicate: {
          source: 'INVESTIGATION_PROGRESS',
          key: 'percent',
          operator: 'GTE',
          value: 85
        }
      },
      actions: [
        {
          type: 'ADVANCE_VILLAIN_STAGE',
          stage: 4
        },
        {
          type: 'START_COUNTDOWN',
          countdownId: 'final-choice',
          durationSeconds: 900,
          failureEventId: 'hostage.lost'
        },
        {
          type: 'SEND_MESSAGE',
          channel: 'SMS',
          templateId: 'msg-5',
          delaySeconds: 30
        }
      ],
      priority: 95,
      cooldownSeconds: 300,
      maxActivations: 1
    },
    {
      id: 'rule-moral-fork',
      name: 'Moral Fork',
      description: 'Low morality enables corruption ending path.',
      eventType: 'PLAYER_MESSAGE',
      when: {
        kind: 'predicate',
        predicate: {
          source: 'PLAYER_REPUTATION',
          key: 'morality',
          operator: 'LT',
          value: -15
        }
      },
      actions: [
        {
          type: 'UNLOCK_ENDING',
          endingId: 'ending-corrupted-pact'
        },
        {
          type: 'SEND_MESSAGE',
          channel: 'EMAIL',
          templateId: 'msg-6',
          delaySeconds: 300
        }
      ],
      priority: 70,
      cooldownSeconds: 1800,
      maxActivations: 1
    }
  ],
  endingVariants: [
    {
      id: 'ending-clean-conviction',
      title: 'Clean Conviction',
      type: 'JUSTICE',
      summary: 'Players preserve witnesses and expose the true architect.',
      requiredCondition: {
        kind: 'all',
        conditions: [
          {
            kind: 'predicate',
            predicate: {
              source: 'INVESTIGATION_PROGRESS',
              key: 'percent',
              operator: 'GTE',
              value: 85
            }
          },
          {
            kind: 'predicate',
            predicate: {
              source: 'PLAYER_REPUTATION',
              key: 'morality',
              operator: 'GTE',
              value: 10
            }
          },
          {
            kind: 'predicate',
            predicate: {
              source: 'EVENT_OCCURRED',
              key: 'hostage.saved',
              operator: 'EQ',
              value: true
            }
          }
        ]
      },
      blockedCondition: {
        kind: 'predicate',
        predicate: {
          source: 'EVENT_OCCURRED',
          key: 'evidence.destroyed',
          operator: 'EQ',
          value: true
        }
      },
      epilogue: 'The annex reopens and the false transcripts stop forever.',
      sequelHook: 'A final static pulse carries coordinates for Case 2.'
    },
    {
      id: 'ending-compromised-truth',
      title: 'Compromised Truth',
      type: 'PYRRHIC',
      summary: 'Players solve the case but lose public trust and one ally.',
      requiredCondition: {
        kind: 'all',
        conditions: [
          {
            kind: 'predicate',
            predicate: {
              source: 'INVESTIGATION_PROGRESS',
              key: 'percent',
              operator: 'GTE',
              value: 80
            }
          },
          {
            kind: 'predicate',
            predicate: {
              source: 'EVENT_OCCURRED',
              key: 'witness.missing',
              operator: 'EQ',
              value: true
            }
          }
        ]
      },
      epilogue: 'The culprit is arrested, but the town blames you for collateral harm.',
      sequelHook: 'The missing witness sends a garbled voicemail from another city.'
    },
    {
      id: 'ending-corrupted-pact',
      title: 'Corrupted Pact',
      type: 'CORRUPTION',
      summary: 'Players trade justice for access and become part of the network.',
      requiredCondition: {
        kind: 'predicate',
        predicate: {
          source: 'ENDING_STATUS',
          key: 'unlocked:ending-corrupted-pact',
          operator: 'EQ',
          value: true
        }
      },
      epilogue: 'The case closes as unsolved while your private channel receives new targets.',
      sequelHook: 'Season 2 opens with your encrypted credentials already active.'
    }
  ],
  communityPuzzles: [
    {
      id: 'puzzle-signal-crossfade',
      title: 'Signal Crossfade',
      objective: 'Combine three channel fragments to reveal station coordinates.',
      shards: [
        {
          id: 'shard-a',
          heldBy: 'HOST',
          content: 'A reversed timecode from a voice note.'
        },
        {
          id: 'shard-b',
          heldBy: 'ALLY_A',
          content: 'A cipher key hidden in SMS punctuation.'
        },
        {
          id: 'shard-c',
          heldBy: 'GLOBAL_BROADCAST',
          content: 'A map overlay dropped to all party members.'
        }
      ],
      solvedByRuleId: 'rule-near-success',
      rewardClueId: 'clue-origin',
      failureConsequence: 'The villain receives your shared decryption logs.'
    }
  ],
  investigationBoard: {
    nodes: [
      {
        id: 'suspect-curator',
        type: 'SUSPECT',
        label: 'The Curator',
        summary: 'Anonymous coordinator behind transmissions.'
      },
      {
        id: 'suspect-rival',
        type: 'SUSPECT',
        label: 'Rival Detective',
        summary: 'Possible evidence manipulator.'
      },
      {
        id: 'location-annex',
        type: 'LOCATION',
        label: 'Control Annex',
        summary: 'Abandoned station wing where feeds originate.'
      },
      {
        id: 'evidence-spectrogram',
        type: 'EVIDENCE',
        label: 'Spectrogram 44-A',
        summary: 'Audio profile contains impossible overlap signatures.'
      }
    ],
    links: [
      {
        fromId: 'suspect-curator',
        toId: 'location-annex',
        relation: 'broadcast-source',
        confidence: 0.77
      },
      {
        fromId: 'suspect-rival',
        toId: 'evidence-spectrogram',
        relation: 'tampered-metadata',
        confidence: 0.62
      },
      {
        fromId: 'location-annex',
        toId: 'evidence-spectrogram',
        relation: 'capture-site',
        confidence: 0.84
      }
    ],
    timeline: [
      {
        id: 't1',
        timeLabel: '22:15',
        summary: 'First impossible confession broadcast received.',
        relatedNodeIds: ['location-annex', 'evidence-spectrogram']
      },
      {
        id: 't2',
        timeLabel: '23:42',
        summary: 'Witness reports a second voice matching the player.',
        relatedNodeIds: ['suspect-curator']
      },
      {
        id: 't3',
        timeLabel: '00:18',
        summary: 'Power returns to annex without city grid record.',
        relatedNodeIds: ['location-annex']
      }
    ]
  },
  seasonContinuity: {
    seasonId: 'season-1',
    returningCharacterIds: ['npc-handler', 'villain-the-curator'],
    persistedReputationAxes: ['trustworthiness', 'aggression', 'curiosity', 'deception', 'morality'],
    carryForwardFlags: ['villain-contact-opened', 'saved-key-witness', 'accepted-corruption-terms'],
    continuityNotes: 'The Curator thread carries into all season one finales.'
  },
  safetyProfile: {
    intensityLevel: 3,
    threatTone: 'MODERATE',
    realismLevel: 'IMMERSIVE',
    allowLateNightMessaging: false,
    supportsOptDown: true,
    contentWarnings: ['stalking', 'coercion', 'audio distress']
  }
};

describe('story engine', () => {
  it('returns unlocked beats', () => {
    const beats = getUnlockedBeats(story, createInitialRuntimeState());
    expect(beats).toHaveLength(1);
  });

  it('evaluates trigger rules and applies resulting actions', () => {
    const state = createInitialRuntimeState({
      clues: ['clue-origin'],
      elapsedSeconds: 360,
      silenceSeconds: 0,
      villainStage: 1,
      investigationProgress: 20
    });

    const result = evaluateAndApplyRules(story.triggerRules, state, {
      eventType: 'CLUE_DISCOVERED'
    });

    expect(result.triggeredRuleIds).toContain('rule-first-contact');
    expect(result.nextState.villainStage).toBe(2);
    expect(result.nextState.flags.lastOutboundTemplate).toBe('msg-1');
    expect(result.nextState.flags.lastOutboundChannel).toBe('SMS');
  });
});
