import { Injectable } from '@nestjs/common';
import { BillingService, MockStripeProvider, type CheckoutSession } from '@myhorrorstory/payments';

@Injectable()
export class BillingApiService {
  private readonly billing = new BillingService(new MockStripeProvider());

  async createCheckout(input: {
    userId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    return this.billing.createSubscriptionCheckout(input);
  }
}
