import { Inject, Injectable } from '@nestjs/common';
import {
  coerceWebhookBodyToRecord,
  createDefaultMessagingProviders,
  MessagingRouter,
  normalizeSignalInbound,
  normalizeTelegramInbound,
  normalizeTwilioInbound,
  type DeliveryReceipt,
  type NormalizedInboundMessage
} from '@myhorrorstory/messaging';
import { RuntimeService } from '../runtime/runtime.service.js';
import {
  ChannelEnrollmentStore,
  type StoredChannelEnrollment
} from './channel-enrollment.store.js';
import type {
  SendChannelMessageInput,
  SendSetupTestInput,
  SetupContact,
  SetupMessagingChannel,
  SetupUserChannelsInput
} from './channels.schemas.js';

type SetupStatusChannel = {
  channel: SetupMessagingChannel;
  configured: boolean;
  liveProvider: string | null;
  fallbackProvider: string;
  webhookUrl: string;
  missingEnv: string[];
};

type ChannelEnrollment = {
  caseId: string;
  playerId: string;
  contacts: Array<
    SetupContact & {
      normalizedAddress: string;
    }
  >;
  updatedAt: string;
};

type RoutedPlayer = {
  caseId: string;
  playerId: string;
  channel: SetupMessagingChannel;
};

type InboundProcessingResult = {
  accepted: boolean;
  channel: SetupMessagingChannel;
  caseId?: string;
  playerId?: string;
  recognizedIntent?: string;
  appliedRuleIds?: string[];
  generatedEvents?: string[];
  reason?: string;
};

@Injectable()
export class ChannelsService {
  private readonly router = new MessagingRouter(createDefaultMessagingProviders());
  private readonly enrollments = new Map<string, ChannelEnrollment>();
  private readonly inboundRouteIndex = new Map<string, RoutedPlayer>();
  private readonly enrollmentStore = new ChannelEnrollmentStore();

  constructor(@Inject(RuntimeService) private readonly runtimeService: RuntimeService) {
    for (const enrollment of this.enrollmentStore.load()) {
      this.enrollments.set(this.enrollmentKey(enrollment.caseId, enrollment.playerId), enrollment);
      this.addRoutes(enrollment);
    }
  }

  getSetupStatus(publicBaseUrl?: string): {
    baseUrl: string;
    providers: string[];
    channels: SetupStatusChannel[];
    enrollmentStorePath: string | null;
  } {
    const baseUrl = this.resolvePublicBaseUrl(publicBaseUrl);
    const providers = this.router.listProviderIds();

    return {
      baseUrl,
      providers,
      channels: [
        {
          channel: 'SMS',
          configured: this.hasTwilioSms(),
          liveProvider: this.hasTwilioSms() ? 'twilio' : null,
          fallbackProvider: 'console',
          webhookUrl: `${baseUrl}/api/v1/webhooks/twilio`,
          missingEnv: this.missingSmsEnv()
        },
        {
          channel: 'WHATSAPP',
          configured: this.hasTwilioWhatsapp(),
          liveProvider: this.hasTwilioWhatsapp() ? 'twilio' : null,
          fallbackProvider: 'console',
          webhookUrl: `${baseUrl}/api/v1/webhooks/twilio`,
          missingEnv: this.missingWhatsappEnv()
        },
        {
          channel: 'TELEGRAM',
          configured: this.hasTelegram(),
          liveProvider: this.hasTelegram() ? 'telegram' : null,
          fallbackProvider: 'console',
          webhookUrl: `${baseUrl}/api/v1/webhooks/telegram`,
          missingEnv: this.missingTelegramEnv()
        },
        {
          channel: 'SIGNAL',
          configured: this.hasSignal(),
          liveProvider: this.hasSignal() ? 'signal' : null,
          fallbackProvider: 'console',
          webhookUrl: `${baseUrl}/api/v1/webhooks/signal`,
          missingEnv: this.missingSignalEnv()
        }
      ],
      enrollmentStorePath: this.enrollmentStore.getStorePath()
    };
  }

