import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ChannelsModule } from '../channels/channels.module.js';
import { GrowthModule } from '../growth/growth.module.js';
import { AdminController } from './admin.controller.js';
import { AdminSettingsService } from './admin-settings.service.js';

@Module({
  imports: [AuthModule, GrowthModule, ChannelsModule],
  controllers: [AdminController],
  providers: [AdminSettingsService]
})
export class AdminModule {}
