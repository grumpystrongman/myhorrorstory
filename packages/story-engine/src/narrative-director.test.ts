import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { storyPackageSchema, type NextNarrativeEventRequest } from '@myhorrorstory/contracts';
import { generateNextNarrativeEvent } from './narrative-director.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const story = storyPackageSchema.parse(
  JSON.parse(readFileSync(join(currentDir, '../../../docs/stories/static-between-stations.story.json'), 'utf8'))
);

function makeRequest(overrides?: Partial<NextNarrativeEventRequest>): NextNarrativeEventRequest {
  return {
    caseId: story.id,
    playerId: 'test-player',
    nowAt: '2026-03-08T23:15:00.000Z',
    behavior: {
      cluesDiscovered: [`${story.id}-clue-origin`],
      suspectsAccused: ['The Curator'],
      alliances: ['Morgan Voss'],
      communicationTone: 'SKEPTICAL',
      moralDecisionTrend: 6,
      responseDelaySeconds: 120,
      investigativeSkill: 72,
      curiosity: 84,
      riskTaking: 45
    },
    runtime: {
      villainStage: 2,
      investigationProgress: 58,
      reputation: {
        trustworthiness: 8,
        aggression: 4,
        curiosity: 26,
        deception: 2,
        morality: 10
      },
      npcTrust: {},
      unresolvedClues: [`${story.id}-clue-ledger`],
      flags: {}
    },
    context: {
      storyMood: 'EERIE',
      sceneType: 'SURVEILLANCE_REVIEW',
      villainPresence: 63,
      playerTensionLevel: 60,
      dangerLevel: 55,
      location: 'Central line relay annex',
      timeOfNightHour: 23,
      enabledChannels: ['SMS', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'WEB_PORTAL']
    },
    safety: {
      intensityLevel: 3,
      threatTone: 'MODERATE',
      realismLevel: 'IMMERSIVE',
      allowLateNightMessaging: true,
      maxTouchesPerHour: 3
    },
    ...overrides
  };
}

describe('narrative director', () => {
  it('generates event cards with required narrative outputs', () => {
    const result = generateNextNarrativeEvent(story, makeRequest());

    expect(result.caseId).toBe(story.id);
    expect(result.event.mediaType.length).toBeGreaterThan(0);
    expect(result.event.mediaDescription.length).toBeGreaterThan(20);
    expect(result.event.aiGenerationPrompt).toContain('immersive horror ARG');
    expect(result.event.narrativePurpose.length).toBeGreaterThan(10);
    expect(result.event.hiddenClues.length).toBeGreaterThanOrEqual(1);
    expect(result.event.possiblePlayerResponses.length).toBeGreaterThanOrEqual(2);
    expect(result.event.storyConsequences.length).toBe(result.event.possiblePlayerResponses.length);
  });

  it('caps escalation with low-intensity safety preferences', () => {
    const result = generateNextNarrativeEvent(
      story,
      makeRequest({
        runtime: {
          villainStage: 3,
          investigationProgress: 96,
          reputation: {
            trustworthiness: 0,
            aggression: 12,
            curiosity: 25,
            deception: 8,
            morality: -5
          },
          npcTrust: {},
          unresolvedClues: [],
          flags: {}
        },
        context: {
          storyMood: 'INTENSE',
          sceneType: 'VILLAIN_CONTACT',
          villainPresence: 97,
          playerTensionLevel: 92,
          dangerLevel: 91,
          location: 'Old terminus tunnel',
          timeOfNightHour: 0,
          enabledChannels: ['SMS', 'PHONE_CALL', 'VOICE_MESSAGE']
        },
        safety: {
          intensityLevel: 1,
          threatTone: 'LOW',
          realismLevel: 'STYLIZED',
          allowLateNightMessaging: false,
          maxTouchesPerHour: 1
        }
      })
    );

    expect(result.nextVillainStage).toBeLessThanOrEqual(3);
  });

  it('escalates to direct confrontation near case completion', () => {
    const result = generateNextNarrativeEvent(
      story,
      makeRequest({
        runtime: {
          villainStage: 2,
          investigationProgress: 88,
          reputation: {
            trustworthiness: -6,
            aggression: 18,
            curiosity: 30,
            deception: 12,
            morality: -8
          },
          npcTrust: {},
          unresolvedClues: [],
          flags: {}
        },
        context: {
          storyMood: 'INTENSE',
          sceneType: 'VILLAIN_CONTACT',
          villainPresence: 92,
          playerTensionLevel: 89,
          dangerLevel: 85,
          location: 'Derelict dispatch hall',
          timeOfNightHour: 1,
          enabledChannels: ['SMS', 'PHONE_CALL', 'WHATSAPP', 'VOICE_MESSAGE']
        }
      })
    );

    expect(result.nextVillainStage).toBe(4);
    expect(result.stageLabel).toBe('Personal Confrontation');
    expect(result.event.tensionLevel).toBeGreaterThanOrEqual(75);
  });
});
