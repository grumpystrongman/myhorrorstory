import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AnalyticsService, InMemoryAnalyticsProvider } from '@myhorrorstory/analytics';
import { CrmService, InMemoryCrmProvider } from '@myhorrorstory/crm';
import {
  ConsoleEmailProvider,
  EmailService,
  FailoverEmailProvider,
  ResendEmailProvider,
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

const lifecycleCampaigns = growthCampaignSummarySchema
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

function campaignForEvent(eventType: LifecycleEventType): GrowthCampaignSummary {
  return (
    lifecycleCampaigns.find((campaign) => campaign.triggerEvent === eventType) ?? lifecycleCampaigns[0]!
  );
}

@Injectable()
export class GrowthService {
  private readonly analytics = new AnalyticsService(new InMemoryAnalyticsProvider());
  private readonly crm = new CrmService(new InMemoryCrmProvider());
  private readonly leadStore = new Map<string, GrowthLeadRecord>();
  private readonly emailService: EmailService;

  constructor() {
    const consoleProvider = new ConsoleEmailProvider();
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      const resendProvider = new ResendEmailProvider({
        apiKey: resendApiKey,
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'MyHorrorStory <briefing@myhorrorstory.com>'
      });
      this.emailService = new EmailService(
        new FailoverEmailProvider([resendProvider, consoleProvider])
      );
    } else {
      this.emailService = new EmailService(consoleProvider);
    }
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
    }

    const campaign = campaignForEvent(parsed.eventType);
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
    return lifecycleCampaigns;
  }
}
