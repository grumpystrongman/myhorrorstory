import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AnalyticsService, InMemoryAnalyticsProvider } from '@myhorrorstory/analytics';
import { CrmService, InMemoryCrmProvider } from '@myhorrorstory/crm';
import {
  ConsoleEmailProvider,
  type EmailDeliveryReceipt,
  EmailService,
  FailoverEmailProvider,
  ResendEmailProvider,
  SmtpEmailProvider,
  type LifecycleTemplateId
} from '@myhorrorstory/email';
import {
  growthCampaignSummarySchema,
  growthLeadCaptureRequestSchema,
  growthLeadCaptureResponseSchema,
  growthLeadRecordSchema,
  growthLifecycleEventRequestSchema,
  growthLifecycleEventResponseSchema,
  type GrowthCampaignSummary,
  type GrowthLeadCaptureResponse,
  type GrowthLeadRecord,
  type GrowthLifecycleEventResponse,
  type LifecycleEventType
} from '@myhorrorstory/contracts';
import { GrowthStore } from './growth.store.js';

const defaultLifecycleCampaigns = growthCampaignSummarySchema
  .array()
  .parse([
    {
      id: 'campaign-welcome',
      label: 'Welcome Sequence',
      triggerEvent: 'welcome',
      segment: 'new_signup',
      sendDelayMinutes: 0
    },
    {
      id: 'campaign-abandoned-signup',
      label: 'Abandoned Signup Rescue',
      triggerEvent: 'abandoned_signup',
      segment: 'abandoned_signup',
      sendDelayMinutes: 30
    },
    {
      id: 'campaign-abandoned-case',
      label: 'Abandoned Case Re-engagement',
      triggerEvent: 'abandoned_case',
      segment: 'abandoned_case',
      sendDelayMinutes: 45
    },
    {
      id: 'campaign-win-back',
      label: 'Win-back Sequence',
      triggerEvent: 'win_back',
      segment: 'dormant_players',
      sendDelayMinutes: 120
    },
    {
      id: 'campaign-upsell',
      label: 'Premium Upsell',
      triggerEvent: 'upsell',
      segment: 'trial_or_standard',
      sendDelayMinutes: 15
    },
    {
      id: 'campaign-referral',
      label: 'Referral Prompt',
      triggerEvent: 'referral_invite',
      segment: 'active_players',
      sendDelayMinutes: 10
    },
    {
      id: 'campaign-launch',
      label: 'Launch Announcement',
      triggerEvent: 'launch_announcement',
      segment: 'all_marketing_subscribers',
      sendDelayMinutes: 0
    }
  ]);

const templateByEvent: Record<LifecycleEventType, LifecycleTemplateId> = {
  welcome: 'welcome',
  abandoned_signup: 'abandoned_signup',
  abandoned_case: 'abandoned_case',
  win_back: 'win_back',
  upsell: 'upsell',
  referral_invite: 'referral_invite',
  launch_announcement: 'launch_announcement'
};

function isConfiguredCredential(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !(
    normalized.startsWith('replace') ||
    normalized.startsWith('your_') ||
    normalized.includes('replace') ||
    normalized.includes('changeme') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  );
}

@Injectable()
export class GrowthService {
  private readonly analytics = new AnalyticsService(new InMemoryAnalyticsProvider());
  private readonly crm = new CrmService(new InMemoryCrmProvider());
  private readonly leadStore = new Map<string, GrowthLeadRecord>();
  private readonly growthStore = new GrowthStore();
  private readonly campaignStore = new Map<string, GrowthCampaignSummary>(
    defaultLifecycleCampaigns.map((campaign) => [campaign.id, campaign])
  );
  private readonly emailService: EmailService;
  private readonly emailProviderId: 'console' | 'resend' | 'smtp' | 'failover';

  constructor() {
    const consoleProvider = new ConsoleEmailProvider();
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPortRaw = process.env.SMTP_PORT?.trim();
    const smtpFrom = process.env.SMTP_FROM_EMAIL?.trim();
    const smtpPort = smtpPortRaw ? Number(smtpPortRaw) : undefined;
    const smtpConfigured =
      isConfiguredCredential(smtpHost) &&
      smtpPort !== undefined &&
      Number.isFinite(smtpPort) &&
      smtpPort > 0 &&
      isConfiguredCredential(smtpFrom);
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendConfigured = isConfiguredCredential(resendApiKey);

    if (smtpConfigured) {
      const smtpProvider = new SmtpEmailProvider({
        host: smtpHost!,
        port: smtpPort!,
        from: smtpFrom!,
        secure: process.env.SMTP_SECURE?.trim().toLowerCase() === 'true',
        user: process.env.SMTP_USER?.trim() || undefined,
        pass: process.env.SMTP_PASS?.trim() || undefined,
        rejectUnauthorized:
          process.env.SMTP_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== 'false'
      });
      this.emailService = new EmailService(
        resendConfigured
          ? new FailoverEmailProvider([
              smtpProvider,
              new ResendEmailProvider({
                apiKey: resendApiKey!,
                from:
                  process.env.RESEND_FROM_EMAIL?.trim() || 'MyHorrorStory <briefing@myhorrorstory.com>'
              }),
              consoleProvider
            ])
          : new FailoverEmailProvider([smtpProvider, consoleProvider])
      );
      this.emailProviderId = 'smtp';
    } else if (resendConfigured) {
      const resendProvider = new ResendEmailProvider({
        apiKey: resendApiKey!,
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'MyHorrorStory <briefing@myhorrorstory.com>'
      });
      this.emailService = new EmailService(
        new FailoverEmailProvider([resendProvider, consoleProvider])
      );
      this.emailProviderId = 'resend';
    } else {
      this.emailService = new EmailService(consoleProvider);
      this.emailProviderId = 'console';
    }

    const persisted = this.growthStore.load();
    for (const campaign of persisted.campaigns) {
      this.campaignStore.set(campaign.id, campaign);
    }
    for (const lead of persisted.leads) {
      this.leadStore.set(lead.email, lead);
    }
  }

