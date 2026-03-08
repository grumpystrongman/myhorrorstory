export interface AnalyticsEvent {
  userId?: string;
  anonymousId?: string;
  event: string;
  properties: Record<string, string | number | boolean | null>;
  occurredAt: string;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): Promise<void>;
}

export class InMemoryAnalyticsProvider implements AnalyticsProvider {
  public readonly events: AnalyticsEvent[] = [];

  async track(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }
}

export class AnalyticsService {
  constructor(private readonly provider: AnalyticsProvider) {}

  async track(event: AnalyticsEvent): Promise<void> {
    await this.provider.track(event);
  }
}
