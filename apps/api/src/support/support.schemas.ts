import { z } from 'zod';

export const supportChatRoleSchema = z.enum(['system', 'user', 'assistant']);
export const supportChatModeSchema = z.enum(['support', 'game_guide', 'story_director']);

export const supportChatMessageSchema = z.object({
  role: supportChatRoleSchema,
  content: z.string().min(1).max(4000)
});

export const supportChatInputSchema = z.object({
  sessionId: z.string().min(1).max(120).optional(),
  mode: supportChatModeSchema.default('support'),
  storyId: z.string().min(1).max(120).optional(),
  playerStateSummary: z.string().min(1).max(4000).optional(),
  messages: z.array(supportChatMessageSchema).min(1).max(24)
});

export type SupportChatInput = z.infer<typeof supportChatInputSchema>;
export type SupportChatMessage = z.infer<typeof supportChatMessageSchema>;
