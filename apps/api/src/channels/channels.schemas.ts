import { z } from 'zod';

export const setupMessagingChannelSchema = z.enum(['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL']);

export const setupContactSchema = z.object({
  channel: setupMessagingChannelSchema,
  address: z.string().min(2).max(160),
  optIn: z.boolean().default(true)
});

export const setupUserChannelsSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  contacts: z.array(setupContactSchema).min(1)
});

export const sendSetupTestSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  channels: z.array(setupMessagingChannelSchema).min(1).optional(),
  message: z.string().min(1).max(640).optional()
});

export const getUserChannelsQuerySchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1)
});

export const sendChannelMessageSchema = z.object({
  caseId: z.string().min(1),
  playerId: z.string().min(1),
  channels: z.array(setupMessagingChannelSchema).min(1).optional(),
  message: z.string().min(1).max(1600),
  mediaUrls: z.array(z.string().url()).max(4).optional()
});

export type SetupMessagingChannel = z.infer<typeof setupMessagingChannelSchema>;
export type SetupContact = z.infer<typeof setupContactSchema>;
export type SetupUserChannelsInput = z.infer<typeof setupUserChannelsSchema>;
export type SendSetupTestInput = z.infer<typeof sendSetupTestSchema>;
export type GetUserChannelsQuery = z.infer<typeof getUserChannelsQuerySchema>;
export type SendChannelMessageInput = z.infer<typeof sendChannelMessageSchema>;
