import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Put
} from '@nestjs/common';
import {
  evaluateTriggersRequestSchema,
  investigationBoardUpsertSchema,
  nextNarrativeEventRequestSchema,
  processInboundMessageRequestSchema,
  type EvaluateTriggersResponse,
  type NextNarrativeEventResponse,
  type ProcessInboundMessageResponse
} from '@myhorrorstory/contracts';
import { RuntimeService } from './runtime.service.js';

@Controller()
export class RuntimeController {
  constructor(@Inject(RuntimeService) private readonly runtimeService: RuntimeService) {}

  @Post('channels/inbound')
  processInboundMessage(@Body() body: unknown): ProcessInboundMessageResponse {
    const parsed = processInboundMessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return this.runtimeService.processInboundMessage(parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message === 'story_not_found') {
        throw new NotFoundException('Story not found');
      }
      throw error;
    }
  }

  @Post('story-rules/evaluate')
  @HttpCode(200)
  evaluateRules(@Body() body: unknown): EvaluateTriggersResponse {
    const parsed = evaluateTriggersRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return this.runtimeService.evaluateRules(parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message === 'story_not_found') {
        throw new NotFoundException('Story not found');
      }
      throw error;
    }
  }

  @Put('investigation/board')
  upsertInvestigationBoard(@Body() body: unknown): { updated: true; revisionKey: string } {
    const parsed = investigationBoardUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.runtimeService.upsertInvestigationBoard(parsed.data);
  }

  @Post('narrative/events/next')
  @HttpCode(200)
  nextNarrativeEvent(@Body() body: unknown): NextNarrativeEventResponse {
    const parsed = nextNarrativeEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return this.runtimeService.nextNarrativeEvent(parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message === 'story_not_found') {
        throw new NotFoundException('Story not found');
      }
      throw error;
    }
  }
}
