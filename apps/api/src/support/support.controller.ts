import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { SupportService } from './support.service.js';
import { type SupportTicket } from './support.service.js';

@Controller('support')
export class SupportController {
  constructor(@Inject(SupportService) private readonly supportService: SupportService) {}

  @Post('tickets')
  create(
    @Body() input: { email: string; subject: string; message: string }
  ): SupportTicket {
    return this.supportService.create(input);
  }

  @Get('tickets')
  list(): SupportTicket[] {
    return this.supportService.list();
  }
}
