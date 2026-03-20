import { createHmac, timingSafeEqual } from 'node:crypto';

export type SupportedMessagingChannel = 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL';

export type MessagingMetadataValue = boolean | number | string;

export interface MessagingPayload {
  channel: SupportedMessagingChannel;
  to: string;
  text: string;
  mediaUrls?: string[];
  metadata?: Record<string, MessagingMetadataValue>;
}

export interface DeliveryReceipt {
  provider: string;
  channel: SupportedMessagingChannel;
  to: string;
  externalMessageId: string;
  acceptedAt: string;
}

export interface NormalizedInboundMessage {
  channel: SupportedMessagingChannel;
  from: string;
  text: string;
  externalMessageId?: string;
  receivedAt: string;
  metadata?: Record<string, MessagingMetadataValue>;
  raw: unknown;
}

export interface MessagingProvider {
  readonly id: string;
  supports(channel: SupportedMessagingChannel): boolean;
  send(payload: MessagingPayload): Promise<DeliveryReceipt>;
}

export class ConsoleMessagingProvider implements MessagingProvider {
  readonly id = 'console';

  supports(channel: SupportedMessagingChannel): boolean {
    void channel;
    return true;
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    const acceptedAt = new Date().toISOString();
    const externalMessageId = `console-${payload.channel.toLowerCase()}-${Date.now()}`;
    console.log(
      '[messaging:console]',
      JSON.stringify({
        payload,
        acceptedAt,
        externalMessageId
      })
    );

    return {
      provider: this.id,
      channel: payload.channel,
      to: payload.to,
      externalMessageId,
      acceptedAt
    };
  }
}

export interface TwilioMessagingProviderOptions {
  accountSid: string;
  authToken: string;
  smsFrom?: string;
  whatsappFrom?: string;
  statusCallbackUrl?: string;
  apiBaseUrl?: string;
}

interface TwilioSendResponse {
  sid?: string;
  date_created?: string;
}

const DEFAULT_TWILIO_BASE_URL = 'https://api.twilio.com';

export class TwilioMessagingProvider implements MessagingProvider {
  readonly id = 'twilio';

  constructor(private readonly options: TwilioMessagingProviderOptions) {}

  supports(channel: SupportedMessagingChannel): boolean {
    return channel === 'SMS' || channel === 'WHATSAPP';
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    if (!this.supports(payload.channel)) {
      throw new Error(`Twilio provider does not support channel ${payload.channel}`);
    }

    const from = this.resolveFrom(payload.channel);
    const endpoint = `${this.options.apiBaseUrl ?? DEFAULT_TWILIO_BASE_URL}/2010-04-01/Accounts/${this.options.accountSid}/Messages.json`;
    const body = new URLSearchParams();
    body.set('To', payload.to);
    body.set('From', from);
    body.set('Body', payload.text);

    if (this.options.statusCallbackUrl) {
      body.set('StatusCallback', this.options.statusCallbackUrl);
    }

    for (const mediaUrl of payload.mediaUrls ?? []) {
      body.append('MediaUrl', mediaUrl);
    }

    const auth = Buffer.from(`${this.options.accountSid}:${this.options.authToken}`).toString('base64');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio send failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as TwilioSendResponse;
    const acceptedAt = data.date_created ? new Date(data.date_created).toISOString() : new Date().toISOString();

    return {
      provider: this.id,
      channel: payload.channel,
      to: payload.to,
      externalMessageId: data.sid ?? `twilio-${Date.now()}`,
      acceptedAt
    };
  }

  private resolveFrom(channel: SupportedMessagingChannel): string {
    if (channel === 'SMS') {
      if (!this.options.smsFrom) {
        throw new Error('TWILIO_SMS_FROM is required for SMS delivery.');
      }
      return this.options.smsFrom;
    }

    if (!this.options.whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM is required for WhatsApp delivery.');
    }

    return this.options.whatsappFrom;
  }
}

export interface TelegramMessagingProviderOptions {
  botToken: string;
  disableNotification?: boolean;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  apiBaseUrl?: string;
}

interface TelegramApiResponse {
  ok: boolean;
  result?: {
    message_id?: number;
    date?: number;
  };
  description?: string;
}

const DEFAULT_TELEGRAM_BASE_URL = 'https://api.telegram.org';

export class TelegramMessagingProvider implements MessagingProvider {
  readonly id = 'telegram';

  constructor(private readonly options: TelegramMessagingProviderOptions) {}

