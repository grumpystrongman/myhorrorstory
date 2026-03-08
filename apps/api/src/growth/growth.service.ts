import { Injectable } from '@nestjs/common';
import { AnalyticsService, InMemoryAnalyticsProvider } from '@myhorrorstory/analytics';
import { CrmService, InMemoryCrmProvider } from '@myhorrorstory/crm';

@Injectable()
export class GrowthService {
  private readonly analytics = new AnalyticsService(new InMemoryAnalyticsProvider());
  private readonly crm = new CrmService(new InMemoryCrmProvider());

  async captureLead(input: {
    email: string;
    source: string;
  }): Promise<{ accepted: boolean; segment: string }> {
    await this.crm.syncLead({
      email: input.email,
      traits: {
        source: input.source,
        capturedAt: new Date().toISOString()
      }
    });

    await this.analytics.track({
      event: 'lead_captured',
      properties: { source: input.source },
      occurredAt: new Date().toISOString(),
      anonymousId: input.email
    });

    return {
      accepted: true,
      segment: 'new_lead'
    };
  }
}
