import { BadRequestException, Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { SupportService } from './support.service.js';
import { type SupportChatResponse, type SupportTicket } from './support.service.js';
import { supportChatInputSchema, type SupportChatInput } from './support.schemas.js';

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

  @Post('chat')
  async chat(
    @Body() body: unknown
  ): Promise<SupportChatResponse> {
    const parsed = supportChatInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.supportService.chat(parsed.data as SupportChatInput);
  }
}
