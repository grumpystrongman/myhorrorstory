export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  tags?: string[];
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    // Operationally useful in development and CI environments.
    console.log('[email]', JSON.stringify(message));
  }
}

export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  async sendLifecycleEmail(message: EmailMessage): Promise<void> {
    await this.provider.send(message);
  }
}