  getEmailProviderStatus(): {
    provider: 'console' | 'resend' | 'smtp' | 'failover';
    smtpConfigured: boolean;
    resendConfigured: boolean;
  } {
    return {
      provider: this.emailProviderId,
      smtpConfigured:
        isConfiguredCredential(process.env.SMTP_HOST?.trim()) &&
        isConfiguredCredential(process.env.SMTP_FROM_EMAIL?.trim()) &&
        Number.isFinite(Number(process.env.SMTP_PORT?.trim() ?? '')),
      resendConfigured: isConfiguredCredential(process.env.RESEND_API_KEY?.trim())
    };
  }

  async captureLead(input: unknown): Promise<GrowthLeadCaptureResponse> {
    const parsed = growthLeadCaptureRequestSchema.parse(input);
    const now = new Date().toISOString();
    const existing = this.leadStore.get(parsed.email);
    const lead: GrowthLeadRecord = growthLeadRecordSchema.parse({
      id: existing?.id ?? randomUUID(),
      email: parsed.email,
      source: parsed.source,
      firstName: parsed.firstName ?? existing?.firstName ?? null,
      lastName: parsed.lastName ?? existing?.lastName ?? null,
      marketingConsent: parsed.marketingConsent,
      tags: Array.from(new Set([...(existing?.tags ?? []), ...parsed.tags])),
      locale: parsed.locale ?? existing?.locale ?? null,
      country: parsed.country ?? existing?.country ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastLifecycleEvent: existing?.lastLifecycleEvent ?? null
    });

    this.leadStore.set(lead.email, lead);
    this.persistGrowthData();

    await this.crm.syncLead({
      email: parsed.email,
      traits: {
        source: parsed.source,
        marketingConsent: parsed.marketingConsent,
        firstName: parsed.firstName ?? '',
        lastName: parsed.lastName ?? '',
        locale: parsed.locale ?? '',
        country: parsed.country ?? '',
        capturedAt: now
      }
    });
    await this.crm.addToSegment(parsed.email, 'new_lead');

    await this.analytics.track({
      event: 'lead_captured',
      properties: { source: parsed.source, marketingConsent: parsed.marketingConsent },
      occurredAt: now,
      anonymousId: parsed.email
    });

    let lifecycleEmailQueued = false;
    if (parsed.marketingConsent) {
      await this.emailService.sendTemplate({
        to: parsed.email,
        templateId: 'waitlist_join',
        input: {
          playerName: parsed.firstName
        },
        metadata: {
          source: parsed.source,
          campaign: 'waitlist_join'
        }
      });
      lifecycleEmailQueued = true;
    }

    return growthLeadCaptureResponseSchema.parse({
      accepted: true,
      lifecycleEmailQueued,
      leadId: lead.id,
      segment: 'new_lead'
    });
  }

