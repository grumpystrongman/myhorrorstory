import { Injectable } from '@nestjs/common';
import {
  evaluateTriggersResponseSchema,
  nextNarrativeEventResponseSchema,
  processInboundMessageResponseSchema,
  type EvaluateTriggersRequest,
  type EvaluateTriggersResponse,
  type InvestigationBoard,
  type InvestigationBoardUpsert,
  type NextNarrativeEventRequest,
  type NextNarrativeEventResponse,
  type PlayerIntent,
  type ProcessInboundMessageRequest,
  type ProcessInboundMessageResponse
} from '@myhorrorstory/contracts';
import {
  NarrativeDirectorEngine,
  createInitialRuntimeState,
  evaluateAndApplyRules
} from '@myhorrorstory/story-engine';
import { storyPackages } from '../common/story-packages.js';

@Injectable()
export class RuntimeService {
  private readonly boardStore = new Map<string, InvestigationBoard>();
  private readonly narrativeDirector = new NarrativeDirectorEngine();

  processInboundMessage(input: ProcessInboundMessageRequest): ProcessInboundMessageResponse {
    this.ensureStoryExists(input.event.caseId);

    const recognizedIntent = input.event.inferredIntent ?? this.inferIntent(input.event.message);
    const appliedRuleIds: string[] = [];
    const generatedEvents: string[] = [];

    if (recognizedIntent === 'ACCUSATION') {
      appliedRuleIds.push('runtime-detected-accusation');
      generatedEvents.push('player.accusation.detected');
    }

    if (recognizedIntent === 'THREAT') {
      appliedRuleIds.push('runtime-detected-aggression');
      generatedEvents.push('player.aggression.detected');
    }

    if (recognizedIntent === 'SILENCE') {
      appliedRuleIds.push('runtime-detected-silence');
      generatedEvents.push('player.silence.detected');
    }

    return processInboundMessageResponseSchema.parse({
      accepted: true,
      recognizedIntent,
      appliedRuleIds,
      generatedEvents,
      outgoingMessageCount: 0
    });
  }

  evaluateRules(input: EvaluateTriggersRequest): EvaluateTriggersResponse {
    const story = this.ensureStoryExists(input.caseId);

    const runtimeState = createInitialRuntimeState({
      flags: input.state.flags,
      reputation: input.state.reputation,
      npcTrust: input.state.npcTrust,
      clues: input.state.clues,
      events: input.state.events,
      investigationProgress: input.state.investigationProgress,
      villainStage: input.state.villainStage as 1 | 2 | 3 | 4,
      silenceSeconds: input.state.silenceSeconds,
      elapsedSeconds: input.state.elapsedSeconds,
      lastIntent: input.state.lastIntent
    });

    const result = evaluateAndApplyRules(story.triggerRules, runtimeState, {
      eventType: input.eventType
    });

    return evaluateTriggersResponseSchema.parse({
      triggeredRuleIds: result.triggeredRuleIds,
      actions: result.actions,
      stateDelta: {
        flags: result.nextState.flags,
        clues: [...result.nextState.clues],
        events: [...result.nextState.events],
        villainStage: result.nextState.villainStage,
        unlockedEndings: [...result.nextState.unlockedEndings],
        lockedEndings: [...result.nextState.lockedEndings]
      }
    });
  }

  upsertInvestigationBoard(input: InvestigationBoardUpsert): { updated: true; revisionKey: string } {
    const revisionKey = `${input.caseId}:${input.playerId}`;
    this.boardStore.set(revisionKey, input.board);
    return {
      updated: true,
      revisionKey
    };
  }

  nextNarrativeEvent(input: NextNarrativeEventRequest): NextNarrativeEventResponse {
    const story = this.ensureStoryExists(input.caseId);
    const event = this.narrativeDirector.generateNextEvent(story, input);
    return nextNarrativeEventResponseSchema.parse(event);
  }

  private inferIntent(message: string): PlayerIntent {
    const normalized = message.toLowerCase();

    if (normalized.includes('accuse') || normalized.includes('culprit')) {
      return 'ACCUSATION';
    }

    if (normalized.includes('help') || normalized.includes('how')) {
      return 'QUESTION';
    }

    if (normalized.includes('deal') || normalized.includes('trade')) {
      return 'BARGAIN';
    }

    if (normalized.includes('threat') || normalized.includes('or else')) {
      return 'THREAT';
    }

    if (normalized.includes('lie') || normalized.includes('fake')) {
      return 'DECEPTION';
    }

    return 'CURIOSITY';
  }

  private ensureStoryExists(caseId: string) {
    const story = storyPackages.find((item) => item.id === caseId);
    if (!story) {
      throw new Error('story_not_found');
    }

    return story;
  }
}
