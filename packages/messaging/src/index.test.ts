import { describe, expect, it } from 'vitest';
import {
  coerceWebhookBodyToRecord,
  computeTwilioSignature,
  MessagingRouter,
  normalizeSignalInbound,
  normalizeTelegramInbound,
  normalizeTwilioInbound,
  verifySignalWebhookSecret,
  verifyTelegramSecretToken,
  verifyTwilioSignature,
  type DeliveryReceipt,
  type MessagingPayload,
  type MessagingProvider
} from './index';

class StubProvider implements MessagingProvider {
  constructor(
    readonly id: string,
    private readonly channels: Set<'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL'>,
    private readonly fail = false
  ) {}

  supports(channel: 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL'): boolean {
    return this.channels.has(channel);
  }

  async send(payload: MessagingPayload): Promise<DeliveryReceipt> {
    if (this.fail) {
      throw new Error(`${this.id}_failed`);
    }

    return {
      provider: this.id,
      channel: payload.channel,
      to: payload.to,
      externalMessageId: `${this.id}-${payload.channel.toLowerCase()}-1`,
      acceptedAt: new Date().toISOString()
    };
  }
}

describe('messaging router', () => {
  it('uses first working provider for supported channel', async () => {
    const router = new MessagingRouter([
      new StubProvider('p1', new Set(['SMS']), true),
      new StubProvider('p2', new Set(['SMS']))
    ]);

    const receipt = await router.send({
      channel: 'SMS',
      to: '+15551234567',
      text: 'Test'
    });

    expect(receipt.provider).toBe('p2');
  });
});

describe('webhook normalization', () => {
  it('normalizes twilio sms payload', () => {
    const normalized = normalizeTwilioInbound({
      From: '+15550001111',
      To: '+15550002222',
      Body: 'I accuse the broker.',
      MessageSid: 'SM123'
    });

    expect(normalized.channel).toBe('SMS');
    expect(normalized.from).toBe('+15550001111');
    expect(normalized.text).toContain('accuse');
  });

  it('normalizes twilio whatsapp payload', () => {
    const normalized = normalizeTwilioInbound({
      From: 'whatsapp:+15550001111',
      To: 'whatsapp:+15550002222',
      Body: 'The lockbox is open.',
      MessageSid: 'SM999'
    });

    expect(normalized.channel).toBe('WHATSAPP');
    expect(normalized.from).toContain('whatsapp:');
  });

  it('normalizes telegram payload', () => {
    const normalized = normalizeTelegramInbound({
      update_id: 42,
      message: {
        message_id: 9,
        date: 1710000000,
        text: 'Do not trust Eli.',
        chat: { id: 123 },
        from: { id: 123 }
      }
    });

    expect(normalized.channel).toBe('TELEGRAM');
    expect(normalized.from).toBe('123');
    expect(normalized.text).toContain('Eli');
  });

  it('normalizes signal payload', () => {
    const normalized = normalizeSignalInbound({
      envelope: {
        source: '+15550009999',
        timestamp: 1710000100,
        dataMessage: {
          message: 'The tunnel lock is false.'
        }
      }
    });

    expect(normalized.channel).toBe('SIGNAL');
    expect(normalized.from).toBe('+15550009999');
    expect(normalized.text).toContain('tunnel');
  });
});

describe('signature verification', () => {
  it('verifies twilio signature', () => {
    const requestUrl = 'https://example.com/api/v1/webhooks/twilio';
    const requestBody = {
      Body: 'hello',
      From: '+15550001111',
      To: '+15550002222'
    };
    const authToken = 'token';
    const signature = computeTwilioSignature(authToken, requestUrl, requestBody);

    expect(
      verifyTwilioSignature({
        authToken,
        requestUrl,
        requestBody,
        signature
      })
    ).toBe(true);
  });

  it('verifies telegram secret token', () => {
    expect(
      verifyTelegramSecretToken({
        expectedToken: 'secret',
        receivedToken: 'secret'
      })
    ).toBe(true);
    expect(
      verifyTelegramSecretToken({
        expectedToken: 'secret',
        receivedToken: 'wrong'
      })
    ).toBe(false);
  });

  it('verifies signal webhook secret', () => {
    expect(
      verifySignalWebhookSecret({
        expectedSecret: 'signal-secret',
        receivedSecret: 'signal-secret'
      })
    ).toBe(true);
    expect(
      verifySignalWebhookSecret({
        expectedSecret: 'signal-secret',
        receivedSecret: 'wrong-secret'
      })
    ).toBe(false);
  });
});

describe('coerceWebhookBodyToRecord', () => {
  it('coerces primitive values', () => {
    const body = coerceWebhookBodyToRecord({
      body: 'alpha',
      count: 3,
      ok: true,
      first: ['beta', 'gamma']
    });

    expect(body.body).toBe('alpha');
    expect(body.count).toBe('3');
    expect(body.ok).toBe('true');
    expect(body.first).toBe('beta');
  });
});
