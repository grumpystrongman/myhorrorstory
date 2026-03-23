import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface QualityIndexRow {
  storyId: string;
  title: string;
  version: string;
  generatedAt: string;
  productionReadiness: number;
  difficulty: {
    level: 1 | 2 | 3;
    label: string;
    reason: string;
  };
  coverage: {
    beats: number;
    choices: number;
    endings: number;
  };
  scenarioCount: number;
  reportPath: string;
}

export interface QualityScenarioDecision {
  step: number;
  beatId: string;
  beatTitle: string;
  stage: number;
  narrativeExcerpt: string;
  incomingOutputs: Array<{
    sender: string;
    role: string;
    channel: string;
    text: string;
  }>;
  availableOptions: Array<{
    id: string;
    label: string;
    intent: string;
  }>;
  selectedOption: {
    id: string;
    label: string;
    intent: string;
    summary: string;
  } | null;
  agentThinking: string;
  output: {
    nextBeatId: string | null;
    investigationProgress: number;
    newlyRevealedClues: string[];
    totalRevealedClues: number;
    reputation: {
      trustworthiness: number;
      aggression: number;
      curiosity: number;
      deception: number;
      morality: number;
    };
  };
}

export interface QualityStoryReport {
  storyId: string;
  title: string;
  version: string;
  generatedAt: string;
  difficulty: {
    level: 1 | 2 | 3;
    label: string;
    reason: string;
  };
  metrics: {
    beatCount: number;
    choiceCount: number;
    endingCount: number;
    artifactCount: number;
    avgNarrativeWords: number;
    avgMessagesPerBeat: number;
    avgOptionsPerBeat: number;
    avgMessageDelaySeconds: number;
    media?: Record<string, number>;
  };
  coverage: {
    beatCoveragePercent: number;
    choiceCoveragePercent: number;
    endingCoveragePercent: number;
    coveredBeatCount: number;
    coveredChoiceCount: number;
    coveredEndingCount: number;
    endingTypesSeen: string[];
    missingChoiceIds: string[];
    missingEndingIds: string[];
  };
  scores: {
    productionReadiness: number;
    structuralScore: number;
    narrativeScore: number;
    interactionScore: number;
    noviceClarityScore: number;
    reliabilityScore: number;
    mediaProductionScore?: number;
  };
  mediaQuality?: {
    score: number;
    metrics: Record<string, number>;
    ratios: Record<string, number>;
    issues: string[];
    recommendations: string[];
  };
  issues: string[];
  recommendations: string[];
  scenarios: Array<{
    id: string;
    strategyId: string;
    strategyLabel: string;
    strategyGoal: string;
    forcedBeatId: string | null;
    forcedOptionId: string | null;
    totalSteps: number;
    ending: {
      id: string;
      type: string;
      title: string;
      summary: string;
    } | null;
    finalState: {
      investigationProgress: number;
      reputation: {
        trustworthiness: number;
        aggression: number;
        curiosity: number;
        deception: number;
        morality: number;
      };
      discoveredClues: string[];
      selectedResponseCount: number;
      invalidTransitionCount: number;
    };
    decisions: QualityScenarioDecision[];
  }>;
}

interface QualityIndexPayload {
  generatedAt: string;
  totalStories: number;
  rows: QualityIndexRow[];
}

export interface OwnerGateResult {
  enabled: boolean;
  authorized: boolean;
  key: string;
}

function parseKeyValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

async function readJsonCandidate<T>(relativePath: string): Promise<T | null> {
  const candidates = [
    join(process.cwd(), 'public', ...relativePath.split('/')),
    join(process.cwd(), 'apps', 'web', 'public', ...relativePath.split('/'))
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadQualityIndexRows(): Promise<QualityIndexRow[]> {
  const payload = await readJsonCandidate<QualityIndexPayload>('reports/quality/index.json');
  return payload?.rows ?? [];
}

export async function loadQualityStoryReport(storyId: string): Promise<QualityStoryReport | null> {
  return readJsonCandidate<QualityStoryReport>(`reports/quality/${storyId}.json`);
}

export function resolveOwnerGate(
  searchParams: Record<string, string | string[] | undefined> | undefined
): OwnerGateResult {
  const expected = (process.env.OWNER_DASHBOARD_KEY ?? '').trim();
  const provided = parseKeyValue(searchParams?.ownerKey).trim();

  if (!expected) {
    return {
      enabled: false,
      authorized: false,
      key: provided
    };
  }

  return {
    enabled: true,
    authorized: provided.length > 0 && provided === expected,
    key: provided
  };
}
