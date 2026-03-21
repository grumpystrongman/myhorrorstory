import { describe, expect, it } from 'vitest';
import {
  completeArgDay,
  computeAvailableDays,
  createInitialArgSession,
  findDayByNumber,
  type ArgCampaignManifest,
  type ArgDayPackage
} from './arg-campaign';

const campaign: ArgCampaignManifest = {
  id: 'sample-arg',
  version: 'arg-v1',
  title: 'Sample ARG',
  hook: 'Sample hook',
  subgenre: 'psychological horror',
  tone: 'grounded',
  location: 'sample location',
  ageWarnings: [],
  durationDays: 28,
  weeklyStructure: [
    {
      week: 1,
      label: 'Discovery',
      dayRange: [1, 7],
      objective: 'Open the case'
    }
  ],
  threads: [],
  progressionFlags: ['flag.case_opened']
};

const day1: ArgDayPackage = {
  id: 'day_01',
  storyId: 'sample-arg',
  day: 1,
  week: 1,
  phase: 'DISCOVERY',
  phaseLabel: 'Discovery',
  headline: 'Day 01',
  unlockConditions: {
    requiredCompletedDays: [],
    requiredFlags: [],
    requiredInteractions: [],
    minHoursSincePrevious: 0,
    branchConditions: []
  },
  narrativeProgression: {
    summary: 'Start',
    beatAnchorId: 'b1',
    beatAnchorTitle: 'Beat 1',
    beatNarrative: 'Narrative',
    threatEscalation: 'low',
    playerInvolvementShift: 'observer'
  },
  threadUpdates: [],
  evidenceDrops: [],
  interactions: [
    {
      id: 'day-01-detective-brief',
      actorId: 'npc.detective',
      role: 'detective',
      channel: 'SMS',
      mode: 'message',
      messageTemplate: 'Hello',
      expectedPlayerActions: ['acknowledge']
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
};

const day2: ArgDayPackage = {
  ...day1,
  id: 'day_02',
  day: 2,
  headline: 'Day 02',
  unlockConditions: {
    requiredCompletedDays: [1],
    requiredFlags: ['flag.day_01.complete'],
    requiredInteractions: ['day-01-detective-brief'],
    minHoursSincePrevious: 12,
    branchConditions: []
  },
  progressionEffectsOnCompletion: {
    setFlags: ['flag.day_02.complete'],
    setDecisionPlaceholders: ['decision.day_02.primary'],
    unlockNextAfterHours: 12
  }
};

describe('arg-campaign runtime helpers', () => {
  it('starts with day 1 available', () => {
    const session = createInitialArgSession(campaign);
    const available = computeAvailableDays([day1, day2], session);
    expect(available).toEqual([1]);
  });

  it('unlocks next day after completion requirements are met', () => {
    const session = createInitialArgSession(campaign);
    const next = completeArgDay(campaign, [day1, day2], session, {
      day: day1,
      primaryDecision: 'acknowledge',
      completedInteractionIds: ['day-01-detective-brief'],
      elapsedHours: 14
    });

    expect(next.completedDays).toContain(1);
    expect(next.flags['flag.day_01.complete']).toBe(true);
    expect(next.availableDays).toContain(2);
    expect(next.decisions['decision.day_01.primary']).toBe('acknowledge');
  });

  it('finds day package by numeric day', () => {
    expect(findDayByNumber([day1, day2], 2)?.id).toBe('day_02');
    expect(findDayByNumber([day1, day2], 3)).toBeUndefined();
  });
});
