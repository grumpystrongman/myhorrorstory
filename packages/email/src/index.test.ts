import { describe, expect, it, vi } from 'vitest';
import type { EmailProvider } from './index';
import { EmailService } from './index';

describe('email', () => {
  it('sends messages through provider', async () => {
    const send = vi.fn();
    const provider: EmailProvider = { send };
    const service = new EmailService(provider);

    await service.sendLifecycleEmail({
      to: 'player@example.com',
      subject: 'Welcome',
      html: '<p>Welcome</p>'
    });

    expect(send).toHaveBeenCalledTimes(1);
  });
});
