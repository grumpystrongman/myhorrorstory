import { describe, expect, it } from 'vitest';
import { AnalyticsService, InMemoryAnalyticsProvider } from './index';

describe('analytics', () => {
  it('tracks events', async () => {
    const provider = new InMemoryAnalyticsProvider();
    const service = new AnalyticsService(provider);

    await service.track({
      event: 'case_started',
      properties: { caseId: 'case-1' },
      occurredAt: new Date().toISOString()
    });

    expect(provider.events).toHaveLength(1);
  });
});
