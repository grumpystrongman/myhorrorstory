import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { StoriesModule } from './stories/stories.module.js';
import { PartiesModule } from './parties/parties.module.js';
import { AdminModule } from './admin/admin.module.js';
import { SupportModule } from './support/support.module.js';
import { RealtimeGateway } from './realtime/realtime.gateway.js';
import { BillingModule } from './billing/billing.module.js';
import { GrowthModule } from './growth/growth.module.js';
import { RuntimeModule } from './runtime/runtime.module.js';
import { ChannelsModule } from './channels/channels.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    StoriesModule,
    PartiesModule,
    AdminModule,
    SupportModule,
    BillingModule,
    GrowthModule,
    RuntimeModule,
    ChannelsModule
  ],
  controllers: [AppController],
  providers: [AppService, RealtimeGateway]
})
export class AppModule {}
