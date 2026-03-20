import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupportChatInput, SupportChatMessage } from './support.schemas.js';

export interface SupportTicket {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
}

export interface SupportChatResponse {
  sessionId: string;
  provider: 'ollama' | 'fallback';
  model: string;
  reply: string;
  guidance: string[];
  generatedAt: string;
}

@Injectable()
export class SupportService {
  private readonly tickets: SupportTicket[] = [];
  private readonly fallbackModel = 'deterministic-support-fallback-v1';

  create(input: { email: string; subject: string; message: string }): SupportTicket {
    const ticket: SupportTicket = {
      id: randomUUID(),
      email: input.email,
      subject: input.subject,
      message: input.message,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    this.tickets.push(ticket);
    return ticket;
  }

  list(): SupportTicket[] {
    return this.tickets;
  }

  async chat(input: SupportChatInput): Promise<SupportChatResponse> {
    const sessionId = input.sessionId ?? randomUUID();
    const generatedAt = new Date().toISOString();
    const guidance = this.buildGuidance(input);

    try {
      if (this.localModelEnabled()) {
        const reply = await this.queryLocalModel(input);
        if (reply.trim().length > 0) {
          return {
            sessionId,
            provider: 'ollama',
            model: this.localModelName(),
            reply,
            guidance,
            generatedAt
          };
        }
      }
    } catch {
      // Local model failed; deterministic fallback response is returned below.
    }

    return {
      sessionId,
      provider: 'fallback',
      model: this.fallbackModel,
      reply: this.buildFallbackReply(input),
      guidance,
      generatedAt
    };
  }

  private localModelEnabled(): boolean {
    return process.env.LOCAL_LLM_ENABLED !== 'false';
  }

  private localModelBaseUrl(): string {
    return (process.env.LOCAL_LLM_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  }

  private localModelName(): string {
    return process.env.LOCAL_LLM_MODEL ?? 'llama3.1:8b-instruct-q4_K_M';
  }

  private buildGuidance(input: SupportChatInput): string[] {
    const guidance = [
      'Confirm the player objective before escalating intensity.',
      'Offer one tactical next step and one safety-conscious alternative.',
      'Keep responses short enough for in-game channel delivery.'
    ];

    if (input.storyId) {
      guidance.push(`Anchor clues and recommendations to story "${input.storyId}".`);
    }

    if (input.mode === 'story_director') {
      guidance.push('Prioritize tension pacing, branch consequence clarity, and replayable hooks.');
    }

    return guidance;
  }

  private buildSystemPrompt(input: SupportChatInput): string {
    const modeDirective =
      input.mode === 'game_guide'
        ? 'Act as an in-universe game guide for horror investigation gameplay.'
        : input.mode === 'story_director'
          ? 'Act as a horror narrative director optimizing pacing, clues, and emotional escalation.'
          : 'Act as a commercial support specialist for MyHorrorStory players.';

    const storyContext = input.storyId ? `Story context: ${input.storyId}.` : '';
    const playerState = input.playerStateSummary ? `Player state: ${input.playerStateSummary}` : '';

    return [
      modeDirective,
      storyContext,
      playerState,
      'Tone: precise, unsettling, supportive.',
      'Always provide actionable next steps; avoid vague advice.'
    ]
      .filter((line) => line.length > 0)
      .join('\n');
  }

  private async queryLocalModel(input: SupportChatInput): Promise<string> {
    const endpoint = `${this.localModelBaseUrl()}/api/chat`;
    const payloadMessages: Array<{ role: SupportChatMessage['role']; content: string }> = [
      {
        role: 'system',
        content: this.buildSystemPrompt(input)
      },
      ...input.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.localModelName(),
        stream: false,
        options: {
          temperature: 0.65
        },
        messages: payloadMessages
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      throw new Error(`local_llm_http_${response.status}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };

    return (data.message?.content ?? data.response ?? '').trim();
  }

  private buildFallbackReply(input: SupportChatInput): string {
    const latestUserMessage =
      [...input.messages].reverse().find((message) => message.role === 'user')?.content ??
      'No user message provided.';

    return [
      `Understood. You asked: "${latestUserMessage}"`,
      'Immediate move: collect one hard clue and validate it through a second channel before acting.',
      'Branch-safe move: avoid locking an ending until investigation progress is above 80%.',
      'If this is urgent support, route to /support/tickets with exact timestamps and channel IDs.'
    ].join('\n');
  }
}
