import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { ChannelsService } from '../channels/channels.service.js';
import { GrowthService } from '../growth/growth.service.js';
import { AdminSettingsService, type AdminSettingRecord } from './admin-settings.service.js';
import {
  adminChannelBroadcastSchema,
  adminCustomEmailCampaignSendSchema,
  adminCreateCampaignSchema,
  adminCreateUserSchema,
  adminEmailCampaignSendSchema,
  adminSettingUpsertSchema,
  adminUpdateCampaignSchema,
  adminUpdateUserSchema
} from './admin.schemas.js';

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(GrowthService) private readonly growthService: GrowthService,
    @Inject(ChannelsService) private readonly channelsService: ChannelsService,
    @Inject(AdminSettingsService) private readonly settingsService: AdminSettingsService
  ) {}

  @Get('health')
  health(): { uptimeSeconds: number; checkedAt: string } {
    return {
      uptimeSeconds: process.uptime(),
      checkedAt: new Date().toISOString()
    };
  }

  @Get('providers/status')
  providerStatus(): {
    email: ReturnType<GrowthService['getEmailProviderStatus']>;
    channels: ReturnType<ChannelsService['getSetupStatus']>;
  } {
    return {
      email: this.growthService.getEmailProviderStatus(),
      channels: this.channelsService.getSetupStatus()
    };
  }

  @Get('users')
  listUsers(): ReturnType<AuthService['listUsers']> {
    return this.authService.listUsers();
  }

  @Post('users')
  createUser(@Body() input: unknown): ReturnType<AuthService['createUserByAdmin']> {
    const parsed = adminCreateUserSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.authService.createUserByAdmin(parsed.data);
  }

  @Patch('users/:userId')
  updateUser(
    @Param('userId') userId: string,
    @Body() input: unknown
  ): ReturnType<AuthService['updateUserByAdmin']> {
    const parsed = adminUpdateUserSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    try {
      return this.authService.updateUserByAdmin(userId, parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        throw new NotFoundException('User not found.');
      }
      throw error;
    }
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string): ReturnType<AuthService['deleteUserByAdmin']> {
    try {
      return this.authService.deleteUserByAdmin(userId);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        throw new NotFoundException('User not found.');
      }
      throw error;
    }
  }

  @Get('settings')
  listSettings(): AdminSettingRecord[] {
    return this.settingsService.list();
  }

  @Put('settings/:key')
  upsertSetting(
    @Param('key') key: string,
    @Body() input: unknown
  ): AdminSettingRecord {
    const parsed = adminSettingUpsertSchema.safeParse({
      ...(typeof input === 'object' && input ? input : {}),
      key
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.settingsService.upsert(parsed.data);
  }

  @Delete('settings/:key')
  deleteSetting(@Param('key') key: string): { deleted: true; key: string } {
    try {
      return this.settingsService.delete(key);
    } catch (error) {
      if (error instanceof Error && error.message === 'setting_not_found') {
        throw new NotFoundException('Setting not found.');
      }
      throw error;
    }
  }

  @Get('campaigns')
  listCampaigns(): ReturnType<GrowthService['listCampaigns']> {
    return this.growthService.listCampaigns();
  }

  @Post('campaigns')
  createCampaign(@Body() input: unknown): ReturnType<GrowthService['createCampaign']> {
    const parsed = adminCreateCampaignSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.growthService.createCampaign(parsed.data);
  }

  @Patch('campaigns/:campaignId')
  updateCampaign(
    @Param('campaignId') campaignId: string,
    @Body() input: unknown
  ): ReturnType<GrowthService['updateCampaign']> {
    const parsed = adminUpdateCampaignSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    try {
      return this.growthService.updateCampaign(campaignId, parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message === 'campaign_not_found') {
        throw new NotFoundException('Campaign not found.');
      }
      throw error;
    }
  }

  @Delete('campaigns/:campaignId')
  deleteCampaign(
    @Param('campaignId') campaignId: string
  ): ReturnType<GrowthService['deleteCampaign']> {
    try {
      return this.growthService.deleteCampaign(campaignId);
    } catch (error) {
      if (error instanceof Error && error.message === 'campaign_not_found') {
        throw new NotFoundException('Campaign not found.');
      }
      throw error;
    }
  }

  @Post('campaigns/send-email')
  async sendEmailCampaign(
    @Body() input: unknown
  ): Promise<{
    accepted: true;
    eventType: string;
    attempted: number;
    sent: number;
    failed: Array<{ email: string; reason: string }>;
  }> {
    const parsed = adminEmailCampaignSendSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const results = await Promise.allSettled(
      parsed.data.emails.map(async (email) =>
        this.growthService.triggerLifecycleEvent({
          email,
          eventType: parsed.data.eventType,
          storyId: parsed.data.storyId,
          metadata: parsed.data.metadata
        })
      )
    );

    const failed = results
      .map((result, index) => ({ result, email: parsed.data.emails[index] ?? '' }))
      .filter((entry) => entry.result.status === 'rejected')
      .map((entry) => ({
        email: entry.email,
        reason:
          entry.result.status === 'rejected' && entry.result.reason instanceof Error
            ? entry.result.reason.message
            : 'send_failed'
      }));

    return {
      accepted: true,
      eventType: parsed.data.eventType,
      attempted: parsed.data.emails.length,
      sent: parsed.data.emails.length - failed.length,
      failed
    };
  }

  @Post('campaigns/send-custom-email')
  async sendCustomEmailCampaign(
    @Body() input: unknown
  ): Promise<{
    campaignLabel: string;
    attempted: number;
    sent: number;
    receipts: Array<{ providerId: string; messageId: string; acceptedAt: string }>;
    failed: Array<{ email: string; reason: string }>;
  }> {
    const parsed = adminCustomEmailCampaignSendSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.growthService.sendCustomCampaign(parsed.data);
  }

  @Post('broadcasts/channels')
  async sendChannelBroadcast(
    @Body() input: unknown
  ): Promise<Awaited<ReturnType<ChannelsService['sendChannelMessage']>>> {
    const parsed = adminChannelBroadcastSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    try {
      return await this.channelsService.sendChannelMessage(parsed.data);
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