  upsertUserChannels(input: SetupUserChannelsInput): {
    updated: true;
    caseId: string;
    playerId: string;
    channelCount: number;
    activeRouteCount: number;
  } {
    const key = this.enrollmentKey(input.caseId, input.playerId);
    const existing = this.enrollments.get(key);
    if (existing) {
      this.removeRoutes(existing);
    }

    const dedupedContacts = new Map<
      string,
      SetupContact & {
        normalizedAddress: string;
      }
    >();
    for (const contact of input.contacts) {
      const normalizedAddress = this.normalizeAddress(contact.channel, contact.address);
      dedupedContacts.set(this.routeKey(contact.channel, normalizedAddress), {
        ...contact,
        normalizedAddress
      });
    }

    const contacts = Array.from(dedupedContacts.values());

    const enrollment: ChannelEnrollment = {
      caseId: input.caseId,
      playerId: input.playerId,
      contacts,
      updatedAt: new Date().toISOString()
    };

    this.enrollments.set(key, enrollment);
    this.addRoutes(enrollment);
    this.persistEnrollments();

    return {
      updated: true,
      caseId: input.caseId,
      playerId: input.playerId,
      channelCount: contacts.length,
      activeRouteCount: contacts.filter((contact) => contact.optIn).length
    };
  }

  getUserChannels(input: { caseId: string; playerId: string }): {
    caseId: string;
    playerId: string;
    updatedAt: string;
    contacts: Array<SetupContact & { normalizedAddress: string }>;
  } {
    const enrollment = this.enrollments.get(this.enrollmentKey(input.caseId, input.playerId));
    if (!enrollment) {
      throw new Error('user_channels_not_found');
    }

    return {
      caseId: enrollment.caseId,
      playerId: enrollment.playerId,
      updatedAt: enrollment.updatedAt,
      contacts: enrollment.contacts
    };
  }

  async sendSetupTest(input: SendSetupTestInput): Promise<{
    caseId: string;
    playerId: string;
    sentCount: number;
    receipts: DeliveryReceipt[];
  }> {
    const enrollment = this.enrollments.get(this.enrollmentKey(input.caseId, input.playerId));
    if (!enrollment) {
      throw new Error('user_channels_not_found');
    }

    const requestedChannels = input.channels ? new Set(input.channels) : null;
    const contactsToSend = enrollment.contacts.filter((contact) => {
      if (!contact.optIn) {
        return false;
      }
      if (!requestedChannels) {
        return true;
      }
      return requestedChannels.has(contact.channel);
    });

    if (contactsToSend.length === 0) {
      throw new Error('no_opted_in_contacts');
    }

    const message =
      input.message ??
      `MyHorrorStory channel test for case ${input.caseId}. Reply in-thread to continue the investigation.`;

    const receipts: DeliveryReceipt[] = [];
    for (const contact of contactsToSend) {
      const receipt = await this.router.send({
        channel: contact.channel,
        to: contact.normalizedAddress,
        text: message,
        metadata: {
          caseId: input.caseId,
          playerId: input.playerId,
          setupMode: true
        }
      });
      receipts.push(receipt);
    }

    return {
      caseId: input.caseId,
      playerId: input.playerId,
      sentCount: receipts.length,
      receipts
    };
  }

