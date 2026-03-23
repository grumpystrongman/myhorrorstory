import { NextResponse } from 'next/server';
import { generateStoryHint, type HintLevel } from '../../../server/hint-assistant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HintRequestBody {
  level?: HintLevel;
  story?: {
    id?: string;
    title?: string;
    hook?: string;
    tone?: string;
    location?: string;
  };
  beat?: {
    id?: string;
    title?: string;
    stage?: number;
    narrative?: string;
    revealClueIds?: string[];
    responseOptions?: Array<{
      id?: string;
      label?: string;
      summary?: string;
      intent?: string;
      progressDelta?: number;
      reputationDelta?: {
        trustworthiness?: number;
        aggression?: number;
        curiosity?: number;
        deception?: number;
        morality?: number;
      };
    }>;
    incomingMessages?: Array<{
      senderName?: string;
      channel?: string;
      role?: string;
      text?: string;
    }>;
  };
  mission?: {
    objective?: string;
    primaryQuestion?: string;
    operationWindow?: string;
  };
  campaign?: {
    day?: number;
    targetDays?: number;
    maxDays?: number;
  };
  player?: {
    progress?: number;
    hintUses?: number;
    villainAdvantage?: number;
    reputation?: {
      trustworthiness?: number;
      aggression?: number;
      curiosity?: number;
      deception?: number;
      morality?: number;
    };
  };
  objectives?: Array<{
    label?: string;
    complete?: boolean;
  }>;
  answerKeys?: {
    audioCipherCode?: string;
    puzzleSolution?: string;
    recommendedOptionId?: string;
    recommendedOptionLabel?: string;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function POST(request: Request): Promise<Response> {
  let body: HintRequestBody;
  try {
    body = (await request.json()) as HintRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const level = body.level;
  if (!level || !['approach', 'thinking', 'solve'].includes(level)) {
    return NextResponse.json({ error: 'level must be one of: approach, thinking, solve' }, { status: 400 });
  }

  const beat = body.beat;
  if (!beat?.id || !beat.title) {
    return NextResponse.json({ error: 'beat.id and beat.title are required' }, { status: 400 });
  }

  const hint = await generateStoryHint({
    level,
    story: {
      id: body.story?.id ?? 'unknown-story',
      title: body.story?.title ?? 'Unknown Story',
      hook: body.story?.hook ?? '',
      tone: body.story?.tone ?? 'cinematic',
      location: body.story?.location ?? 'unknown location'
    },
    beat: {
      id: beat.id,
      title: beat.title,
      stage: clamp(Number(beat.stage ?? 1), 1, 4),
      narrative: beat.narrative ?? '',
      revealClueIds: Array.isArray(beat.revealClueIds) ? beat.revealClueIds.slice(0, 8) : [],
      responseOptions: (Array.isArray(beat.responseOptions) ? beat.responseOptions : []).map((option) => ({
        id: option.id ?? 'unknown-option',
        label: option.label ?? 'Unnamed Option',
        summary: option.summary ?? '',
        intent: option.intent ?? 'QUESTION',
        progressDelta: Number(option.progressDelta ?? 0),
        reputationDelta: {
          trustworthiness: Number(option.reputationDelta?.trustworthiness ?? 0),
          aggression: Number(option.reputationDelta?.aggression ?? 0),
          curiosity: Number(option.reputationDelta?.curiosity ?? 0),
          deception: Number(option.reputationDelta?.deception ?? 0),
          morality: Number(option.reputationDelta?.morality ?? 0)
        }
      })),
      incomingMessages: (Array.isArray(beat.incomingMessages) ? beat.incomingMessages : []).map((message) => ({
        senderName: message.senderName ?? 'Unknown Sender',
        channel: message.channel ?? 'SMS',
        role: message.role ?? 'operator',
        text: message.text ?? ''
      }))
    },
    mission: {
      objective: body.mission?.objective ?? '',
      primaryQuestion: body.mission?.primaryQuestion ?? '',
      operationWindow: body.mission?.operationWindow ?? ''
    },
    campaign: {
      day: clamp(Number(body.campaign?.day ?? 1), 1, 60),
      targetDays: clamp(Number(body.campaign?.targetDays ?? 28), 1, 60),
      maxDays: clamp(Number(body.campaign?.maxDays ?? 45), 1, 60)
    },
    player: {
      progress: clamp(Number(body.player?.progress ?? 0), 0, 100),
      hintUses: clamp(Number(body.player?.hintUses ?? 0), 0, 99),
      villainAdvantage: clamp(Number(body.player?.villainAdvantage ?? 0), 0, 100),
      reputation: {
        trustworthiness: Number(body.player?.reputation?.trustworthiness ?? 0),
        aggression: Number(body.player?.reputation?.aggression ?? 0),
        curiosity: Number(body.player?.reputation?.curiosity ?? 0),
        deception: Number(body.player?.reputation?.deception ?? 0),
        morality: Number(body.player?.reputation?.morality ?? 0)
      }
    },
    objectives: (Array.isArray(body.objectives) ? body.objectives : []).map((objective) => ({
      label: objective.label ?? 'Objective',
      complete: Boolean(objective.complete)
    })),
    answerKeys: body.answerKeys
  });

  return NextResponse.json(hint);
}
