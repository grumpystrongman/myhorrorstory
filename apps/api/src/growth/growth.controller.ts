import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { GrowthService } from './growth.service.js';
import type {
  GrowthCampaignSummary,
  GrowthLeadCaptureResponse,
  GrowthLeadRecord,
  GrowthLifecycleEventResponse
} from '@myhorrorstory/contracts';

@Controller('growth')
export class GrowthController {
  constructor(@Inject(GrowthService) private readonly growthService: GrowthService) {}

  @Post('lead-capture')
  async leadCapture(@Body() input: unknown): Promise<GrowthLeadCaptureResponse> {
    return this.growthService.captureLead(input);
  }

  @Post('lifecycle-event')
  async lifecycleEvent(@Body() input: unknown): Promise<GrowthLifecycleEventResponse> {
    return this.growthService.triggerLifecycleEvent(input);
  }

  @Get('leads')
  listLeads(): GrowthLeadRecord[] {
    return this.growthService.listLeads();
  }

  @Get('campaigns')
  listCampaigns(): GrowthCampaignSummary[] {
    return this.growthService.listCampaigns();
  }
}