  supports(channel: SupportedMessagingChannel): boolean {
    return channel === 'TELEGRAM';
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    if (!this.supports(payload.channel)) {
      throw new Error(`Telegram provider does not support channel ${payload.channel}`);
    }

    const firstMedia = payload.mediaUrls?.[0];
    const method = firstMedia ? 'sendPhoto' : 'sendMessage';
    const endpoint = `${this.options.apiBaseUrl ?? DEFAULT_TELEGRAM_BASE_URL}/bot${this.options.botToken}/${method}`;

    const requestBody = firstMedia
      ? {
          chat_id: payload.to,
          photo: firstMedia,
          caption: payload.text.slice(0, 1024),
          disable_notification: this.options.disableNotification ?? false,
          parse_mode: this.options.parseMode
        }
      : {
          chat_id: payload.to,
          text: payload.text,
          disable_notification: this.options.disableNotification ?? false,
          parse_mode: this.options.parseMode
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram send failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as TelegramApiResponse;
    if (!data.ok) {
      throw new Error(`Telegram send failed: ${data.description ?? 'Unknown error'}`);
    }

    const acceptedAt =
      data.result?.date !== undefined
        ? new Date(data.result.date * 1000).toISOString()
        : new Date().toISOString();

    return {
      provider: this.id,
      channel: payload.channel,
      to: payload.to,
      externalMessageId: data.result?.message_id?.toString() ?? `telegram-${Date.now()}`,
      acceptedAt
    };
  }
}

export interface SignalMessagingProviderOptions {
  gatewayUrl: string;
  account: string;
  bearerToken?: string;
}

interface SignalSendResponse {
  timestamp?: number | string;
}

function toIsoFromTimestampMaybeSeconds(input: number): string {
  const millis = input < 1_000_000_000_000 ? input * 1000 : input;
  return new Date(millis).toISOString();
}

export class SignalMessagingProvider implements MessagingProvider {
  readonly id = 'signal';

  constructor(private readonly options: SignalMessagingProviderOptions) {}

