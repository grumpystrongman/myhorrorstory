import { describe, expect, it } from 'vitest';
import { generateStoryHint } from './hint-assistant';

describe('hint assistant', () => {
  it('returns structured fallback hint when model is unavailable', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';
    try {
      const hint = await generateStoryHint({
      level: 'solve',
      story: {
        id: 'static-between-stations',
        title: 'Static Between Stations',
        hook: 'A dead rail line starts broadcasting confessions in your voice.',
        tone: 'CINEMATIC',
        location: 'Northline rail corridor'
      },
      beat: {
        id: 'day_01',
        title: 'First Breach',
        stage: 1,
        narrative: 'The first signal leak arrives with a forged confession trace.',
        revealClueIds: ['static-between-stations-d01-police-report'],
        responseOptions: [
          {
            id: 'choice-1',
            label: 'Stabilize witnesses',
            summary: 'Protect people and lock evidence chain.',
            intent: 'CURIOSITY',
            progressDelta: 4,
            reputationDelta: {
              trustworthiness: 3,
              aggression: -1,
              curiosity: 2,
              deception: 0,
              morality: 2
            }
          },
          {
            id: 'choice-2',
            label: 'Force audit',
            summary: 'Push hard to expose tampering.',
            intent: 'ACCUSATION',
            progressDelta: 3,
            reputationDelta: {
              trustworthiness: -1,
              aggression: 3,
              curiosity: 1,
              deception: 0,
              morality: -1
            }
          }
        ],
        incomingMessages: [
          {
            senderName: 'Mara Quinn',
            channel: 'SIGNAL',
            role: 'operator',
            text: 'Chain-of-custody first.'
          }
        ]
      },
      mission: {
        objective: 'Preserve evidence and identify the Curator.',
        primaryQuestion: 'Who manipulated the confession relay?',
        operationWindow: 'First 48 hours are critical.'
      },
      campaign: {
        day: 3,
        targetDays: 28,
        maxDays: 45
      },
      player: {
        progress: 18,
        hintUses: 0,
        villainAdvantage: 0,
        reputation: {
          trustworthiness: 1,
          aggression: 0,
          curiosity: 1,
          deception: 0,
          morality: 1
        }
      },
      objectives: [
        {
          label: 'Resolve opening contradiction',
          complete: false
        }
      ],
      answerKeys: {
        audioCipherCode: '440',
        puzzleSolution: 'ORIGIN',
        recommendedOptionId: 'choice-1',
        recommendedOptionLabel: 'Stabilize witnesses'
      }
    });

      expect(hint.level).toBe('solve');
      expect(hint.source).toBe('fallback');
      expect(hint.headline.length).toBeGreaterThan(10);
      expect(hint.howToThink.length).toBeGreaterThan(10);
      expect(hint.howToApproach.length).toBeGreaterThan(10);
      expect(hint.howToSolve.length).toBeGreaterThan(10);
      expect(hint.directAnswer).toContain('Audio cipher code: 440');
      expect(hint.directAnswer).toContain('Puzzle keyword: ORIGIN');
      expect(hint.penalty.severity).toBe('high');
      expect(hint.penalty.usageCount).toBe(1);
      expect(hint.penalty.advantageGain).toBeGreaterThan(0);
    } finally {
      if (originalApiKey) {
        process.env.OPENAI_API_KEY = originalApiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it('escalates hint penalty with repeated usage', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';
    try {
      const baseline = await generateStoryHint({
        level: 'thinking',
        story: {
          id: 'baseline-story',
          title: 'Baseline Story',
          hook: 'Hook',
          tone: 'CINEMATIC',
          location: 'Station'
        },
        beat: {
          id: 'beat-1',
          title: 'Beat 1',
          stage: 1,
          narrative: 'Narrative',
          revealClueIds: [],
          responseOptions: [],
          incomingMessages: []
        },
        mission: {
          objective: 'Objective',
          primaryQuestion: 'Question',
          operationWindow: 'Window'
        },
        campaign: {
          day: 1,
          targetDays: 28,
          maxDays: 45
        },
        player: {
          progress: 10,
          hintUses: 0,
          villainAdvantage: 0,
          reputation: {
            trustworthiness: 0,
            aggression: 0,
            curiosity: 0,
            deception: 0,
            morality: 0
          }
        },
        objectives: []
      });

      const repeated = await generateStoryHint({
        level: 'thinking',
        story: {
          id: 'repeat-story',
          title: 'Repeat Story',
          hook: 'Hook',
          tone: 'CINEMATIC',
          location: 'Station'
        },
        beat: {
          id: 'beat-2',
          title: 'Beat 2',
          stage: 1,
          narrative: 'Narrative',
          revealClueIds: [],
          responseOptions: [],
          incomingMessages: []
        },
        mission: {
          objective: 'Objective',
          primaryQuestion: 'Question',
          operationWindow: 'Window'
        },
        campaign: {
          day: 1,
          targetDays: 28,
          maxDays: 45
        },
        player: {
          progress: 10,
          hintUses: 4,
          villainAdvantage: 0,
          reputation: {
            trustworthiness: 0,
            aggression: 0,
            curiosity: 0,
            deception: 0,
            morality: 0
          }
        },
        objectives: []
      });

      expect(repeated.penalty.usageCount).toBe(5);
      expect(repeated.penalty.severity).toBe('high');
      expect(repeated.penalty.advantageGain).toBeGreaterThan(baseline.penalty.advantageGain);
      expect(repeated.penalty.dangerGain).toBeGreaterThanOrEqual(baseline.penalty.dangerGain);
      expect(repeated.penalty.villainGain).toBeGreaterThanOrEqual(baseline.penalty.villainGain);
    } finally {
      if (originalApiKey) {
        process.env.OPENAI_API_KEY = originalApiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});
