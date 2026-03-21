import { describe, expect, it } from 'vitest';
import { adaptArgToDramaPackage, type ArgNpcProfile } from './arg-to-drama';
import type { ArgCampaignManifest, ArgDayPackage } from './arg-campaign';

const campaign: ArgCampaignManifest = {
  id: 'adapted-story',
  version: 'arg-v1',
  title: 'Adapted Story',
  hook: 'Hook',
  subgenre: 'horror',
  tone: 'grounded',
  location: 'test',
  ageWarnings: [],
  durationDays: 28,
  weeklyStructure: [
    {
      week: 1,
      label: 'Discovery',
      dayRange: [1, 7],
      objective: 'Open investigation'
    }
  ],
  threads: [
    {
      id: 'thread.main',
      type: 'main',
      title: 'Main',
      premise: 'Premise',
      objective: 'Objective',
      anchorClues: ['clue-a']
    }
  ],
  progressionFlags: []
};

const days: ArgDayPackage[] = [
  {
    id: 'day_01',
    storyId: 'adapted-story',
    day: 1,
    week: 1,
    phase: 'DISCOVERY',
    phaseLabel: 'Discovery',
    headline: 'Day 01',
    unlockConditions: {
      requiredCompletedDays: [],
      requiredFlags: [],
      requiredInteractions: [],
      minHoursSincePrevious: 10,
      branchConditions: []
    },
    narrativeProgression: {
      summary: 'Summary one',
      beatAnchorId: 'beat-1',
      beatAnchorTitle: 'Beat 1',
      beatNarrative: 'Narrative one',
      threatEscalation: 'low',
      playerInvolvementShift: 'observer'
    },
    threadUpdates: [],
    evidenceDrops: [
      {
        id: 'artifact-1',
        title: 'Artifact 1',
        type: 'police_report',
        threadId: 'thread.main',
        sourceNpcId: 'npc.detective',
        misleading: false,
        reliabilityScore: 0.8,
        summary: 'Evidence summary'
      }
    ],
    interactions: [
      {
        id: 'interaction-1',
        actorId: 'npc.detective',
        role: 'detective',
        channel: 'SMS',
        mode: 'message',
        messageTemplate: 'Hello {{player_alias}}',
        expectedPlayerActions: ['ask_followup', 'acknowledge']
      }
    ],
    puzzle: null,
    distraction: null,
    awarenessMoments: [],
    progressionEffectsOnCompletion: {
      setFlags: ['flag.day_01.complete'],
      setDecisionPlaceholders: ['decision.day_01.primary'],
      unlockNextAfterHours: 12
    }
  },
  {
    id: 'day_02',
    storyId: 'adapted-story',
    day: 2,
    week: 1,
    phase: 'DISCOVERY',
    phaseLabel: 'Discovery',
    headline: 'Day 02',
    unlockConditions: {
      requiredCompletedDays: [1],
      requiredFlags: ['flag.day_01.complete'],
      requiredInteractions: ['interaction-1'],
      minHoursSincePrevious: 12,
      branchConditions: []
    },
    narrativeProgression: {
      summary: 'Summary two',
      beatAnchorId: 'beat-2',
      beatAnchorTitle: 'Beat 2',
      beatNarrative: 'Narrative two',
      threatEscalation: 'low',
      playerInvolvementShift: 'observer'
    },
    threadUpdates: [],
    evidenceDrops: [],
    interactions: [],
    puzzle: null,
    distraction: null,
    awarenessMoments: [],
    progressionEffectsOnCompletion: {
      setFlags: ['flag.day_02.complete'],
      setDecisionPlaceholders: ['decision.day_02.primary'],
      unlockNextAfterHours: 12
    }
  }
];

const npcs: ArgNpcProfile[] = [
  {
    id: 'npc.detective',
    role: 'detective',
    displayName: 'Detective Vale',
    baselineEmotion: 'guarded',
    motivations: ['close case'],
    trustBaseline: 50,
    trustCeiling: 90,
    secrets: [
      {
        id: 's1',
        summary: 'Withheld one report'
      }
    ]
  }
];

describe('arg to drama adapter', () => {
  it('converts campaign/day structure into a playable drama package', () => {
    const adapted = adaptArgToDramaPackage(campaign, days, npcs);
    expect(adapted.id).toBe('adapted-story');
    expect(adapted.beats.length).toBe(2);
    expect(adapted.beats[0]?.responseOptions.length).toBeGreaterThan(0);
    expect(adapted.beats[0]?.incomingMessages[0]?.text).toContain('Operator');
    expect(adapted.investigationBoard.nodes.some((node) => node.id === 'artifact-1')).toBe(true);
  });
});