  async sendChannelMessage(input: SendChannelMessageInput): Promise<{
    caseId: string;
    playerId: string;
    sentCount: number;
    receipts: DeliveryReceipt[];
  }> {
    const enrollment = this.enrollments.get(this.enrollmentKey(input.caseId, input.playerId));
    if (!enrollment) {
      throw new Error('user_channels_not_found');
    }

    const requestedChannels = input.channels ? new Set(input.channels) : null;
    const contactsToSend = enrollment.contacts.filter((contact) => {
      if (!contact.optIn) {
        return false;
      }
      if (!requestedChannels) {
        return true;
      }
      return requestedChannels.has(contact.channel);
    });

    if (contactsToSend.length === 0) {
      throw new Error('no_opted_in_contacts');
    }

    const receipts: DeliveryReceipt[] = [];
    for (const contact of contactsToSend) {
      const receipt = await this.router.send({
        channel: contact.channel,
        to: contact.normalizedAddress,
        text: input.message,
        mediaUrls: input.mediaUrls,
        metadata: {
          caseId: input.caseId,
          playerId: input.playerId,
          setupMode: false
        }
      });
      receipts.push(receipt);
    }

    return {
      caseId: input.caseId,
      playerId: input.playerId,
      sentCount: receipts.length,
      receipts
    };
  }

  processTwilioWebhook(body: unknown): InboundProcessingResult {
    const payload = coerceWebhookBodyToRecord(body);
    const inbound = normalizeTwilioInbound(payload);
    return this.processInboundMessage(inbound);
  }

  processTelegramWebhook(body: unknown): InboundProcessingResult {
    const inbound = normalizeTelegramInbound(body as Parameters<typeof normalizeTelegramInbound>[0]);
    return this.processInboundMessage(inbound);
  }

  processSignalWebhook(body: unknown): InboundProcessingResult {
    const inbound = normalizeSignalInbound(body as Parameters<typeof normalizeSignalInbound>[0]);
    return this.processInboundMessage(inbound);
  }

  private processInboundMessage(message: NormalizedInboundMessage): InboundProcessingResult {
    const channel = message.channel as SetupMessagingChannel;
    const route = this.inboundRouteIndex.get(this.routeKey(channel, this.normalizeAddress(channel, message.from)));

    if (!route) {
      return {
        accepted: false,
        channel,
        reason: 'contact_not_registered'
      };
    }

    const runtime = this.runtimeService.processInboundMessage({
      event: {
        caseId: route.caseId,
        playerId: route.playerId,
        channel,
        message: message.text,
        sentAt: message.receivedAt
      },
      runtimeFlags: {}
    });

    return {
      accepted: runtime.accepted,
      channel,
      caseId: route.caseId,
      playerId: route.playerId,
      recognizedIntent: runtime.recognizedIntent,
      appliedRuleIds: runtime.appliedRuleIds,
      generatedEvents: runtime.generatedEvents
    };
  }

  private addRoutes(enrollment: ChannelEnrollment): void {
    for (const contact of enrollment.contacts) {
      if (!contact.optIn) {
        continue;
      }
      this.inboundRouteIndex.set(this.routeKey(contact.channel, contact.normalizedAddress), {
        caseId: enrollment.caseId,
        playerId: enrollment.playerId,
        channel: contact.channel
      });
    }
  }

  private removeRoutes(enrollment: ChannelEnrollment): void {
    for (const contact of enrollment.contacts) {
      this.inboundRouteIndex.delete(this.routeKey(contact.channel, contact.normalizedAddress));
    }
  }

  private hasTwilioBase(): boolean {
    return (
      this.isConfiguredValue(process.env.TWILIO_ACCOUNT_SID) &&
      this.isConfiguredValue(process.env.TWILIO_AUTH_TOKEN)
    );
  }

  private hasTwilioSms(): boolean {
    return this.hasTwilioBase() && this.isConfiguredValue(process.env.TWILIO_SMS_FROM);
  }

  private hasTwilioWhatsapp(): boolean {
    return this.hasTwilioBase() && this.isConfiguredValue(process.env.TWILIO_WHATSAPP_FROM);
  }

  private hasTelegram(): boolean {
    return this.isConfiguredValue(process.env.TELEGRAM_BOT_TOKEN);
  }

  private hasSignal(): boolean {
    return (
      this.isConfiguredValue(process.env.SIGNAL_GATEWAY_URL) &&
      this.isConfiguredValue(process.env.SIGNAL_ACCOUNT)
    );
  }

