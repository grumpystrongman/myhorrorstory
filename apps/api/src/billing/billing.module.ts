import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingApiService } from './billing.service.js';

@Module({
  controllers: [BillingController],
  providers: [BillingApiService]
})
export class BillingModule {}
