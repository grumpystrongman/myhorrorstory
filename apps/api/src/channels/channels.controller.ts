import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Post, Query } from '@nestjs/common';
import {
  getUserChannelsQuerySchema,
  sendChannelMessageSchema,
  sendSetupTestSchema,
  setupUserChannelsSchema,
  type GetUserChannelsQuery,
  type SendChannelMessageInput,
  type SendSetupTestInput,
  type SetupUserChannelsInput
} from './channels.schemas.js';
import { ChannelsService } from './channels.service.js';

@Controller('channels')
export class ChannelsController {
  constructor(@Inject(ChannelsService) private readonly channelsService: ChannelsService) {}

  @Get('setup')
  getSetupStatus(
    @Query('publicBaseUrl') publicBaseUrl?: string
  ): ReturnType<ChannelsService['getSetupStatus']> {
    return this.channelsService.getSetupStatus(publicBaseUrl);
  }

  @Get('setup/user')
  getUserChannels(
    @Query() query: unknown
  ): ReturnType<ChannelsService['getUserChannels']> {
    const parsed = getUserChannelsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return this.channelsService.getUserChannels(parsed.data as GetUserChannelsQuery);
    } catch (error) {
      if (error instanceof Error && error.message === 'user_channels_not_found') {
        throw new NotFoundException('No channel setup found for player/case.');
      }
      throw error;
    }
  }

  @Post('setup/user')
  upsertUserChannels(
    @Body() body: unknown
  ): ReturnType<ChannelsService['upsertUserChannels']> {
    const parsed = setupUserChannelsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.channelsService.upsertUserChannels(parsed.data as SetupUserChannelsInput);
  }

  @Post('setup/test')
  async sendSetupTest(
    @Body() body: unknown
  ): Promise<Awaited<ReturnType<ChannelsService['sendSetupTest']>>> {
    const parsed = sendSetupTestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return await this.channelsService.sendSetupTest(parsed.data as SendSetupTestInput);
    } catch (error) {
      if (error instanceof Error && error.message === 'user_channels_not_found') {
        throw new NotFoundException('No channel setup found for player/case.');
      }
      if (error instanceof Error && error.message === 'no_opted_in_contacts') {
        throw new BadRequestException('No opted-in channels available for setup test.');
      }
      throw error;
    }
  }

  @Post('send')
  async sendChannelMessage(
    @Body() body: unknown
  ): Promise<Awaited<ReturnType<ChannelsService['sendChannelMessage']>>> {
    const parsed = sendChannelMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return await this.channelsService.sendChannelMessage(parsed.data as SendChannelMessageInput);
    } catch (error) {
      if (error instanceof Error && error.message === 'user_channels_not_found') {
        throw new NotFoundException('No channel setup found for player/case.');
      }
      if (error instanceof Error && error.message === 'no_opted_in_contacts') {
        throw new BadRequestException('No opted-in channels available for delivery.');
      }
      throw error;
    }
  }
}
