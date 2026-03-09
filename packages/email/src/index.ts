export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EmailDeliveryReceipt {
  providerId: string;
  messageId: string;
  acceptedAt: string;
}

export interface EmailProvider {
  readonly id: string;
  send(message: EmailMessage): Promise<EmailDeliveryReceipt>;
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly id = 'console';

  async send(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    // Operationally useful in development and CI environments.
    console.log('[email]', JSON.stringify(message));
    return {
      providerId: this.id,
      messageId: `console_${Date.now()}`,
      acceptedAt: new Date().toISOString()
    };
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly id = 'resend';

  constructor(
    private readonly config: {
      apiKey: string;
      from: string;
      endpoint?: string;
    }
  ) {}

  async send(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    const response = await fetch(this.config.endpoint ?? 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: (message.tags ?? []).map((tag) => ({ name: 'campaign', value: tag })),
        headers: message.metadata ?? {}
      })
    });

    if (!response.ok) {
      throw new Error(`Resend email send failed (${response.status})`);
    }

    const payload = (await response.json()) as { id?: string };

    return {
      providerId: this.id,
      messageId: payload.id ?? `resend_${Date.now()}`,
      acceptedAt: new Date().toISOString()
    };
  }
}

export class FailoverEmailProvider implements EmailProvider {
  readonly id = 'failover';

  constructor(private readonly providers: EmailProvider[]) {}

