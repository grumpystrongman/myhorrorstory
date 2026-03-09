import type {
  CreatePartyInput,
  EvaluateTriggersRequest,
  EvaluateTriggersResponse,
  InvestigationBoard,
  NextNarrativeEventRequest,
  NextNarrativeEventResponse,
  ProcessInboundMessageRequest,
  ProcessInboundMessageResponse
} from '@myhorrorstory/contracts';

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

  async processInboundMessage(
    input: ProcessInboundMessageRequest
  ): Promise<ProcessInboundMessageResponse> {
    return this.http.request('/api/v1/channels/inbound', {
      method: 'POST',
      body: input
    });
  }

  async evaluateRules(input: EvaluateTriggersRequest): Promise<EvaluateTriggersResponse> {
    return this.http.request('/api/v1/story-rules/evaluate', {
      method: 'POST',
      body: input
    });
  }

  async upsertInvestigationBoard(input: {
    caseId: string;
    playerId: string;
    board: InvestigationBoard;
  }): Promise<{ updated: true }> {
    return this.http.request('/api/v1/investigation/board', {
      method: 'PUT',
      body: input
    });
  }

  async nextNarrativeEvent(input: NextNarrativeEventRequest): Promise<NextNarrativeEventResponse> {
    return this.http.request('/api/v1/narrative/events/next', {
      method: 'POST',
      body: input
    });
  }
}
