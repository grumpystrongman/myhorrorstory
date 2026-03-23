export type HintLevel = 'approach' | 'thinking' | 'solve';

interface HintResponseOptionInput {
  id: string;
  label: string;
  summary: string;
  intent: string;
  progressDelta: number;
  reputationDelta: {
    trustworthiness: number;
    aggression: number;
    curiosity: number;
    deception: number;
    morality: number;
  };
}

interface HintContextInput {
  level: HintLevel;
  story: {
    id: string;
    title: string;
    hook: string;
    tone: string;
    location: string;
  };
  beat: {
    id: string;
    title: string;
    stage: number;
    narrative: string;
    revealClueIds: string[];
    responseOptions: HintResponseOptionInput[];
    incomingMessages: Array<{
      senderName: string;
      channel: string;
      role: string;
      text: string;
    }>;
  };
  mission: {
    objective: string;
    primaryQuestion: string;
    operationWindow: string;
  };
  campaign: {
    day: number;
    targetDays: number;
    maxDays: number;
  };
  player: {
    progress: number;
    hintUses: number;
    villainAdvantage: number;
    reputation: {
      trustworthiness: number;
      aggression: number;
      curiosity: number;
      deception: number;
      morality: number;
    };
  };
  objectives: Array<{
    label: string;
    complete: boolean;
  }>;
  answerKeys?: {
    audioCipherCode?: string;
    puzzleSolution?: string;
    recommendedOptionId?: string;
    recommendedOptionLabel?: string;
  };
}

export interface GeneratedHint {
  level: HintLevel;
  headline: string;
  howToThink: string;
  howToApproach: string;
  howToSolve: string;
  suggestedOptionId?: string;
  suggestedOptionLabel?: string;
  directAnswer?: string;
  caution: string;
  penalty: {
    usageCount: number;
    severity: 'low' | 'medium' | 'high';
    progressGain: number;
    dayAdvance: number;
    dangerGain: number;
    villainGain: number;
    advantageGain: number;
    trustPenalty: number;
    moralityPenalty: number;
    deceptionGain: number;
  };
  source: 'openai' | 'fallback';
}