  async send(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    let lastError: unknown = null;
    for (const provider of this.providers) {
      try {
        return await provider.send(message);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No email providers available');
  }
}

export type LifecycleTemplateId =
  | 'welcome'
  | 'waitlist_join'
  | 'abandoned_signup'
  | 'abandoned_case'
  | 'win_back'
  | 'upsell'
  | 'referral_invite'
  | 'launch_announcement';

export interface LifecycleTemplateInput {
  playerName?: string;
  storyTitle?: string;
  sessionUrl?: string;
  dashboardUrl?: string;
  referralCode?: string;
  offerCode?: string;
  countdownHours?: number;
}

export interface LifecycleTemplateRender {
  subject: string;
  html: string;
  tags: string[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shell(title: string, subtitle: string, body: string): string {
  return [
    '<!doctype html>',
    '<html lang="en"><body style="margin:0;background:#0b0f17;color:#f3eee5;font-family:Georgia,serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f17;padding:24px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;background:linear-gradient(150deg,#151d2b,#19131f);border:1px solid #38435d;">',
    '<tr><td style="padding:28px 32px 20px 32px;border-bottom:1px solid #2a3348;">',
    '<div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#cda766;">MyHorrorStory</div>',
    `<h1 style="margin:12px 0 6px 0;font-size:30px;line-height:1.15;color:#f3eee5;">${escapeHtml(title)}</h1>`,
    `<p style="margin:0;font-size:15px;color:#b8b0a2;">${escapeHtml(subtitle)}</p>`,
    '</td></tr>',
    `<tr><td style="padding:22px 32px 28px 32px;font-size:15px;line-height:1.6;color:#ddd5c8;">${body}</td></tr>`,
    '</table>',
    '</td></tr>',
    '</table>',
    '</body></html>'
  ].join('');
}

export function renderLifecycleTemplate(
  templateId: LifecycleTemplateId,
  input: LifecycleTemplateInput = {}
): LifecycleTemplateRender {
  const player = escapeHtml(input.playerName ?? 'Investigator');
  const story = escapeHtml(input.storyTitle ?? 'your active case');
  const sessionUrl = escapeHtml(input.sessionUrl ?? 'https://myhorrorstory.com/play');
  const dashboardUrl = escapeHtml(input.dashboardUrl ?? 'https://myhorrorstory.com/dashboard');
  const referralCode = escapeHtml(input.referralCode ?? 'NOIR10');
  const offerCode = escapeHtml(input.offerCode ?? 'NIGHTFALL20');
  const countdown = input.countdownHours ?? 12;

  switch (templateId) {
    case 'welcome':
      return {
        subject: 'Your case file is open',
        tags: ['welcome', 'lifecycle'],
        html: shell(
          'Welcome To The Investigation',
          'Your profile is live and your first files are unlocked.',
          `<p>${player}, your dashboard is now active. Start with <strong>${story}</strong> or invite your party.</p>
           <p><a href="${sessionUrl}" style="color:#edc37c;">Enter your case room</a></p>
           <p><a href="${dashboardUrl}" style="color:#edc37c;">Open dashboard</a></p>`
        )
      };
    case 'waitlist_join':
      return {
        subject: 'You are on the early access list',
        tags: ['join', 'waitlist'],
        html: shell(
          'Early Access Confirmed',
          'We will notify you when the next cinematic case drops.',
          `<p>${player}, your email is now enrolled for launch updates, case drops, and private previews.</p>
           <p>Watch for your first briefing dossier.</p>`
        )
      };
    case 'abandoned_signup':
      return {
        subject: 'You left one step unfinished',
        tags: ['abandoned_signup', 'lifecycle'],
        html: shell(
          'Complete Your Access',
          'Your investigation profile is waiting.',
          `<p>${player}, your signup was started but not completed.</p>
           <p>Resume now: <a href="${sessionUrl}" style="color:#edc37c;">Continue account setup</a></p>`
        )
      };
    case 'abandoned_case':
      return {
        subject: 'Your suspect board is still open',
        tags: ['abandoned_case', 'lifecycle'],
        html: shell(
          'Case Progress Suspended',
          'Evidence is degrading while the case is paused.',
          `<p>${player}, we preserved your last checkpoint in <strong>${story}</strong>.</p>
           <p><a href="${sessionUrl}" style="color:#edc37c;">Resume the case now</a></p>`
        )
      };
    case 'win_back':
      return {
        subject: 'One final transmission before we close your file',
        tags: ['win_back', 'retention'],
        html: shell(
          'Your File Can Be Reopened',
          'You have unfinished arcs and unlocked evidence waiting.',
          `<p>Return in the next 48 hours and recover your profile path.</p>
           <p><a href="${dashboardUrl}" style="color:#edc37c;">Reopen your dashboard</a></p>`
        )
      };
    case 'upsell':
      return {
        subject: `Premium dossier unlocked (${offerCode})`,
        tags: ['upsell', 'monetization'],
        html: shell(
          'Upgrade To Premium Cases',
          'Extended endings, director commentary, and bonus clue trails.',
          `<p>${player}, use code <strong>${offerCode}</strong> for this week&apos;s premium upgrade.</p>
           <p><a href="https://myhorrorstory.com/billing" style="color:#edc37c;">View plans</a></p>`
        )
      };
    case 'referral_invite':
      return {
        subject: 'Share your referral dossier',
        tags: ['referral', 'growth'],
        html: shell(
          'Invite Your Party',
          'Bring trusted investigators and unlock referral rewards.',
          `<p>Referral code: <strong>${referralCode}</strong></p>
           <p>Share code and unlock co-op exclusive clues.</p>`
        )
      };
    case 'launch_announcement':
      return {
        subject: `${story} launches in ${countdown}h`,
        tags: ['launch', 'campaign'],
        html: shell(
          'New Case Launch Alert',
          'A new case has entered briefing with full cross-channel support.',
          `<p><strong>${story}</strong> goes live in ${countdown} hours.</p>
           <p><a href="${sessionUrl}" style="color:#edc37c;">Reserve your slot</a></p>`
        )
      };
    default:
      return {
        subject: 'MyHorrorStory update',
        tags: ['lifecycle'],
        html: shell('Platform Update', 'Status update', '<p>New updates are available.</p>')
      };
  }
}

export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  async sendLifecycleEmail(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    return this.provider.send(message);
  }

  async sendTemplate(params: {
    to: string;
    templateId: LifecycleTemplateId;
    input?: LifecycleTemplateInput;
    metadata?: Record<string, string>;
  }): Promise<EmailDeliveryReceipt> {
    const rendered = renderLifecycleTemplate(params.templateId, params.input);
    return this.provider.send({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      tags: rendered.tags,
      metadata: params.metadata
    });
  }
}
