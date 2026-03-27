import { Module } from '@nestjs/common';
import { RuntimeModule } from '../runtime/runtime.module.js';
import { ChannelsController } from './channels.controller.js';
import { ChannelsService } from './channels.service.js';
import { WebhooksController } from './webhooks.controller.js';

@Module({
  imports: [RuntimeModule],
  controllers: [ChannelsController, WebhooksController],
  providers: [ChannelsService],
  exports: [ChannelsService]
})
export class ChannelsModule {}