  private missingSmsEnv(): string[] {
    const missing = [];
    if (!this.isConfiguredValue(process.env.TWILIO_ACCOUNT_SID)) {
      missing.push('TWILIO_ACCOUNT_SID');
    }
    if (!this.isConfiguredValue(process.env.TWILIO_AUTH_TOKEN)) {
      missing.push('TWILIO_AUTH_TOKEN');
    }
    if (!this.isConfiguredValue(process.env.TWILIO_SMS_FROM)) {
      missing.push('TWILIO_SMS_FROM');
    }
    return missing;
  }

  private missingWhatsappEnv(): string[] {
    const missing = [];
    if (!this.isConfiguredValue(process.env.TWILIO_ACCOUNT_SID)) {
      missing.push('TWILIO_ACCOUNT_SID');
    }
    if (!this.isConfiguredValue(process.env.TWILIO_AUTH_TOKEN)) {
      missing.push('TWILIO_AUTH_TOKEN');
    }
    if (!this.isConfiguredValue(process.env.TWILIO_WHATSAPP_FROM)) {
      missing.push('TWILIO_WHATSAPP_FROM');
    }
    return missing;
  }

  private missingTelegramEnv(): string[] {
    const missing = [];
    if (!this.isConfiguredValue(process.env.TELEGRAM_BOT_TOKEN)) {
      missing.push('TELEGRAM_BOT_TOKEN');
    }
    if (!this.isConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET)) {
      missing.push('TELEGRAM_WEBHOOK_SECRET');
    }
    return missing;
  }

  private missingSignalEnv(): string[] {
    const missing = [];
    if (!this.isConfiguredValue(process.env.SIGNAL_GATEWAY_URL)) {
      missing.push('SIGNAL_GATEWAY_URL');
    }
    if (!this.isConfiguredValue(process.env.SIGNAL_ACCOUNT)) {
      missing.push('SIGNAL_ACCOUNT');
    }
    return missing;
  }

  private enrollmentKey(caseId: string, playerId: string): string {
    return `${caseId}:${playerId}`;
  }

  private routeKey(channel: SetupMessagingChannel, normalizedAddress: string): string {
    return `${channel}:${normalizedAddress}`;
  }

  private resolvePublicBaseUrl(publicBaseUrl?: string): string {
    const candidate =
      publicBaseUrl?.trim() ||
      process.env.MESSAGING_PUBLIC_BASE_URL?.trim() ||
      `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 8787}`;
    return candidate.replace(/\/$/, '');
  }

  private normalizeAddress(channel: SetupMessagingChannel, address: string): string {
    const compact = address.trim().replace(/\s+/g, '');

    if (channel === 'TELEGRAM') {
      return compact;
    }

    if (channel === 'SIGNAL') {
      return compact.toLowerCase();
    }

    if (channel === 'WHATSAPP') {
      const withoutPrefix = compact.replace(/^whatsapp:/i, '');
      return `whatsapp:${withoutPrefix}`.toLowerCase();
    }

    return compact.replace(/^sms:/i, '').toLowerCase();
  }

  private persistEnrollments(): void {
    const payload: StoredChannelEnrollment[] = [];
    for (const enrollment of this.enrollments.values()) {
      payload.push({
        caseId: enrollment.caseId,
        playerId: enrollment.playerId,
        contacts: enrollment.contacts,
        updatedAt: enrollment.updatedAt
      });
    }
    this.enrollmentStore.save(payload);
  }

  private isConfiguredValue(value: string | undefined): boolean {
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    if (
      normalized.startsWith('replace') ||
      normalized.startsWith('your_') ||
      normalized.includes('replace') ||
      normalized.includes('changeme') ||
      normalized.includes('example') ||
      normalized.includes('placeholder')
    ) {
      return false;
    }

    return true;
  }
}
