export interface CheckoutRequest {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  providerReference: string;
}

export interface PaymentProvider {
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession>;
}

export class MockStripeProvider implements PaymentProvider {
  async createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession> {
    return {
      checkoutUrl: `${request.successUrl}?checkout=mock`,
      providerReference: `mock_${request.userId}_${request.priceId}`
    };
  }
}

export class BillingService {
  constructor(private readonly provider: PaymentProvider) {}

  async createSubscriptionCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return this.provider.createCheckoutSession(request);
  }
}
