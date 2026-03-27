import { describe, expect, it } from 'vitest';
import type { DramaPackage, SessionState } from './play-session';
import { resolveSessionEnding } from './play-session';

const pack: DramaPackage = {
  id: 'qa-ending-pack',
  title: 'QA Ending Pack',
  version: 'test',
  hook: 'test',
  tone: 'test',
  subgenre: 'test',
  location: 'test',
  warnings: [],
  channels: ['SMS'],
  villain: {
    id: 'villain',
    displayName: 'Villain',
    archetype: 'manipulator',
    worldview: 'test',
    motive: 'test'
  },
  arcs: [],
  beats: [],
  endings: [
    { id: 'justice', type: 'JUSTICE', title: 'Justice', summary: '', epilogue: '', sequelHook: '' },
    { id: 'pyrrhic', type: 'PYRRHIC', title: 'Pyrrhic', summary: '', epilogue: '', sequelHook: '' },
    { id: 'tragic', type: 'TRAGIC', title: 'Tragic', summary: '', epilogue: '', sequelHook: '' },
    { id: 'corruption', type: 'CORRUPTION', title: 'Corruption', summary: '', epilogue: '', sequelHook: '' },
    { id: 'unresolved', type: 'UNRESOLVED', title: 'Unresolved', summary: '', epilogue: '', sequelHook: '' }
  ],
  investigationBoard: { nodes: [], links: [], timeline: [] },
  replayHooks: [],
  sequelHooks: [],
  branchingMoments: []
};

function state(overrides: Partial<SessionState>): SessionState {
  return {
    currentBeatId: 'beat',
    visitedBeatIds: ['beat'],
    discoveredClues: [],
    reputation: {
      trustworthiness: 0,
      aggression: 0,
      curiosity: 0,
      deception: 0,
      morality: 0
    },
    flags: {},
    investigationProgress: 80,
    selectedResponses: [],
    complete: true,
    ...overrides
  };
}

describe('resolveSessionEnding', () => {
  it('returns JUSTICE for high morality + trust + progress', () => {
    const ending = resolveSessionEnding(
      pack,
      state({
        reputation: { trustworthiness: 7, aggression: 2, curiosity: 4, deception: 3, morality: 18 },
        investigationProgress: 90
      })
    );
    expect(ending.type).toBe('JUSTICE');
  });

  it('returns TRAGIC for extreme aggression profile', () => {
    const ending = resolveSessionEnding(
      pack,
      state({
        reputation: { trustworthiness: -9, aggression: 33, curiosity: 2, deception: 8, morality: -12 },
        investigationProgress: 72
      })
    );
    expect(ending.type).toBe('TRAGIC');
  });

  it('returns CORRUPTION for trust collapse + deception spike', () => {
    const ending = resolveSessionEnding(
      pack,
      state({
        reputation: { trustworthiness: -24, aggression: 9, curiosity: 3, deception: 23, morality: -10 },
        investigationProgress: 76
      })
    );
    expect(ending.type).toBe('CORRUPTION');
  });

  it('returns PYRRHIC for costly but controlled completion', () => {
    const ending = resolveSessionEnding(
      pack,
      state({
        reputation: { trustworthiness: -5, aggression: 16, curiosity: 5, deception: 14, morality: -7 },
        investigationProgress: 83
      })
    );
    expect(ending.type).toBe('PYRRHIC');
  });

  it('returns UNRESOLVED for stalled high-progress contradiction band', () => {
    const ending = resolveSessionEnding(
      pack,
      state({
        reputation: { trustworthiness: 4, aggression: 10, curiosity: 5, deception: 11, morality: -3 },
        investigationProgress: 90
      })
    );
    expect(ending.type).toBe('UNRESOLVED');
  });
});
