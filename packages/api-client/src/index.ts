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

type MessagingChannel = 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL';

export interface HttpClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; token?: string }): Promise<T>;
}

export interface SetupChannelContact {
  channel: MessagingChannel;
  address: string;
  optIn?: boolean;
}

export interface SetupUserChannelsRequest {
  caseId: string;
  playerId: string;
  contacts: SetupChannelContact[];
}

export interface SendSetupTestRequest {
  caseId: string;
  playerId: string;
  channels?: MessagingChannel[];
  message?: string;
}

export interface SendChannelMessageRequest {
  caseId: string;
  playerId: string;
  channels?: MessagingChannel[];
  message: string;
  mediaUrls?: string[];
}

export interface GrowthLeadCaptureRequest {
  email: string;
  source: string;
  firstName?: string;
  lastName?: string;
  marketingConsent?: boolean;
  tags?: string[];
  country?: string;
  locale?: string;
}

export interface GrowthLifecycleEventRequest {
  email: string;
  eventType:
    | 'welcome'
    | 'abandoned_signup'
    | 'abandoned_case'
    | 'win_back'
    | 'upsell'
    | 'referral_invite'
    | 'launch_announcement';
  storyId?: string;
  metadata?: Record<string, string | number | boolean>;
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

  async getChannelSetupStatus(publicBaseUrl?: string): Promise<{
    baseUrl: string;
    providers: string[];
    channels: Array<{
      channel: MessagingChannel;
      configured: boolean;
      liveProvider: string | null;
      fallbackProvider: string;
      webhookUrl: string;
      missingEnv: string[];
    }>;
  }> {
    const query = publicBaseUrl ? `?publicBaseUrl=${encodeURIComponent(publicBaseUrl)}` : '';
    return this.http.request(`/api/v1/channels/setup${query}`, { method: 'GET' });
  }

  async setupUserChannels(input: SetupUserChannelsRequest): Promise<{
    updated: true;
    caseId: string;
    playerId: string;
    channelCount: number;
    activeRouteCount: number;
  }> {
    return this.http.request('/api/v1/channels/setup/user', {
      method: 'POST',
      body: input
    });
  }

  async sendChannelSetupTest(input: SendSetupTestRequest): Promise<{
    caseId: string;
    playerId: string;
    sentCount: number;
    receipts: Array<{
      provider: string;
      channel: MessagingChannel;
      to: string;
      externalMessageId: string;
      acceptedAt: string;
    }>;
  }> {
    return this.http.request('/api/v1/channels/setup/test', {
      method: 'POST',
      body: input
    });
  }

  async getUserChannels(input: { caseId: string; playerId: string }): Promise<{
    caseId: string;
    playerId: string;
    updatedAt: string;
    contacts: Array<{
      channel: MessagingChannel;
      address: string;
      normalizedAddress: string;
      optIn: boolean;
    }>;
  }> {
    const query = `?caseId=${encodeURIComponent(input.caseId)}&playerId=${encodeURIComponent(input.playerId)}`;
    return this.http.request(`/api/v1/channels/setup/user${query}`, { method: 'GET' });
  }

  async sendChannelMessage(input: SendChannelMessageRequest): Promise<{
    caseId: string;
    playerId: string;
    sentCount: number;
    receipts: Array<{
      provider: string;
      channel: MessagingChannel;
      to: string;
      externalMessageId: string;
      acceptedAt: string;
    }>;
  }> {
    return this.http.request('/api/v1/channels/send', {
      method: 'POST',
      body: input
    });
  }

  async captureLead(input: GrowthLeadCaptureRequest): Promise<{
    accepted: boolean;
    segment: string;
    lifecycleEmailQueued: boolean;
    leadId: string;
  }> {
    return this.http.request('/api/v1/growth/lead-capture', {
      method: 'POST',
      body: input
    });
  }

  async triggerLifecycleEvent(input: GrowthLifecycleEventRequest): Promise<{
    accepted: boolean;
    eventType: GrowthLifecycleEventRequest['eventType'];
    campaignId: string;
    emailQueued: boolean;
  }> {
    return this.http.request('/api/v1/growth/lifecycle-event', {
      method: 'POST',
      body: input
    });
  }

  async listGrowthLeads(): Promise<
    Array<{
      id: string;
      email: string;
      source: string;
      firstName: string | null;
      lastName: string | null;
      marketingConsent: boolean;
      tags: string[];
      locale: string | null;
      country: string | null;
      createdAt: string;
      updatedAt: string;
      lastLifecycleEvent: string | null;
    }>
  > {
    return this.http.request('/api/v1/growth/leads', {
      method: 'GET'
    });
  }

  async listGrowthCampaigns(): Promise<
    Array<{
      id: string;
      label: string;
      triggerEvent: string;
      segment: string;
      sendDelayMinutes: number;
    }>
  > {
    return this.http.request('/api/v1/growth/campaigns', {
      method: 'GET'
    });
  }
}