  supports(channel: SupportedMessagingChannel): boolean {
    return channel === 'SIGNAL';
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    if (!this.supports(payload.channel)) {
      throw new Error(`Signal provider does not support channel ${payload.channel}`);
    }

    const endpoint = `${this.options.gatewayUrl.replace(/\/$/, '')}/v2/send`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.options.bearerToken) {
      headers.Authorization = `Bearer ${this.options.bearerToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: this.options.account,
        recipients: [payload.to],
        message: payload.text,
        attachments: payload.mediaUrls ?? []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Signal send failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as SignalSendResponse;
    const timestamp = data.timestamp?.toString() ?? Date.now().toString();
    const acceptedAt = /^\d+$/.test(timestamp)
      ? toIsoFromTimestampMaybeSeconds(Number(timestamp))
      : new Date().toISOString();

    return {
      provider: this.id,
      channel: payload.channel,
      to: payload.to,
      externalMessageId: `signal-${timestamp}`,
      acceptedAt
    };
  }
}

export class MessagingRouter {
  constructor(private readonly providers: MessagingProvider[]) {}

  listProviderIds(): string[] {
    return this.providers.map((provider) => provider.id);
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    let lastError: unknown;

    for (const provider of this.providers) {
      if (!provider.supports(payload.channel)) {
        continue;
      }

      try {
        return await provider.send(payload);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error(`No messaging provider available for ${payload.channel}`);
  }
}

export interface MessagingEnvironment {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_SMS_FROM?: string;
  TWILIO_WHATSAPP_FROM?: string;
  TWILIO_STATUS_CALLBACK_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_PARSE_MODE?: 'HTML' | 'Markdown' | 'MarkdownV2';
  TELEGRAM_DISABLE_NOTIFICATION?: string;
  SIGNAL_GATEWAY_URL?: string;
  SIGNAL_ACCOUNT?: string;
  SIGNAL_BEARER_TOKEN?: string;
}

export function createDefaultMessagingProviders(
  env: MessagingEnvironment = process.env
): MessagingProvider[] {
  const providers: MessagingProvider[] = [];

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    providers.push(
      new TwilioMessagingProvider({
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        smsFrom: env.TWILIO_SMS_FROM,
        whatsappFrom: env.TWILIO_WHATSAPP_FROM,
        statusCallbackUrl: env.TWILIO_STATUS_CALLBACK_URL
      })
    );
  }

  if (env.TELEGRAM_BOT_TOKEN) {
    providers.push(
      new TelegramMessagingProvider({
        botToken: env.TELEGRAM_BOT_TOKEN,
        parseMode: env.TELEGRAM_PARSE_MODE,
        disableNotification: env.TELEGRAM_DISABLE_NOTIFICATION === 'true'
      })
    );
  }

  if (env.SIGNAL_GATEWAY_URL && env.SIGNAL_ACCOUNT) {
    providers.push(
      new SignalMessagingProvider({
        gatewayUrl: env.SIGNAL_GATEWAY_URL,
        account: env.SIGNAL_ACCOUNT,
        bearerToken: env.SIGNAL_BEARER_TOKEN
      })
    );
  }

  providers.push(new ConsoleMessagingProvider());
  return providers;
}

function safeCompareString(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function coerceWebhookBodyToRecord(body: unknown): Record<string, string> {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (typeof value === 'string') {
      output[key] = value;
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value.toString();
      continue;
    }

    if (Array.isArray(value)) {
      const [firstValue] = value;
      if (
        typeof firstValue === 'string' ||
        typeof firstValue === 'number' ||
        typeof firstValue === 'boolean'
      ) {
        output[key] = firstValue.toString();
      }
    }
  }

  return output;
}

export function computeTwilioSignature(
  authToken: string,
  requestUrl: string,
  requestBody: Record<string, string>
): string {
  const sortedEntries = Object.entries(requestBody).sort(([a], [b]) => a.localeCompare(b));
  let payload = requestUrl;
  for (const [key, value] of sortedEntries) {
    payload += key + value;
  }

  return createHmac('sha1', authToken).update(payload, 'utf8').digest('base64');
}

export function verifyTwilioSignature(input: {
  authToken: string;
  requestUrl: string;
  requestBody: Record<string, string>;
  signature?: string | null;
}): boolean {
  if (!input.signature) {
    return false;
  }
  const expected = computeTwilioSignature(input.authToken, input.requestUrl, input.requestBody);
  return safeCompareString(expected, input.signature);
}

export function verifyTelegramSecretToken(input: {
  expectedToken?: string;
  receivedToken?: string | null;
}): boolean {
  if (!input.expectedToken) {
    return true;
  }
  if (!input.receivedToken) {
    return false;
  }
  return safeCompareString(input.expectedToken, input.receivedToken);
}

export function verifySignalWebhookSecret(input: {
  expectedSecret?: string;
  receivedSecret?: string | null;
}): boolean {
  if (!input.expectedSecret) {
    return true;
  }
  if (!input.receivedSecret) {
    return false;
  }
  return safeCompareString(input.expectedSecret, input.receivedSecret);
}

export function normalizeTwilioInbound(body: Record<string, string>): NormalizedInboundMessage {
  const from = body.From ?? body.WaId ?? '';
  const to = body.To ?? '';
  const text = body.Body ?? '';

  if (!from || !text) {
    throw new Error('twilio_payload_invalid');
  }

  const channel: SupportedMessagingChannel =
    from.startsWith('whatsapp:') || to.startsWith('whatsapp:') ? 'WHATSAPP' : 'SMS';

  return {
    channel,
    from,
    text,
    externalMessageId: body.MessageSid ?? body.SmsSid,
    receivedAt: new Date().toISOString(),
    metadata: {
      to,
      fromCountry: body.FromCountry ?? '',
      accountSid: body.AccountSid ?? ''
    },
    raw: body
  };
}

interface TelegramUpdateEnvelope {
  update_id?: number;
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    caption?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string };
  };
  edited_message?: {
    message_id?: number;
    date?: number;
    text?: string;
    caption?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string };
  };
  channel_post?: {
    message_id?: number;
    date?: number;
    text?: string;
    caption?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string };
  };
}

export function normalizeTelegramInbound(update: TelegramUpdateEnvelope): NormalizedInboundMessage {
  const message = update.message ?? update.edited_message ?? update.channel_post;
  const text = message?.text ?? message?.caption ?? '';
  const from = message?.from?.id?.toString() ?? message?.chat?.id?.toString() ?? '';

  if (!from || !text) {
    throw new Error('telegram_payload_invalid');
  }

  return {
    channel: 'TELEGRAM',
    from,
    text,
    externalMessageId: message?.message_id?.toString(),
    receivedAt: message?.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
    metadata: {
      updateId: update.update_id ?? 0
    },
    raw: update
  };
}

interface SignalInboundEnvelope {
  envelope?: {
    source?: string;
    timestamp?: number;
    dataMessage?: {
      message?: string;
      groupInfo?: {
        groupId?: string;
      };
    };
  };
  source?: string;
  message?: string;
  timestamp?: number;
  event?: {
    source?: string;
    message?: string;
    timestamp?: number;
  };
}

export function normalizeSignalInbound(payload: SignalInboundEnvelope): NormalizedInboundMessage {
  const envelopeMessage = payload.envelope?.dataMessage?.message;
  const eventMessage = payload.event?.message;
  const text = envelopeMessage ?? eventMessage ?? payload.message ?? '';
  const from = payload.envelope?.source ?? payload.event?.source ?? payload.source ?? '';
  const timestamp = payload.envelope?.timestamp ?? payload.event?.timestamp ?? payload.timestamp;
  const groupId = payload.envelope?.dataMessage?.groupInfo?.groupId;

  if (!from || !text) {
    throw new Error('signal_payload_invalid');
  }

  return {
    channel: 'SIGNAL',
    from,
    text,
    externalMessageId: timestamp ? `signal-${timestamp}` : undefined,
    receivedAt: typeof timestamp === 'number' ? toIsoFromTimestampMaybeSeconds(timestamp) : new Date().toISOString(),
    metadata: {
      groupId: groupId ?? ''
    },
    raw: payload
  };
}