function clip(value: string, limit = 340): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1)}...`;
}

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

function scoreOption(option: HintResponseOptionInput): number {
  return (
    option.reputationDelta.trustworthiness +
    option.reputationDelta.curiosity +
    option.reputationDelta.morality -
    option.reputationDelta.aggression -
    option.reputationDelta.deception +
    option.progressDelta * 0.4
  );
}

function pickSuggestedOption(options: HintResponseOptionInput[]): HintResponseOptionInput | null {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  let best = options[0] ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const option of options) {
    const current = scoreOption(option);
    if (current > bestScore) {
      bestScore = current;
      best = option;
    }
  }
  return best;
}

function buildHintPenalty(level: HintLevel, usageCount: number): GeneratedHint['penalty'] {
  const usageMultiplier = Math.max(1, Math.floor(usageCount / 2));

  if (level === 'approach') {
    return {
      usageCount,
      severity: usageCount >= 4 ? 'medium' : 'low',
      progressGain: 1,
      dayAdvance: 1,
      dangerGain: 2 + usageMultiplier,
      villainGain: 2 + usageMultiplier,
      advantageGain: 4 + usageCount * 2,
      trustPenalty: 1,
      moralityPenalty: 1,
      deceptionGain: 1
    };
  }

  if (level === 'thinking') {
    return {
      usageCount,
      severity: usageCount >= 3 ? 'high' : 'medium',
      progressGain: 2,
      dayAdvance: 1,
      dangerGain: 3 + usageMultiplier,
      villainGain: 4 + usageMultiplier,
      advantageGain: 7 + usageCount * 2,
      trustPenalty: 2,
      moralityPenalty: 2,
      deceptionGain: 2
    };
  }

  return {
    usageCount,
    severity: 'high',
    progressGain: 3,
    dayAdvance: 2,
    dangerGain: 5 + usageMultiplier,
    villainGain: 6 + usageMultiplier,
    advantageGain: 11 + usageCount * 3,
    trustPenalty: 3,
    moralityPenalty: 3,
    deceptionGain: 3
  };
}

function buildFallbackHint(input: HintContextInput): GeneratedHint {
  const suggested = pickSuggestedOption(input.beat.responseOptions);
  const clueAnchor =
    input.beat.revealClueIds[0]?.replace(/^[^-]+-[^-]+-/, '').replaceAll('-', ' ') || 'active clue thread';
  const unresolved = input.objectives.filter((objective) => !objective.complete).map((objective) => objective.label);
  const unresolvedText = unresolved.length > 0 ? unresolved.join('; ') : 'No unresolved objectives remain.';
  const nextUsageCount = input.player.hintUses + 1;
  const penalty = buildHintPenalty(input.level, nextUsageCount);

  const base: GeneratedHint = {
    level: input.level,
    headline: `Hint - ${input.story.title} - ${input.beat.title}`,
    howToThink: clip(
      `Treat this beat as contradiction management, not a guessing game. Anchor on ${clueAnchor}, then test each message against motive, method, and timeline consistency. Prioritize objective alignment: ${unresolvedText}`
    ),
    howToApproach: clip(
      `First, review the artifact prompts tied to this beat. Second, execute one field action that validates chronology. Third, choose the response option that keeps witness trust and admissible evidence highest under pressure.`
    ),
    howToSolve: clip(
      suggested
        ? `Best current branch response: "${suggested.label}". It provides the strongest combined trust/morality/clarity profile while still advancing progress.`
        : `No explicit branch options are available for this beat. Continue by completing an unresolved objective and advancing the timeline.`
    ),
    suggestedOptionId: suggested?.id,
    suggestedOptionLabel: suggested?.label,
    directAnswer:
      input.level === 'solve'
        ? clip(
            [
              suggested ? `Choose response: "${suggested.label}".` : '',
              input.answerKeys?.audioCipherCode ? `Audio cipher code: ${input.answerKeys.audioCipherCode}.` : '',
              input.answerKeys?.puzzleSolution ? `Puzzle keyword: ${input.answerKeys.puzzleSolution}.` : ''
            ]
              .filter(Boolean)
              .join(' ')
          )
        : undefined,
    caution:
      input.level === 'solve'
        ? 'High-cost hint used. Villain advantage and ending-risk penalties should be applied immediately.'
        : 'Hint use leaves a trace. Repeated requests increase antagonist leverage and pressure events.',
    penalty,
    source: 'fallback'
  };

  return base;
}

function parseModelJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

async function requestOpenAIHint(input: HintContextInput): Promise<GeneratedHint | null> {
  const apiKey = safeString(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return null;
  }

  const model = safeString(process.env.OPENAI_HINT_MODEL) || 'gpt-4o-mini';
  const systemPrompt = [
    'You are a senior ARG narrative coach for a horror investigation game.',
    'Return strictly valid JSON with keys: headline, howToThink, howToApproach, howToSolve, suggestedOptionId, suggestedOptionLabel, directAnswer, caution.',
    'Make the output concise, actionable, and player-centered.',
    'If level is solve, include direct answer steps using provided answerKeys when present.',
    'If no safe direct answer is possible, explain exactly what to inspect next and why.'
  ].join(' ');

  const userPrompt = JSON.stringify(input);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const rawContent = safeString(payload.choices?.[0]?.message?.content);
  if (!rawContent) {
    return null;
  }

  const parsed = parseModelJson(rawContent);
  if (!parsed) {
    return null;
  }

  const fallback = buildFallbackHint(input);

  return {
    ...fallback,
    headline: clip(safeString(parsed.headline) || fallback.headline, 160),
    howToThink: clip(safeString(parsed.howToThink) || fallback.howToThink),
    howToApproach: clip(safeString(parsed.howToApproach) || fallback.howToApproach),
    howToSolve: clip(safeString(parsed.howToSolve) || fallback.howToSolve),
    suggestedOptionId: safeString(parsed.suggestedOptionId) || fallback.suggestedOptionId,
    suggestedOptionLabel: safeString(parsed.suggestedOptionLabel) || fallback.suggestedOptionLabel,
    directAnswer:
      input.level === 'solve'
        ? clip(safeString(parsed.directAnswer) || fallback.directAnswer || fallback.howToSolve)
        : undefined,
    caution: clip(safeString(parsed.caution) || fallback.caution, 180),
    penalty: fallback.penalty,
    source: 'openai'
  };
}

export async function generateStoryHint(input: HintContextInput): Promise<GeneratedHint> {
  const fromModel = await requestOpenAIHint(input);
  if (fromModel) {
    return fromModel;
  }
  return buildFallbackHint(input);
}