  async triggerLifecycleEvent(input: unknown): Promise<GrowthLifecycleEventResponse> {
    const parsed = growthLifecycleEventRequestSchema.parse(input);
    const now = new Date().toISOString();
    const existing = this.leadStore.get(parsed.email);

    if (existing) {
      this.leadStore.set(parsed.email, {
        ...existing,
        updatedAt: now,
        lastLifecycleEvent: parsed.eventType
      });
      this.persistGrowthData();
    }

    const campaign = this.campaignForEvent(parsed.eventType);
    const templateId = templateByEvent[parsed.eventType];

    await this.crm.syncLead({
      email: parsed.email,
      traits: {
        lastLifecycleEvent: parsed.eventType,
        storyId: parsed.storyId ?? '',
        updatedAt: now
      }
    });
    await this.crm.addToSegment(parsed.email, campaign.segment);

    await this.analytics.track({
      event: `lifecycle_${parsed.eventType}`,
      properties: {
        campaignId: campaign.id,
        storyId: parsed.storyId ?? null
      },
      occurredAt: now,
      anonymousId: parsed.email
    });

    await this.emailService.sendTemplate({
      to: parsed.email,
      templateId,
      input: {
        playerName: typeof parsed.metadata.playerName === 'string' ? parsed.metadata.playerName : undefined,
        storyTitle: parsed.storyId,
        sessionUrl:
          typeof parsed.metadata.sessionUrl === 'string'
            ? parsed.metadata.sessionUrl
            : 'https://myhorrorstory.com/play',
        dashboardUrl:
          typeof parsed.metadata.dashboardUrl === 'string'
            ? parsed.metadata.dashboardUrl
            : 'https://myhorrorstory.com/dashboard',
        referralCode:
          typeof parsed.metadata.referralCode === 'string'
            ? parsed.metadata.referralCode
            : 'NIGHTCIRCLE',
        offerCode: typeof parsed.metadata.offerCode === 'string' ? parsed.metadata.offerCode : 'NIGHTFALL20',
        countdownHours:
          typeof parsed.metadata.countdownHours === 'number'
            ? parsed.metadata.countdownHours
            : undefined
      },
      metadata: {
        campaignId: campaign.id,
        eventType: parsed.eventType
      }
    });

    return growthLifecycleEventResponseSchema.parse({
      accepted: true,
      eventType: parsed.eventType,
      campaignId: campaign.id,
      emailQueued: true
    });
  }

  listLeads(): GrowthLeadRecord[] {
    return [...this.leadStore.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  listCampaigns(): GrowthCampaignSummary[] {
    return [...this.campaignStore.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  createCampaign(input: {
    label: string;
    triggerEvent: LifecycleEventType;
    segment: string;
    sendDelayMinutes: number;
  }): GrowthCampaignSummary {
    const campaign = growthCampaignSummarySchema.parse({
      id: `campaign-${randomUUID().slice(0, 8)}`,
      label: input.label,
      triggerEvent: input.triggerEvent,
      segment: input.segment,
      sendDelayMinutes: input.sendDelayMinutes
    });
    this.campaignStore.set(campaign.id, campaign);
    this.persistGrowthData();
    return campaign;
  }

  updateCampaign(
    campaignId: string,
    input: Partial<{
      label: string;
      triggerEvent: LifecycleEventType;
      segment: string;
      sendDelayMinutes: number;
    }>
  ): GrowthCampaignSummary {
    const existing = this.campaignStore.get(campaignId);
    if (!existing) {
      throw new Error('campaign_not_found');
    }

    const updated = growthCampaignSummarySchema.parse({
      id: existing.id,
      label: input.label ?? existing.label,
      triggerEvent: input.triggerEvent ?? existing.triggerEvent,
      segment: input.segment ?? existing.segment,
      sendDelayMinutes: input.sendDelayMinutes ?? existing.sendDelayMinutes
    });
    this.campaignStore.set(campaignId, updated);
    this.persistGrowthData();
    return updated;
  }

  deleteCampaign(campaignId: string): { deleted: true; campaignId: string } {
    const removed = this.campaignStore.delete(campaignId);
    if (!removed) {
      throw new Error('campaign_not_found');
    }
    this.persistGrowthData();
    return { deleted: true, campaignId };
  }

  async sendCustomCampaign(input: {
    campaignLabel: string;
    subject: string;
    html: string;
    text?: string;
    emails: string[];
    tags?: string[];
    metadata?: Record<string, string | number | boolean>;
  }): Promise<{
    campaignLabel: string;
    attempted: number;
    sent: number;
    receipts: EmailDeliveryReceipt[];
    failed: Array<{ email: string; reason: string }>;
  }> {
    const metadata = Object.fromEntries(
      Object.entries(input.metadata ?? {}).map(([key, value]) => [key, String(value)])
    );

    const receipts: EmailDeliveryReceipt[] = [];
    const failed: Array<{ email: string; reason: string }> = [];
    for (const email of input.emails) {
      try {
        const receipt = await this.emailService.sendLifecycleEmail({
          to: email,
          subject: input.subject,
          html: input.html,
          text: input.text,
          tags: input.tags,
          metadata: {
            campaignLabel: input.campaignLabel,
            ...metadata
          }
        });
        receipts.push(receipt);
      } catch (error) {
        failed.push({
          email,
          reason: error instanceof Error ? error.message : 'send_failed'
        });
      }
    }

    return {
      campaignLabel: input.campaignLabel,
      attempted: input.emails.length,
      sent: receipts.length,
      receipts,
      failed
    };
  }

  private campaignForEvent(eventType: LifecycleEventType): GrowthCampaignSummary {
    const match = [...this.campaignStore.values()].find((campaign) => campaign.triggerEvent === eventType);
    if (match) {
      return match;
    }
    return [...this.campaignStore.values()][0] ?? defaultLifecycleCampaigns[0]!;
  }

  private persistGrowthData(): void {
    this.growthStore.save({
      campaigns: [...this.campaignStore.values()],
      leads: [...this.leadStore.values()]
    });
  }
}
