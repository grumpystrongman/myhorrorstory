import { lifecycleEventTypeSchema, planTierSchema, roleSchema } from '@myhorrorstory/contracts';
import { z } from 'zod';

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(80),
  password: z.string().min(12).max(128),
  roles: z.array(roleSchema).min(1).default(['PLAYER']),
  tier: planTierSchema.default('FREE')
});

export const adminUpdateUserSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  password: z.string().min(12).max(128).optional(),
  roles: z.array(roleSchema).min(1).optional(),
  tier: planTierSchema.optional()
});

export const adminSettingUpsertSchema = z.object({
  key: z.string().min(2).max(120),
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]),
  description: z.string().max(240).optional()
});

export const adminCreateCampaignSchema = z.object({
  label: z.string().min(2).max(120),
  triggerEvent: lifecycleEventTypeSchema,
  segment: z.string().min(1).max(120),
  sendDelayMinutes: z.number().int().min(0).max(60 * 24 * 14)
});

export const adminUpdateCampaignSchema = z.object({
  label: z.string().min(2).max(120).optional(),
  triggerEvent: lifecycleEventTypeSchema.optional(),
  segment: z.string().min(1).max(120).optional(),
  sendDelayMinutes: z.number().int().min(0).max(60 * 24 * 14).optional()
});

export const adminEmailCampaignSendSchema = z.object({
  eventType: lifecycleEventTypeSchema,
  emails: z.array(z.string().email()).min(1).max(250),
  storyId: z.string().min(1).max(120).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const adminCustomEmailCampaignSendSchema = z.object({
  campaignLabel: z.string().min(2).max(120),
  subject: z.string().min(2).max(200),
  html: z.string().min(10),
  text: z.string().max(5000).optional(),
  emails: z.array(z.string().email()).min(1).max(250),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const adminChannelBroadcastSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  channels: z.array(z.enum(['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL'])).min(1),
  message: z.string().min(1).max(1600),
  mediaUrls: z.array(z.string().url()).max(4).optional()
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminSettingUpsertInput = z.infer<typeof adminSettingUpsertSchema>;
export type AdminCreateCampaignInput = z.infer<typeof adminCreateCampaignSchema>;
export type AdminUpdateCampaignInput = z.infer<typeof adminUpdateCampaignSchema>;
export type AdminEmailCampaignSendInput = z.infer<typeof adminEmailCampaignSendSchema>;
export type AdminCustomEmailCampaignSendInput = z.infer<typeof adminCustomEmailCampaignSendSchema>;
export type AdminChannelBroadcastInput = z.infer<typeof adminChannelBroadcastSchema>;
