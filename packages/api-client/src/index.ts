import type { CreatePartyInput } from '@myhorrorstory/contracts';

export interface HttpClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; token?: string }): Promise<T>;
}

export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  async createParty(input: CreatePartyInput): Promise<{ partyId: string }> {
    return this.http.request('/api/v1/parties', {
      method: 'POST',
      body: input
    });
  }
}
