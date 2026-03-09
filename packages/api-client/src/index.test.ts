import { describe, expect, it } from 'vitest';
import { ApiClient, type HttpClient } from './index';

describe('api-client', () => {
  it('calls create party endpoint', async () => {
    const http: HttpClient = {
      request: async <T>() => ({ partyId: 'party-1' } as T)
    };

    const client = new ApiClient(http);
    const output = await client.createParty({
      storyId: 'case-1',
      mode: 'PARTY',
      hostless: false
    });

    expect(output.partyId).toBe('party-1');
  });

  it('calls channels send endpoint', async () => {
    const calls: string[] = [];
    const http: HttpClient = {
      request: async <T>(path: string) => {
        calls.push(path);
        return {
          caseId: 'midnight-lockbox',
          playerId: 'p1',
          sentCount: 1,
          receipts: []
        } as T;
      }
    };

    const client = new ApiClient(http);
    const output = await client.sendChannelMessage({
      caseId: 'midnight-lockbox',
      playerId: 'p1',
      channels: ['SMS'],
      message: 'dispatch'
    });

    expect(output.sentCount).toBe(1);
    expect(calls).toContain('/api/v1/channels/send');
  });

  it('calls growth endpoints', async () => {
    const calls: string[] = [];
    const http: HttpClient = {
      request: async <T>(path: string) => {
        calls.push(path);
        if (path === '/api/v1/growth/lead-capture') {
          return {
            accepted: true,
            segment: 'new_lead',
            lifecycleEmailQueued: true,
            leadId: 'lead-1'
          } as T;
        }
        if (path === '/api/v1/growth/lifecycle-event') {
          return {
            accepted: true,
            eventType: 'abandoned_case',
            campaignId: 'campaign-abandoned-case',
            emailQueued: true
          } as T;
        }
        if (path === '/api/v1/growth/leads') {
          return [] as T;
        }
        return [] as T;
      }
    };

    const client = new ApiClient(http);
    const lead = await client.captureLead({
      email: 'lead@example.com',
      source: 'landing'
    });
    const lifecycle = await client.triggerLifecycleEvent({
      email: 'lead@example.com',
      eventType: 'abandoned_case'
    });
    await client.listGrowthLeads();
    await client.listGrowthCampaigns();

    expect(lead.accepted).toBe(true);
    expect(lifecycle.emailQueued).toBe(true);
    expect(calls).toContain('/api/v1/growth/lead-capture');
    expect(calls).toContain('/api/v1/growth/lifecycle-event');
    expect(calls).toContain('/api/v1/growth/leads');
    expect(calls).toContain('/api/v1/growth/campaigns');
  });
});
