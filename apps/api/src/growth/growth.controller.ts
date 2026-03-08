import { Body, Controller, Inject, Post } from '@nestjs/common';
import { GrowthService } from './growth.service.js';

@Controller('growth')
export class GrowthController {
  constructor(@Inject(GrowthService) private readonly growthService: GrowthService) {}

  @Post('lead-capture')
  async leadCapture(@Body() input: { email: string; source: string }): Promise<{
    accepted: boolean;
    segment: string;
  }> {
    return this.growthService.captureLead(input);
  }
}
