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
});
