import { describe, expect, it } from 'vitest';
import {
  applyResponseChoice,
  beatById,
  createInitialSessionState,
  resolveSessionEnding,
  sortMessagesForFeed,
  type DramaPackage
} from './play-session';

const samplePackage: DramaPackage = {
  id: 'sample',
  title: 'Sample',
  version: 'v1',
  hook: 'hook',
  tone: 'CINEMATIC',
  subgenre: 'test',
  location: 'test',
  warnings: [],
  channels: ['SMS'],
  villain: {
    id: 'villain',
    displayName: 'Villain',
    archetype: 'CALM_GENIUS_MANIPULATOR',
    worldview: 'worldview',
    motive: 'motive'
  },
  arcs: [],
  beats: [
    {
      id: 'beat-1',
      actId: 'act-1',
      actTitle: 'Act',
      title: 'Beat 1',
      narrative: 'n1',
      stage: 1,
      unlockAfterSeconds: 0,
      revealClueIds: ['c1'],
      incomingMessages: [
        {
          id: 'm2',
          senderName: 'A',
          role: 'investigator',
          channel: 'SMS',
          text: 'later',
          delaySeconds: 3,
          intensity: 20
        },
        {
          id: 'm1',
          senderName: 'B',
          role: 'witness',
          channel: 'SMS',
          text: 'first',
          delaySeconds: 1,
          intensity: 30
        }
      ],
      responseOptions: [
        {
          id: 'o1',
          label: 'Move',
          intent: 'CURIOSITY',
          summary: 'sum',
          nextBeatId: 'beat-2',
          progressDelta: 18,
          reputationDelta: {
            trustworthiness: 2,
            aggression: 0,
            curiosity: 5,
            deception: 0,
            morality: 1
          },
          flagUpdates: {
            k: true
          }
        }
      ],
      defaultNextBeatId: 'beat-2',
      backgroundVisual: '/visuals/stories/sample.svg'
    },
    {
      id: 'beat-2',
      actId: 'act-1',
      actTitle: 'Act',
      title: 'Beat 2',
      narrative: 'n2',
      stage: 4,
      unlockAfterSeconds: 0,
      revealClueIds: ['c2'],
      incomingMessages: [],
      responseOptions: [],
      defaultNextBeatId: null,
      backgroundVisual: '/visuals/stories/sample.svg'
    }
  ],
  endings: [
    {
      id: 'ending-justice',
      title: 'Justice',
      type: 'JUSTICE',
      summary: 'justice',
      epilogue: 'ep',
      sequelHook: 'hook'
    },
    {
      id: 'ending-corruption',
      title: 'Corruption',
      type: 'CORRUPTION',
      summary: 'corr',
      epilogue: 'ep',
      sequelHook: 'hook'
    },
    {
      id: 'ending-unresolved',
      title: 'Unresolved',
      type: 'UNRESOLVED',
      summary: 'un',
      epilogue: 'ep',
      sequelHook: 'hook'
    }
  ],
  investigationBoard: {
    nodes: [],
    links: [],
    timeline: []
  },
  replayHooks: [],
  sequelHooks: [],
  branchingMoments: []
};

describe('play session runtime', () => {
  it('applies response effects and advances beat', () => {
    const initial = createInitialSessionState(samplePackage);
    const beat = beatById(samplePackage, initial.currentBeatId);
    expect(beat).toBeDefined();
    if (!beat) {
      return;
    }

    const result = applyResponseChoice(samplePackage, initial, beat, beat.responseOptions[0]!);
    expect(result.nextBeatId).toBe('beat-2');
    expect(result.nextState.flags.k).toBe(true);
    expect(result.nextState.reputation.curiosity).toBe(5);
    expect(result.nextState.discoveredClues).toContain('c1');
  });

  it('resolves ending by reputation and progress', () => {
    const justice = resolveSessionEnding(samplePackage, {
      ...createInitialSessionState(samplePackage),
      complete: true,
      investigationProgress: 90,
      reputation: {
        trustworthiness: 9,
        aggression: 0,
        curiosity: 8,
        deception: 0,
        morality: 22
      }
    });
    expect(justice.type).toBe('JUSTICE');

    const corruption = resolveSessionEnding(samplePackage, {
      ...createInitialSessionState(samplePackage),
      complete: true,
      investigationProgress: 88,
      reputation: {
        trustworthiness: -8,
        aggression: 11,
        curiosity: 4,
        deception: 33,
        morality: -20
      }
    });
    expect(corruption.type).toBe('CORRUPTION');

    const unresolved = resolveSessionEnding(samplePackage, {
      ...createInitialSessionState(samplePackage),
      complete: true,
      investigationProgress: 92,
      reputation: {
        trustworthiness: 18,
        aggression: 10,
        curiosity: 9,
        deception: 12,
        morality: 6
      }
    });
    expect(unresolved.type).toBe('UNRESOLVED');
  });

  it('sorts messages by delay for feed ordering', () => {
    const beat = samplePackage.beats[0]!;
    const sorted = sortMessagesForFeed(beat.incomingMessages);
    expect(sorted.map((item) => item.id)).toEqual(['m1', 'm2']);
  });
});
