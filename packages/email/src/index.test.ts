import { describe, expect, it, vi } from 'vitest';
import type { EmailProvider } from './index';
import {
  ConsoleEmailProvider,
  EmailService,
  FailoverEmailProvider,
  renderLifecycleTemplate
} from './index';

describe('email', () => {
  it('sends messages through provider', async () => {
    const send = vi.fn().mockResolvedValue({
      providerId: 'mock',
      messageId: 'mock-1',
      acceptedAt: '2026-03-09T00:00:00.000Z'
    });
    const provider: EmailProvider = { id: 'mock', send };
    const service = new EmailService(provider);

    const receipt = await service.sendLifecycleEmail({
      to: 'player@example.com',
      subject: 'Welcome',
      html: '<p>Welcome</p>'
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(receipt.providerId).toBe('mock');
  });

  it('renders lifecycle templates with campaign tags', () => {
    const rendered = renderLifecycleTemplate('abandoned_case', {
      playerName: 'Mara',
      storyTitle: 'Static Between Stations',
      sessionUrl: 'https://example.com/play'
    });

    expect(rendered.subject).toContain('suspect board');
    expect(rendered.tags).toContain('abandoned_case');
    expect(rendered.html).toContain('Static Between Stations');
  });

  it('sends template emails through EmailService', async () => {
    const send = vi.fn().mockResolvedValue({
      providerId: 'mock',
      messageId: 'mock-2',
      acceptedAt: '2026-03-09T00:00:00.000Z'
    });
    const provider: EmailProvider = { id: 'mock', send };
    const service = new EmailService(provider);

    const receipt = await service.sendTemplate({
      to: 'lead@example.com',
      templateId: 'waitlist_join',
      input: { playerName: 'Lead' }
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(receipt.messageId).toBe('mock-2');
  });

  it('fails over to secondary provider', async () => {
    const primary: EmailProvider = {
      id: 'primary',
      send: vi.fn().mockRejectedValue(new Error('primary down'))
    };
    const secondary: EmailProvider = {
      id: 'secondary',
      send: vi.fn().mockResolvedValue({
        providerId: 'secondary',
        messageId: 'secondary-1',
        acceptedAt: '2026-03-09T00:00:00.000Z'
      })
    };

    const failover = new FailoverEmailProvider([primary, secondary]);
    const receipt = await failover.send({
      to: 'player@example.com',
      subject: 'Fallback test',
      html: '<p>Fallback</p>'
    });

    expect(receipt.providerId).toBe('secondary');
    expect(primary.send).toHaveBeenCalledTimes(1);
    expect(secondary.send).toHaveBeenCalledTimes(1);
  });

  it('console provider always returns a receipt', async () => {
    const provider = new ConsoleEmailProvider();
    const receipt = await provider.send({
      to: 'player@example.com',
      subject: 'Console',
      html: '<p>Console</p>'
    });

    expect(receipt.providerId).toBe('console');
    expect(receipt.messageId).toContain('console_');
  });
});
