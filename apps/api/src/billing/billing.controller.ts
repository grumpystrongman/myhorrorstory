import { Body, Controller, Inject, Post } from '@nestjs/common';
import { BillingApiService } from './billing.service.js';

@Controller('billing')
export class BillingController {
  constructor(@Inject(BillingApiService) private readonly billingService: BillingApiService) {}

  @Post('checkout')
  async checkout(
    @Body()
    input: {
      userId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<{ checkoutUrl: string; providerReference: string }> {
    return this.billingService.createCheckout(input);
  }
}
