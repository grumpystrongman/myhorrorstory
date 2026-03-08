import { describe, expect, it } from 'vitest';
import { getUnlockedBeats } from './index';
import type { StoryPackage } from '@myhorrorstory/contracts';

const story: StoryPackage = {
  id: 'case-1',
  version: 'v1',
  title: 'Case',
  hook: 'Hook',
  subgenre: 'psychological horror',
  tone: 'CINEMATIC',
  targetSessionMinutes: 90,
  soloSuitability: 5,
  partySuitability: 5,
  ageWarnings: ['violence'],
  characters: ['A'],
  location: 'Mansion',
  replayHooks: ['alt ending'],
  sequelHooks: ['new cult'],
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
  ]
};

describe('story engine', () => {
  it('returns unlocked beats', () => {
    const beats = getUnlockedBeats(story, {
      flags: {},
      clues: new Set<string>(),
      score: 0
    });

    expect(beats).toHaveLength(1);
  });
});
