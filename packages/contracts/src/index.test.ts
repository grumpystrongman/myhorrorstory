import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  nextNarrativeEventRequestSchema,
  nextNarrativeEventResponseSchema,
  signUpSchema,
  storyVoiceCastingSchema,
  triggerConditionSchema,
  storyPackageSchema
} from './index';

const currentDir = dirname(fileURLToPath(import.meta.url));
const storiesDir = join(currentDir, '../../../docs/stories');

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

  it('validates nested trigger condition DSL', () => {
    const condition = triggerConditionSchema.parse({
      kind: 'all',
      conditions: [
        {
          kind: 'predicate',
          predicate: {
            source: 'PLAYER_REPUTATION',
            key: 'morality',
            operator: 'GTE',
            value: 15
          }
        },
        {
          kind: 'any',
          conditions: [
            {
              kind: 'predicate',
              predicate: {
                source: 'HAS_CLUE',
                key: 'clue-final-ledger-page',
                operator: 'EQ',
                value: true
              }
            },
            {
              kind: 'predicate',
              predicate: {
                source: 'INVESTIGATION_PROGRESS',
                key: 'percent',
                operator: 'GTE',
                value: 85
              }
            }
          ]
        }
      ]
    });

    expect(condition.kind).toBe('all');
  });

  it('validates all launch story packages against the canonical schema', () => {
    const files = readdirSync(storiesDir).filter((file) => file.endsWith('.story.json'));
    expect(files.length).toBeGreaterThanOrEqual(10);

    for (const file of files) {
      const raw = readFileSync(join(storiesDir, file), 'utf8');
      const parsed = storyPackageSchema.parse(JSON.parse(raw));
      expect(parsed.id.length).toBeGreaterThan(0);
      expect(parsed.endingVariants.length).toBeGreaterThanOrEqual(3);
      expect(parsed.arcMap.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('validates next narrative event contracts', () => {
    const request = nextNarrativeEventRequestSchema.parse({
      caseId: 'static-between-stations',
      playerId: 'player-42',
      nowAt: new Date().toISOString(),
      behavior: {
        cluesDiscovered: ['clue-origin'],
        suspectsAccused: ['station-master'],
        alliances: ['The Archivist'],
        communicationTone: 'SKEPTICAL',
        moralDecisionTrend: 12,
        responseDelaySeconds: 90,
        investigativeSkill: 68,
        curiosity: 83,
        riskTaking: 44
      },
      runtime: {
        villainStage: 2,
        investigationProgress: 46,
        reputation: {
          trustworthiness: 8,
          aggression: -10,
          curiosity: 28,
          deception: 5,
          morality: 12
        },
        npcTrust: {
          archivist: 74
        },
        unresolvedClues: ['clue-ledger', 'clue-spectrogram'],
        flags: {
          countdown_active: false
        }
      },
      context: {
        storyMood: 'EERIE',
        sceneType: 'SURVEILLANCE_REVIEW',
        villainPresence: 59,
        playerTensionLevel: 62,
        dangerLevel: 53,
        location: 'annex-control-room',
        timeOfNightHour: 23,
        enabledChannels: ['SMS', 'WHATSAPP', 'EMAIL', 'WEB_PORTAL']
      },
      safety: {
        intensityLevel: 3,
        threatTone: 'MODERATE',
        realismLevel: 'IMMERSIVE',
        allowLateNightMessaging: false,
        maxTouchesPerHour: 3
      }
    });

    const response = nextNarrativeEventResponseSchema.parse({
      caseId: request.caseId,
      playerId: request.playerId,
      nextVillainStage: 3,
      stageLabel: 'Active Interference',
      event: {
        id: 'evt.static-between-stations.0001',
        mediaType: 'SURVEILLANCE_FOOTAGE',
        mediaDescription:
          'A station corridor feed glitches for six seconds and a shadow appears where no person should be.',
        aiGenerationPrompt:
          'Generate grainy monochrome surveillance footage of an abandoned station corridor at 23:00 with flickering lights and one delayed human shadow.',
        narrativePurpose:
          'Escalate villain presence while giving a trackable timestamp anomaly for timeline reconstruction.',
        hiddenClues: [
          {
            id: 'clue.timestamp-shift',
            clueType: 'TIMESTAMP',
            summary: 'Feed clock jumps back exactly 13 minutes.',
            extractionHint: 'Freeze frame at 00:04 and compare top-right clock.',
            confidence: 0.86
          }
        ],
        deliveryMethod: {
          channel: 'WHATSAPP',
          route: 'ATTACHMENT_DROP',
          urgency: 'HIGH',
          pacingTag: 'DELAYED',
          scheduleAt: new Date().toISOString(),
          rationale: 'High-open-rate channel for urgent media review.'
        },
        possiblePlayerResponses: [
          {
            id: 'resp.review',
            intent: 'CURIOSITY',
            summary: 'Ask for source metadata and original capture logs.',
            sampleReply: 'Send me the raw file, not a re-encode.'
          },
          {
            id: 'resp.accuse',
            intent: 'ACCUSATION',
            summary: 'Accuse the known suspect of fabricating the clip.',
            sampleReply: 'This is staged and you know it.'
          }
        ],
        storyConsequences: [
          {
            id: 'cons.review',
            whenResponseId: 'resp.review',
            outcome: 'Metadata unlocks a hidden relay location.',
            triggeredEvents: ['relay.location.uncovered'],
            reputationDelta: {
              curiosity: 10
            },
            npcTrustDelta: [
              {
                npcId: 'archivist',
                delta: 6
              }
            ],
            villainReaction: 'Switches to encrypted document drops.',
            endingImpact: 'OPENS_SECRET_PATH'
          },
          {
            id: 'cons.accuse',
            whenResponseId: 'resp.accuse',
            outcome: 'The suspect goes silent and evidence chain weakens.',
            triggeredEvents: ['suspect.went.dark'],
            reputationDelta: {
              aggression: 8,
              trustworthiness: -6
            },
            npcTrustDelta: [
              {
                npcId: 'archivist',
                delta: -8
              }
            ],
            villainReaction: 'Begins direct taunts within minutes.',
            endingImpact: 'LOCKS_ENDING'
          }
        ],
        villainStage: 3,
        tensionLevel: 79,
        trustDisruptionPressure: 66,
        generatedAt: new Date().toISOString()
      }
    });

    expect(response.nextVillainStage).toBe(3);
    expect(response.event.possiblePlayerResponses.length).toBeGreaterThanOrEqual(2);
    expect(response.event.storyConsequences.length).toBeGreaterThanOrEqual(2);
  });
});
