import { describe, expect, it } from 'vitest';
import { CrmService, InMemoryCrmProvider } from './index';

describe('crm', () => {
  it('syncs contacts and segments', async () => {
    const provider = new InMemoryCrmProvider();
    const crm = new CrmService(provider);

    await crm.syncLead({
      email: 'lead@example.com',
      traits: { source: 'landing' }
    });
    await crm.markAbandonedCase('lead@example.com');

    expect(provider.contacts.has('lead@example.com')).toBe(true);
    expect(provider.segments.get('abandoned_case')?.has('lead@example.com')).toBe(true);
  });
});
