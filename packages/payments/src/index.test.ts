import { describe, expect, it } from 'vitest';
import { BillingService, MockStripeProvider } from './index';

describe('payments', () => {
  it('creates checkout session', async () => {
    const service = new BillingService(new MockStripeProvider());
    const session = await service.createSubscriptionCheckout({
      userId: 'u1',
      priceId: 'price_pro',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    });

    expect(session.providerReference).toContain('mock_u1');
  });
});
