import { describe, expect, it } from 'vitest';
import { signUpSchema, storyVoiceCastingSchema } from './index';

describe('contracts', () => {
  it('validates sign up', () => {
    const result = signUpSchema.parse({
      email: 'test@example.com',
      password: '0123456789AB',
      displayName: 'Detective',
      marketingConsent: true,
      acceptedTerms: true,
      acceptedPrivacy: true,
      ageGateConfirmed: true
    });

    expect(result.email).toBe('test@example.com');
  });

  it('validates story voice casting manifests', () => {
    const result = storyVoiceCastingSchema.parse({
      storyId: 'static-between-stations',
      revision: 1,
      generatedAt: new Date().toISOString(),
      characters: [
        {
          id: 'voice.static-between-stations.lead-investigator',
          storyId: 'static-between-stations',
          characterId: 'Lead Investigator',
          displayName: 'Lead Investigator',
          region: 'north_atlantic_us',
          locale: 'en-US',
          sex: 'FEMALE',
          archetype: 'INVESTIGATOR',
          cadence: 'Measured',
          vocabularyTone: 'Procedural',
          emotionalRange: 'Composed',
          defaultEmotion: 'CALM',
          expressions: {
            CALM: {
              rate: 0.95,
              pitch: 0,
              stability: 0.9,
              style: 0.3,
              gainDb: 0
            }
          },
          variation: {
            rateJitter: 0.05,
            pitchJitter: 0.5,
            styleJitter: 0.08
          },
          providerPreferences: [
            {
              provider: 'PIPER',
              voiceId: 'piper-static-between-stations-lead-investigator',
              model: 'en_US-lessac-high',
              speaker: 3
            }
          ]
        }
      ]
    });

    expect(result.storyId).toBe('static-between-stations');
  });
});
