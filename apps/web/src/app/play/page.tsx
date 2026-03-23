'use client';

import {
  AISoundDirector,
  getStoryTitle,
  getStoryTrack,
  type HorrorMusicLocation,
  type SoundDirectorTelemetry
} from '@myhorrorstory/music';
import {
  applyResponseChoice,
  beatById,
  createInitialSessionState,
  resolveSessionEnding,
  sortMessagesForFeed,
  type DramaMessage,
  type DramaPackage,
  type DramaResponseOption,
  type SessionState
} from '../lib/play-session';
import type { ArgCampaignManifest, ArgDayPackage } from '../lib/arg-campaign';
import { adaptArgToDramaPackage, type ArgNpcProfile } from '../lib/arg-to-drama';
import {
  selectStoryArtwork,
  type AgentArmyStoryManifest,
  type StoryArtworkSelection
} from '../lib/agent-army-artwork';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type WheelEvent
} from 'react';

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const PAN_STEP = 24;
const SOUND_DIRECTOR_EVENT = 'myhorrorstory:sound-director-telemetry';
const AUDIO_CIPHER_CODE = '440';
const DEFAULT_CAMPAIGN_TARGET_DAYS = 28;
const DEFAULT_CAMPAIGN_MAX_DAYS = 45;
const MESSENGER_CHANNELS = ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL'] as const;
const MAX_UI_MESSAGE_DELAY_MS = 45_000;
const MIN_UI_MESSAGE_DELAY_MS = 1_200;
const MIN_GAP_BETWEEN_MESSAGES_MS = 1_600;

type MessengerChannel = (typeof MESSENGER_CHANNELS)[number];
type HintLevel = 'approach' | 'thinking' | 'solve';

interface StoryHintPenalty {
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
}

interface StoryHint {
  level: HintLevel;
  headline: string;
  howToThink: string;
  howToApproach: string;
  howToSolve: string;
  suggestedOptionId?: string;
  suggestedOptionLabel?: string;
  directAnswer?: string;
  caution: string;
  penalty: StoryHintPenalty;
  source: 'openai' | 'fallback';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeMessageInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferResponseOptionFromText(
  options: DramaResponseOption[],
  draftMessage: string
): DramaResponseOption | null {
  if (options.length === 0) {
    return null;
  }

  const normalizedDraft = normalizeMessageInput(draftMessage);
  if (!normalizedDraft) {
    return options[0] ?? null;
  }

  const draftTokens = normalizedDraft.split(' ').filter((token) => token.length > 2);
  let bestOption: DramaResponseOption | null = options[0] ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const option of options) {
    const searchable = normalizeMessageInput(`${option.label} ${option.summary} ${option.intent}`);
    let score = 0;
    if (searchable.includes(normalizedDraft)) {
      score += 8;
    }
    for (const token of draftTokens) {
      if (searchable.includes(token)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return bestOption;
}

function rankHintOption(options: DramaResponseOption[]): DramaResponseOption | null {
  if (options.length === 0) {
    return null;
  }

  let best: DramaResponseOption | null = options[0] ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const option of options) {
    const supportScore =
      option.reputationDelta.trustworthiness +
      option.reputationDelta.curiosity +
      option.reputationDelta.morality -
      option.reputationDelta.aggression -
      option.reputationDelta.deception +
      option.progressDelta * 0.4;
    const labelBonus = /protect|stabilize|cross|verify|truth|evidence|question/i.test(
      `${option.label} ${option.summary}`
    )
      ? 2
      : 0;
    const total = supportScore + labelBonus;
    if (total > bestScore) {
      bestScore = total;
      best = option;
    }
  }

  return best;
}

function hintPenaltyProfile(level: HintLevel, usageCount: number): StoryHintPenalty {
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return (await response.json()) as T;
}

async function loadArgAsDramaPackage(storyId: string): Promise<DramaPackage | null> {
  try {
    const campaign = await fetchJson<ArgCampaignManifest>(`/content/arg/${storyId}/campaign.json`);
    const dayFiles = campaign.fileManifest?.days ?? [];
    if (dayFiles.length === 0) {
      return null;
    }

    const dayResults = await Promise.all(
      dayFiles.map((dayFile) => fetchJson<ArgDayPackage>(`/content/arg/${storyId}/${dayFile}`))
    );
    const npcProfiles = await fetchJson<ArgNpcProfile[]>(`/content/arg/${storyId}/npc_profiles.json`);
    return adaptArgToDramaPackage(campaign, dayResults, npcProfiles);
  } catch {
    return null;
  }
}

async function loadDramaPackageFile(storyId: string): Promise<DramaPackage | null> {
  try {
    return await fetchJson<DramaPackage>(`/content/drama/${storyId}.json`);
  } catch {
    return null;
  }
}

async function loadVerifiedStoryArtwork(storyId: string): Promise<StoryArtworkSelection> {
  try {
    const manifest = await fetchJson<AgentArmyStoryManifest>(`/agent-army/manifests/${storyId}.json`);
    return selectStoryArtwork(manifest);
  } catch {
    return selectStoryArtwork(null);
  }
}

function speakVoiceLine(pack: DramaPackage | null, message: DramaMessage): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(message.text);
  const preferredLocale = pack?.id === 'black-chapel-ledger' ? 'en-GB' : 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((voice) => voice.lang.toLowerCase().startsWith(preferredLocale.toLowerCase())) ??
    voices[0];
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  } else {
    utterance.lang = preferredLocale;
  }

  const rolePreset =
    message.role === 'antagonist'
      ? { rate: 0.88, pitch: 0.68, volume: 1 }
      : message.role === 'witness'
        ? { rate: 1.07, pitch: 1.05, volume: 1 }
        : message.role === 'operator'
          ? { rate: 1.01, pitch: 0.82, volume: 1 }
          : { rate: 0.96, pitch: 0.9, volume: 1 };

  utterance.rate = rolePreset.rate;
  utterance.pitch = rolePreset.pitch;
  utterance.volume = rolePreset.volume;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function PlayPage(): JSX.Element {
  const [storyId, setStoryId] = useState<string>('static-between-stations');
  const activeStoryTitle = getStoryTitle(storyId);
  const activeStoryTrack = getStoryTrack(storyId);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [subtitles, setSubtitles] = useState(true);
  const [playerProgress, setPlayerProgress] = useState(12);
  const [villainProximity, setVillainProximity] = useState(8);
  const [dangerLevel, setDangerLevel] = useState(10);
  const [timeOfNightHour, setTimeOfNightHour] = useState(new Date().getHours());
  const [location, setLocation] = useState<HorrorMusicLocation>('basement');
  const [dramaPack, setDramaPack] = useState<DramaPackage | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [sessionEndingId, setSessionEndingId] = useState<string | null>(null);
  const [messageFeed, setMessageFeed] = useState<DramaMessage[]>([]);
  const [popupQueue, setPopupQueue] = useState<DramaMessage[]>([]);
  const [activePopup, setActivePopup] = useState<DramaMessage | null>(null);
  const [voiceDramaEnabled, setVoiceDramaEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isSimulatingBeat, setIsSimulatingBeat] = useState(false);
  const [audioCipherInput, setAudioCipherInput] = useState('');
  const [audioCipherStatus, setAudioCipherStatus] = useState<'idle' | 'failed' | 'solved'>('idle');
  const [audioCipherAttempts, setAudioCipherAttempts] = useState(0);
  const [campaignDay, setCampaignDay] = useState(1);
  const [hintUses, setHintUses] = useState(0);
  const [villainAdvantage, setVillainAdvantage] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [latestHint, setLatestHint] = useState<StoryHint | null>(null);
  const [lastProgressAt, setLastProgressAt] = useState(() => Date.now());
  const [lastNudgeAt, setLastNudgeAt] = useState(0);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [fieldActionHistory, setFieldActionHistory] = useState<Record<string, string[]>>({});
  const [fieldOpsLog, setFieldOpsLog] = useState<Array<{ id: string; day: number; title: string; detail: string }>>(
    []
  );
  const [puzzleInput, setPuzzleInput] = useState('');
  const [puzzleStatus, setPuzzleStatus] = useState<'idle' | 'failed' | 'solved'>('idle');
  const [puzzleAttempts, setPuzzleAttempts] = useState(0);
  const [unlockedShardIds, setUnlockedShardIds] = useState<string[]>([]);
  const [selectedMessengerChannel, setSelectedMessengerChannel] = useState<MessengerChannel>('SIGNAL');
  const [messageDraft, setMessageDraft] = useState('');
  const [missionReady, setMissionReady] = useState(false);
  const [verifiedArtwork, setVerifiedArtwork] = useState<StoryArtworkSelection | null>(null);

  const dragAnchor = useRef<{ x: number; y: number } | null>(null);
  const soundDirector = useMemo(() => new AISoundDirector(), []);
  const messageTimeouts = useRef<number[]>([]);
  const storyMood = activeStoryTrack?.mood ?? 'cinematic_dread';

  const directorTelemetry = useMemo<SoundDirectorTelemetry>(
    () => ({
      playerProgress,
      timeOfNightHour,
      villainProximity,
      dangerLevel,
      storyMood,
      location
    }),
    [dangerLevel, location, playerProgress, storyMood, timeOfNightHour, villainProximity]
  );
  const directorDecision = useMemo(
    () => soundDirector.evaluate(directorTelemetry),
    [directorTelemetry, soundDirector]
  );
  const boardTransform = useMemo(
    () => `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
    [pan.x, pan.y, zoom]
  );
  const storyMediaPaths = useMemo(
    () => ({
      hero: verifiedArtwork?.hero?.public_path ?? null,
      cover: verifiedArtwork?.cover?.public_path ?? null,
      evidence: verifiedArtwork?.evidence ?? [],
      gallery: verifiedArtwork?.gallery ?? []
    }),
    [verifiedArtwork]
  );
  const currentBeat = useMemo(() => {
    if (!dramaPack || !sessionState) {
      return undefined;
    }
    return beatById(dramaPack, sessionState.currentBeatId);
  }, [dramaPack, sessionState]);
  const beatBackgroundImage =
    currentBeat?.backgroundVisual && !currentBeat.backgroundVisual.startsWith('/visuals/stories/')
      ? currentBeat.backgroundVisual
      : storyMediaPaths.hero ?? undefined;

  const resolvedEnding = useMemo(() => {
    if (!sessionState?.complete || !dramaPack) {
      return null;
    }
    const resolved = resolveSessionEnding(dramaPack, sessionState);
    if (!sessionEndingId) {
      return resolved;
    }
    return dramaPack.endings.find((ending) => ending.id === sessionEndingId) ?? resolved;
  }, [dramaPack, sessionEndingId, sessionState]);
  const evidenceNodes = useMemo(
    () =>
      (dramaPack?.investigationBoard.nodes ?? [])
        .filter((node) => node.type.toLowerCase() === 'evidence')
        .slice(0, 4),
    [dramaPack]
  );
  const boardClusterItems = useMemo(() => {
    if (evidenceNodes.length > 0) {
      return evidenceNodes.map((node) => ({
        id: node.id,
        title: node.label,
        detail: node.summary
      }));
    }
    return (dramaPack?.investigationBoard.timeline ?? []).slice(0, 3).map((item) => ({
      id: item.id,
      title: item.timeLabel,
      detail: item.summary
    }));
  }, [dramaPack, evidenceNodes]);
  const cipherReference = useMemo(() => {
    const timelineReference = dramaPack?.investigationBoard.timeline[0]?.timeLabel;
    return timelineReference ? `${timelineReference} marker` : '9 second dead-air marker';
  }, [dramaPack]);
  const playerBriefing = dramaPack?.playerBriefing;
  const caseFile = dramaPack?.caseFile;
  const artifactCards = useMemo(() => dramaPack?.artifactCards ?? [], [dramaPack?.artifactCards]);
  const campaignPlan = useMemo(
    () =>
      dramaPack?.campaignPlan ?? {
        totalDays: DEFAULT_CAMPAIGN_MAX_DAYS,
        recommendedDays: DEFAULT_CAMPAIGN_TARGET_DAYS,
        maxDays: DEFAULT_CAMPAIGN_MAX_DAYS,
        weeks: [
          {
            week: 1,
            label: 'Phase 1 - Intake (Days 1-10)',
            objective: 'Establish baseline evidence chain and verify first contact.',
            keyMoments: ['Initial clue validation']
          },
          {
            week: 2,
            label: 'Phase 2 - Contradiction Mapping (Days 11-22)',
            objective: 'Cross-check witness statements and channel anomalies.',
            keyMoments: ['First branch fork']
          },
          {
            week: 3,
            label: 'Phase 3 - Escalation (Days 23-34)',
            objective: 'Run live interventions while pressure increases.',
            keyMoments: ['Antagonist direct contact']
          },
          {
            week: 4,
            label: 'Phase 4 - Endgame (Days 35-45)',
            objective: 'Resolve final branch and close evidence loop.',
            keyMoments: ['Debrief and sequel hook']
          }
        ]
      },
    [dramaPack?.campaignPlan]
  );
  const campaignTargetDays = useMemo(
    () => clamp(campaignPlan.recommendedDays ?? DEFAULT_CAMPAIGN_TARGET_DAYS, 10, DEFAULT_CAMPAIGN_MAX_DAYS),
    [campaignPlan.recommendedDays]
  );
  const campaignMaxDays = useMemo(() => {
    const baseMax = campaignPlan.maxDays ?? campaignPlan.totalDays ?? DEFAULT_CAMPAIGN_MAX_DAYS;
    return clamp(baseMax, campaignTargetDays, DEFAULT_CAMPAIGN_MAX_DAYS);
  }, [campaignPlan.maxDays, campaignPlan.totalDays, campaignTargetDays]);
  const activeCampaignWeek = useMemo(() => {
    const totalWeeks = Math.max(campaignPlan.weeks.length, 1);
    const weekSize = Math.max(Math.ceil(campaignMaxDays / totalWeeks), 1);
    const weekNumber = clamp(Math.ceil(campaignDay / weekSize), 1, totalWeeks);
    return campaignPlan.weeks[weekNumber - 1];
  }, [campaignDay, campaignMaxDays, campaignPlan.weeks]);
  const verifiedEvidenceCards = useMemo(() => {
    if (evidenceNodes.length > 0) {
      return evidenceNodes.map((node, index) => ({
        id: node.id,
        title: node.label,
        summary: node.summary,
        imagePath: storyMediaPaths.evidence[index]?.public_path ?? null,
        meta: storyMediaPaths.evidence[index]?.asset_type ?? null
      }));
    }

    return storyMediaPaths.evidence.slice(0, 4).map((asset) => ({
      id: asset.asset_id,
      title: asset.title,
      summary: `${asset.asset_type} · ${asset.tool_used ?? 'verified asset'}`,
      imagePath: asset.public_path ?? null,
      meta: asset.asset_type
    }));
  }, [evidenceNodes, storyMediaPaths.evidence]);
  const resolvedVisualGallery = useMemo(
    () =>
      storyMediaPaths.gallery.slice(0, 9).map((asset) => ({
        id: asset.asset_id,
        path: asset.public_path ?? '',
        title: asset.title,
        promptHint: `${asset.asset_type} · ${asset.tool_used ?? 'verified asset'}`
      })),
    [storyMediaPaths.gallery]
  );
  const activePuzzle = dramaPack?.communityPuzzles?.[0];
  const activePuzzleSolution = useMemo(
    () =>
      activePuzzle?.solutionKeyword && activePuzzle.solutionKeyword.length > 0
        ? activePuzzle.solutionKeyword
        : 'ORIGIN',
    [activePuzzle?.solutionKeyword]
  );
  const unlockedPuzzleShards = useMemo(
    () => (activePuzzle?.shards ?? []).filter((shard) => unlockedShardIds.includes(shard.id)),
    [activePuzzle?.shards, unlockedShardIds]
  );
  const unresolvedObjectives = useMemo(() => {
    const objectives = [
      {
        id: 'objective-beat',
        label: `Resolve beat: ${currentBeat?.title ?? 'Awaiting beat load'}`,
        complete: Boolean(sessionState?.selectedResponses.find((entry) => entry.beatId === currentBeat?.id))
      },
      {
        id: 'objective-evidence',
        label: 'Inspect at least one evidence node from the board',
        complete: fieldOpsLog.some((entry) => entry.title.includes('Evidence'))
      },
      {
        id: 'objective-puzzle',
        label: 'Complete the active community puzzle keyword',
        complete: puzzleStatus === 'solved'
      }
    ];
    return objectives;
  }, [currentBeat?.id, currentBeat?.title, fieldOpsLog, puzzleStatus, sessionState?.selectedResponses]);
  const availableMessengerChannels = useMemo(() => {
    const packChannels = dramaPack?.channels ?? [];
    return MESSENGER_CHANNELS.filter(
      (channel) => packChannels.includes(channel) || channel === selectedMessengerChannel
    );
  }, [dramaPack?.channels, selectedMessengerChannel]);
  const canReplyToBeat =
    !loading && !isSimulatingBeat && missionReady && Boolean(currentBeat) && !sessionState?.complete;
  const missionContext = useMemo(() => {
    return {
      recruitmentReason:
        playerBriefing?.recruitmentReason ??
        'You were recruited after prior squads failed to maintain narrative control during active incidents.',
      openingIncident:
        playerBriefing?.openingIncident ??
        'At 02:17 local, all major channels delivered synchronized fragments from the same hostile source.',
      firstDirective:
        playerBriefing?.firstDirective ??
        'Operate from a single secure thread, preserve witness trust, and isolate contradictions before escalation.',
      objective:
        caseFile?.objective ??
        'Reconstruct the exact sequence that turned the dead rail line into a live coercion channel.',
      primaryQuestion:
        caseFile?.primaryQuestion ??
        'Who is feeding the confessions into the rail line, and what event are they trying to cover?',
      operationWindow: caseFile?.operationWindow ?? 'First 48 hours determine survivor risk and evidence integrity.'
    };
  }, [
    caseFile?.objective,
    caseFile?.operationWindow,
    caseFile?.primaryQuestion,
    playerBriefing?.firstDirective,
    playerBriefing?.openingIncident,
    playerBriefing?.recruitmentReason
  ]);
  const paceGuidance = useMemo(() => {
    const progress = sessionState?.investigationProgress ?? playerProgress;
    const expectedProgress = Math.round((campaignDay / Math.max(campaignMaxDays, 1)) * 100);
    const behind = progress + 10 < expectedProgress;
    const nearLimit = campaignDay >= campaignMaxDays - 5;
    const overTarget = campaignDay > campaignTargetDays;
    const hintPressure = hintUses >= 3;

    if (nearLimit && progress < 85) {
      return {
        severity: 'critical',
        label: 'Critical Pace Risk',
        guidance:
          'You are near the maximum timeline. Prioritize one branch action, one field operation, then commit a decisive response to avoid unresolved collapse.'
      };
    }

    if (behind || (overTarget && progress < 75)) {
      return {
        severity: 'warning',
        label: 'Behind Recommended Pace',
        guidance:
          'Focus on contradiction resolution: review artifact prompts, execute one clue action, and reply through the option that advances evidence integrity.'
      };
    }

    if (hintPressure) {
      return {
        severity: 'warning',
        label: 'Villain Advantage Rising',
        guidance:
          'Reduce hint usage. Extra hints now strengthen antagonist interference and increase pressure events in later beats.'
      };
    }

    return {
      severity: 'normal',
      label: 'Pace Stable',
      guidance:
        'You are moving at a healthy rhythm. Keep responses evidence-driven and use hints only when objectives remain blocked after field actions.'
    };
  }, [campaignDay, campaignMaxDays, campaignTargetDays, hintUses, playerProgress, sessionState?.investigationProgress]);

  function clearBeatTimers(): void {
    for (const timeout of messageTimeouts.current) {
      window.clearTimeout(timeout);
    }
    messageTimeouts.current = [];
  }

  const emitRuntimeMessage = useCallback(
    (message: DramaMessage): void => {
      setMessageFeed((current) => [...current, message]);
      setPopupQueue((current) => [...current, message]);
      if (voiceDramaEnabled) {
        speakVoiceLine(dramaPack, message);
      }
    },
    [dramaPack, voiceDramaEnabled]
  );

  async function loadDramaPackage(nextStoryId: string): Promise<void> {
    setLoading(true);
    setLoadingError(null);
    clearBeatTimers();

    try {
      const prefersDirectDrama = nextStoryId === 'static-between-stations';
      const parsed = prefersDirectDrama
        ? (await loadDramaPackageFile(nextStoryId)) ?? (await loadArgAsDramaPackage(nextStoryId))
        : (await loadArgAsDramaPackage(nextStoryId)) ?? (await loadDramaPackageFile(nextStoryId));
      if (!parsed) {
        throw new Error(`Unable to load runtime package for ${nextStoryId}.`);
      }
      const initialState = createInitialSessionState(parsed);
      setDramaPack(parsed);
      setSessionState(initialState);
      setSessionEndingId(null);
      setMessageFeed([]);
      setPopupQueue([]);
      setActivePopup(null);
      setPlayerProgress(initialState.investigationProgress);
      setVillainProximity(8);
      setDangerLevel(10);
      setIsSimulatingBeat(false);
      setAudioCipherInput('');
      setAudioCipherStatus('idle');
      setAudioCipherAttempts(0);
      setCampaignDay(1);
      setHintUses(0);
      setVillainAdvantage(0);
      setHintLoading(false);
      setHintError(null);
      setLatestHint(null);
      setLastProgressAt(Date.now());
      setLastNudgeAt(0);
      setNudgeCount(0);
      setFieldActionHistory({});
      setFieldOpsLog([]);
      setPuzzleInput('');
      setPuzzleStatus('idle');
      setPuzzleAttempts(0);
      setUnlockedShardIds([]);
      setMissionReady(false);
      setMessageDraft('');
      const firstSupportedChannel = MESSENGER_CHANNELS.find((channel) =>
        parsed.channels.includes(channel)
      );
      setSelectedMessengerChannel(firstSupportedChannel ?? 'SIGNAL');
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to load story runtime package.');
    } finally {
      setLoading(false);
    }
  }

  function scheduleBeatMessages(messages: DramaMessage[]): void {
    clearBeatTimers();
    setIsSimulatingBeat(messages.length > 0);

    let previousDelayMs = 0;
    messages.forEach((message, index) => {
      const absoluteDelayMs = clamp(
        Math.round(message.delaySeconds * 1000),
        MIN_UI_MESSAGE_DELAY_MS,
        MAX_UI_MESSAGE_DELAY_MS
      );
      const delayMs =
        index === 0
          ? absoluteDelayMs
          : Math.max(absoluteDelayMs, previousDelayMs + MIN_GAP_BETWEEN_MESSAGES_MS);
      previousDelayMs = delayMs;
      const timeoutId = window.setTimeout(() => {
        setMessageFeed((current) => [...current, message]);
        setPopupQueue((current) => [...current, message]);
        if (voiceDramaEnabled) {
          speakVoiceLine(dramaPack, message);
        }
        if (index === messages.length - 1) {
          setIsSimulatingBeat(false);
        }
      }, delayMs);
      messageTimeouts.current.push(timeoutId);
    });
  }

  function acceptPopup(): void {
    setPopupQueue((current) => current.slice(1));
    setActivePopup(null);
  }

  function chooseResponse(option: DramaResponseOption, customMessage?: string): void {
    if (!dramaPack || !sessionState || !currentBeat || !missionReady) {
      return;
    }

    const outboundMessage: DramaMessage = {
      id: `outbound-${currentBeat.id}-${option.id}-${Date.now()}`,
      senderName: playerBriefing?.callSign ?? 'You',
      role: 'investigator',
      channel: selectedMessengerChannel,
      text: customMessage?.trim() || option.label,
      delaySeconds: 0,
      intensity: 28
    };
    setMessageFeed((current) => [...current, outboundMessage]);

    const result = applyResponseChoice(dramaPack, sessionState, currentBeat, option);
    const escalationBoost = Math.floor(villainAdvantage / 8);
    setSessionState(result.nextState);
    setPlayerProgress(result.nextState.investigationProgress);
    setVillainProximity((current) =>
      clamp(current + currentBeat.stage * 3 + option.reputationDelta.aggression + escalationBoost, 0, 100)
    );
    setDangerLevel((current) =>
      clamp(current + currentBeat.stage * 4 + Math.max(0, option.reputationDelta.aggression) + escalationBoost, 0, 100)
    );
    setCampaignDay((current) => clamp(current + (currentBeat.stage >= 3 ? 3 : 2), 1, campaignMaxDays));
    setLastProgressAt(Date.now());
    setPopupQueue([]);
    setActivePopup(null);

    if (villainAdvantage >= 15 && result.nextState.selectedResponses.length % 2 === 0) {
      emitRuntimeMessage({
        id: `villain-advantage-${Date.now()}`,
        senderName: dramaPack.villain.displayName,
        role: 'antagonist',
        channel: 'SMS',
        text: `You asked for guidance, so I rewrote your timing window. Keep leaning on hints and I will keep choosing who gets hurt first.`,
        delaySeconds: 0,
        intensity: 62
      });
    }

    if (result.nextState.complete) {
      const ending = resolveSessionEnding(dramaPack, result.nextState);
      setSessionEndingId(ending.id);
      setIsSimulatingBeat(false);
    }
  }

  function startMissionThread(): void {
    if (!dramaPack || missionReady) {
      return;
    }
    setMissionReady(true);
    setLastProgressAt(Date.now());

    const dispatchMessage: DramaMessage = {
      id: `dispatch-${dramaPack.id}-${Date.now()}`,
      senderName: 'Control',
      role: 'operator',
      channel: selectedMessengerChannel,
      text: `${missionContext.openingIncident} Directive: ${missionContext.firstDirective}`,
      delaySeconds: 0,
      intensity: 34
    };
    emitRuntimeMessage(dispatchMessage);
  }

  function submitMessengerReply(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!currentBeat || !canReplyToBeat) {
      return;
    }

    const normalizedDraft = messageDraft.trim();
    if (!normalizedDraft) {
      return;
    }

    const matchedOption = inferResponseOptionFromText(currentBeat.responseOptions, normalizedDraft);
    if (!matchedOption) {
      return;
    }

    chooseResponse(matchedOption, normalizedDraft);
    setMessageDraft('');
  }

  function restartSession(): void {
    if (!dramaPack) {
      return;
    }
    const initial = createInitialSessionState(dramaPack);
    clearBeatTimers();
    setSessionState(initial);
    setSessionEndingId(null);
    setMessageFeed([]);
    setPopupQueue([]);
    setActivePopup(null);
    setPlayerProgress(initial.investigationProgress);
    setVillainProximity(8);
    setDangerLevel(10);
    setAudioCipherInput('');
    setAudioCipherStatus('idle');
    setAudioCipherAttempts(0);
    setCampaignDay(1);
    setHintUses(0);
    setVillainAdvantage(0);
    setHintLoading(false);
    setHintError(null);
    setLatestHint(null);
    setLastProgressAt(Date.now());
    setLastNudgeAt(0);
    setNudgeCount(0);
    setFieldActionHistory({});
    setFieldOpsLog([]);
    setPuzzleInput('');
    setPuzzleStatus('idle');
    setPuzzleAttempts(0);
    setUnlockedShardIds([]);
    setMissionReady(false);
    setMessageDraft('');
  }

  function submitAudioCipher(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedInput = audioCipherInput.trim();
    if (!normalizedInput) {
      return;
    }

    if (normalizedInput === AUDIO_CIPHER_CODE) {
      const puzzleMessage: DramaMessage = {
        id: `cipher-${Date.now()}`,
        senderName: 'Archive Operator',
        role: 'operator',
        channel: 'SIGNAL',
        text:
          'Cipher accepted. Hidden reel unlocked. Cross-check the timeline fracture and isolate the seventh caller.',
        delaySeconds: 0,
        intensity: 35
      };
      setAudioCipherStatus('solved');
      setAudioCipherAttempts((current) => current + 1);
      setPlayerProgress((current) => clamp(current + 6, 0, 100));
      setDangerLevel((current) => clamp(current - 4, 0, 100));
      setCampaignDay((current) => clamp(current + 1, 1, campaignMaxDays));
      setLastProgressAt(Date.now());
      emitRuntimeMessage(puzzleMessage);
      return;
    }

    setAudioCipherStatus('failed');
    setAudioCipherAttempts((current) => current + 1);
    setDangerLevel((current) => clamp(current + 5, 0, 100));
  }

  function performFieldAction(actionId: 'analyze_audio' | 'interview_witness' | 'review_evidence' | 'trace_number'): void {
    if (!currentBeat) {
      return;
    }

    const usedActions = fieldActionHistory[currentBeat.id] ?? [];
    if (usedActions.includes(actionId)) {
      return;
    }

    const actionLabels = {
      analyze_audio: {
        title: 'Audio Analysis Sweep',
        detail: 'Detected modulation drift matching prior contact windows.'
      },
      interview_witness: {
        title: 'Witness Interview Snapshot',
        detail: 'Witness account introduced a contradiction tied to station access logs.'
      },
      review_evidence: {
        title: 'Evidence Frame Review',
        detail: 'Recovered a frame marker hidden in archived still imagery.'
      },
      trace_number: {
        title: 'Telecom Trace Attempt',
        detail: 'Line route bounced through relay mirrors before dropping into dead infrastructure.'
      }
    };

    const selectedAction = actionLabels[actionId];
    const clueReference =
      dramaPack?.investigationBoard.timeline[Math.min(fieldOpsLog.length, (dramaPack?.investigationBoard.timeline.length ?? 1) - 1)]
        ?.summary ?? 'No additional timeline annotation.';

    const opsMessage: DramaMessage = {
      id: `ops-${currentBeat.id}-${actionId}-${Date.now()}`,
      senderName: 'Field Operations Desk',
      role: 'operator',
      channel: 'SIGNAL',
      text: `${selectedAction.title}: ${selectedAction.detail} Timeline note: ${clueReference}`,
      delaySeconds: 0,
      intensity: 42
    };

    setFieldActionHistory((current) => ({
      ...current,
      [currentBeat.id]: [...usedActions, actionId]
    }));
    setFieldOpsLog((current) => [
      ...current,
      {
        id: opsMessage.id,
        day: campaignDay,
        title: selectedAction.title,
        detail: selectedAction.detail
      }
    ]);
    setPlayerProgress((current) => clamp(current + 3, 0, 100));
    setDangerLevel((current) => clamp(current + 2, 0, 100));
    setCampaignDay((current) => clamp(current + 1, 1, campaignMaxDays));
    setLastProgressAt(Date.now());
    emitRuntimeMessage(opsMessage);

    if (activePuzzle && unlockedShardIds.length < activePuzzle.shards.length) {
      const nextShard = activePuzzle.shards[unlockedShardIds.length];
      if (nextShard) {
        setUnlockedShardIds((current) => [...current, nextShard.id]);
      }
    }
  }

  function submitCommunityPuzzle(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!activePuzzle || puzzleStatus === 'solved') {
      return;
    }

    const normalizedGuess = puzzleInput.trim().toUpperCase();
    if (!normalizedGuess) {
      return;
    }

    setPuzzleAttempts((current) => current + 1);

    if (normalizedGuess === activePuzzleSolution) {
      const solvedMessage: DramaMessage = {
        id: `puzzle-solved-${Date.now()}`,
        senderName: 'Archive Operator',
        role: 'operator',
        channel: 'DOCUMENT_DROP',
        text: `Puzzle ${activePuzzle.title} resolved. Reward clue ${activePuzzle.rewardClueId} is now tagged for final debrief alignment.`,
        delaySeconds: 0,
        intensity: 50
      };
      setPuzzleStatus('solved');
      setPlayerProgress((current) => clamp(current + 8, 0, 100));
      setCampaignDay((current) => clamp(current + 2, 1, campaignMaxDays));
      setLastProgressAt(Date.now());
      emitRuntimeMessage(solvedMessage);
      return;
    }

    setPuzzleStatus('failed');
    setDangerLevel((current) => clamp(current + 4, 0, 100));
  }

  async function requestHint(level: HintLevel): Promise<void> {
    if (!currentBeat || !sessionState || !missionReady || sessionState.complete || hintLoading) {
      return;
    }

    setHintLoading(true);
    setHintError(null);
    try {
      const recommended = rankHintOption(currentBeat.responseOptions);
      const response = await fetch('/api/hints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level,
          story: {
            id: storyId,
            title: dramaPack?.title ?? activeStoryTitle,
            hook: dramaPack?.hook ?? '',
            tone: dramaPack?.tone ?? 'cinematic',
            location: dramaPack?.location ?? location
          },
          beat: {
            id: currentBeat.id,
            title: currentBeat.title,
            stage: currentBeat.stage,
            narrative: currentBeat.narrative,
            revealClueIds: currentBeat.revealClueIds,
            responseOptions: currentBeat.responseOptions.map((option) => ({
              id: option.id,
              label: option.label,
              summary: option.summary,
              intent: option.intent,
              progressDelta: option.progressDelta,
              reputationDelta: option.reputationDelta
            })),
            incomingMessages: currentBeat.incomingMessages.map((message) => ({
              senderName: message.senderName,
              channel: message.channel,
              role: message.role,
              text: message.text
            }))
          },
          mission: {
            objective: missionContext.objective,
            primaryQuestion: missionContext.primaryQuestion,
            operationWindow: missionContext.operationWindow
          },
          campaign: {
            day: campaignDay,
            targetDays: campaignTargetDays,
            maxDays: campaignMaxDays
          },
          player: {
            progress: sessionState.investigationProgress,
            hintUses,
            villainAdvantage,
            reputation: sessionState.reputation
          },
          objectives: unresolvedObjectives.map((objective) => ({
            label: objective.label,
            complete: objective.complete
          })),
          answerKeys:
            level === 'solve'
              ? {
                  audioCipherCode: AUDIO_CIPHER_CODE,
                  puzzleSolution: activePuzzleSolution,
                  recommendedOptionId: recommended?.id,
                  recommendedOptionLabel: recommended?.label
                }
              : {
                  recommendedOptionId: recommended?.id,
                  recommendedOptionLabel: recommended?.label
                }
        }),
        cache: 'no-store'
      });

      let hint: StoryHint | null = null;
      if (response.ok) {
        hint = (await response.json()) as StoryHint;
      } else {
        setHintError('Hint assistant failed to respond. Try again.');
      }

      if (!hint) {
        return;
      }

      setLatestHint(hint);

      const nextHintUses = hintUses + 1;
      const penalty = hint.penalty ?? hintPenaltyProfile(level, nextHintUses);
      const nextVillainAdvantage = clamp(villainAdvantage + penalty.advantageGain, 0, 100);

      setHintUses(nextHintUses);
      setVillainAdvantage(nextVillainAdvantage);
      setPlayerProgress((current) => clamp(current + penalty.progressGain, 0, 100));
      setDangerLevel((current) => clamp(current + penalty.dangerGain, 0, 100));
      setVillainProximity((current) => clamp(current + penalty.villainGain, 0, 100));
      setCampaignDay((current) => clamp(current + penalty.dayAdvance, 1, campaignMaxDays));
      setLastProgressAt(Date.now());
      setSessionState((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          reputation: {
            ...current.reputation,
            trustworthiness: clamp(current.reputation.trustworthiness - penalty.trustPenalty, -100, 100),
            morality: clamp(current.reputation.morality - penalty.moralityPenalty, -100, 100),
            deception: clamp(current.reputation.deception + penalty.deceptionGain, -100, 100)
          },
          flags: {
            ...current.flags,
            hintUses: nextHintUses,
            villainAdvantage: nextVillainAdvantage,
            lastHintLevel: level
          }
        };
      });

      emitRuntimeMessage({
        id: `hint-${currentBeat.id}-${Date.now()}`,
        senderName: 'Case Handler',
        role: 'operator',
        channel: 'SIGNAL',
        text: `${hint.headline}. Think: ${hint.howToThink} Approach: ${hint.howToApproach}`,
        delaySeconds: 0,
        intensity: 38
      });

      if (level === 'solve' && hint.directAnswer) {
        emitRuntimeMessage({
          id: `hint-answer-${currentBeat.id}-${Date.now()}`,
          senderName: 'Case Handler',
          role: 'operator',
          channel: 'DOCUMENT_DROP',
          text: `Direct solve guidance: ${hint.directAnswer}`,
          delaySeconds: 0,
          intensity: 44
        });
        if (hint.suggestedOptionLabel) {
          setMessageDraft(hint.suggestedOptionLabel);
        }
      }

      if (nextHintUses >= 2 || level === 'solve') {
        emitRuntimeMessage({
          id: `hint-penalty-${Date.now()}`,
          senderName: dramaPack?.villain.displayName ?? 'Unknown Antagonist',
          role: 'antagonist',
          channel: 'VOICE_MESSAGE',
          text:
            hint.caution ||
            'Every hint exposes your process. I now know where you hesitate, and I will weaponize it.',
          delaySeconds: 0,
          intensity: 62
        });
      }
    } catch {
      setHintError('Hint service unavailable. Retry in a moment.');
    } finally {
      setHintLoading(false);
    }
  }

  function applyHintSuggestion(): void {
    if (!latestHint || !currentBeat || !canReplyToBeat) {
      return;
    }

    const option =
      currentBeat.responseOptions.find((candidate) => candidate.id === latestHint.suggestedOptionId) ??
      currentBeat.responseOptions.find((candidate) => candidate.label === latestHint.suggestedOptionLabel);
    if (!option) {
      return;
    }

    chooseResponse(option, option.label);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryStoryId = params.get('storyId');
    if (queryStoryId) {
      setStoryId(queryStoryId);
    }
  }, []);

  useEffect(() => {
    void loadDramaPackage(storyId);
    return () => {
      clearBeatTimers();
    };
  }, [storyId]);

  useEffect(() => {
    let cancelled = false;
    setVerifiedArtwork(null);

    void loadVerifiedStoryArtwork(storyId).then((selection) => {
      if (!cancelled) {
        setVerifiedArtwork(selection);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    if (!missionReady || !currentBeat || !sessionState || sessionState.complete) {
      setIsSimulatingBeat(false);
      return;
    }
    const ordered = sortMessagesForFeed(currentBeat.incomingMessages);
    scheduleBeatMessages(ordered);
    return () => {
      clearBeatTimers();
    };
  }, [currentBeat?.id, missionReady, sessionState?.complete, voiceDramaEnabled]);

  useEffect(() => {
    if (!missionReady || sessionState?.complete) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const stalled = now - lastProgressAt >= 120_000;
      const nudgeWindowOpen = now - lastNudgeAt >= 90_000;
      if (!stalled || !nudgeWindowOpen || nudgeCount >= 6) {
        return;
      }

      const behindPace = campaignDay > campaignTargetDays && (sessionState?.investigationProgress ?? 0) < 75;
      const messageText = behindPace
        ? 'Pace alert: you are drifting beyond the recommended timeline. Take one decisive branch now, then run one evidence action to recover momentum.'
        : 'Operational nudge: if you are stuck, review the latest artifact prompt and select the response that clarifies motive plus timeline.';

      emitRuntimeMessage({
        id: `pace-nudge-${Date.now()}`,
        senderName: 'Control',
        role: 'operator',
        channel: 'SIGNAL',
        text: messageText,
        delaySeconds: 0,
        intensity: 33
      });
      setLastNudgeAt(now);
      setNudgeCount((current) => current + 1);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    campaignDay,
    campaignTargetDays,
    emitRuntimeMessage,
    lastNudgeAt,
    lastProgressAt,
    missionReady,
    nudgeCount,
    sessionState?.complete,
    sessionState?.investigationProgress
  ]);

  useEffect(() => {
    if (!activePopup && popupQueue.length > 0) {
      setActivePopup(popupQueue[0]!);
    }
  }, [activePopup, popupQueue]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<SoundDirectorTelemetry>(SOUND_DIRECTOR_EVENT, {
        detail: directorTelemetry
      })
    );
  }, [directorTelemetry]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function zoomBy(delta: number): void {
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  }

  function resetView(): void {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }

  function panBy(deltaX: number, deltaY: number): void {
    setPan((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY
    }));
  }

  function onBoardWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 10 : -10);
  }

  function onBoardPointerDown(event: PointerEvent<HTMLDivElement>): void {
    dragAnchor.current = {
      x: event.clientX,
      y: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onBoardPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!dragAnchor.current) {
      return;
    }

    const deltaX = event.clientX - dragAnchor.current.x;
    const deltaY = event.clientY - dragAnchor.current.y;
    dragAnchor.current = {
      x: event.clientX,
      y: event.clientY
    };
    panBy(deltaX, deltaY);
  }

  function onBoardPointerUp(event: PointerEvent<HTMLDivElement>): void {
    dragAnchor.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <main className="container page-stack">
      <div className="panel section-shell play-session-hero">
        <div
          className="play-session-hero-backdrop"
          style={{
            backgroundImage: beatBackgroundImage ? `url(${beatBackgroundImage})` : undefined
          }}
        />
        <div className="play-session-hero-content">
          <p className="kicker">Signal Runtime</p>
          <h1 style={{ fontFamily: 'Cinzel, serif', margin: '8px 0 4px' }}>Play Session</h1>
          <p className="section-copy">
            Incoming channels are staged as call logs, short transmissions, and archived operator drops.
            Treat each beat like an active incident: decode the clue chain before the next escalation.
          </p>
          <p data-testid="active-story" style={{ margin: 0, color: 'var(--muted)' }}>
            Active Story: {dramaPack?.title ?? activeStoryTitle}
          </p>
          <p data-testid="active-score" style={{ margin: 0, color: 'var(--muted)' }}>
            Score: {activeStoryTrack?.title ?? 'MHS Platform Overture'}
          </p>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Campaign Day: {campaignDay} / {campaignMaxDays} (target {campaignTargetDays})
          </p>
          {playerBriefing ? (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Call Sign {playerBriefing.callSign} - {playerBriefing.roleTitle}
            </p>
          ) : null}
          <div className="inline-links">
            <button type="button" onClick={restartSession}>Restart Session</button>
            <button type="button" onClick={() => setVoiceDramaEnabled((current) => !current)}>
              Voice Drama: {voiceDramaEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {!missionReady ? (
        <div className="panel section-shell play-mission-overlay" data-testid="mission-overlay">
          <p className="kicker">Mission Brief</p>
          <h2 style={{ margin: '8px 0 6px' }}>Why You Are In This Story</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {missionContext.recruitmentReason}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Opening Incident:</strong> {missionContext.openingIncident}
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>First Directive:</strong> {missionContext.firstDirective}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Case Objective:</strong> {missionContext.objective}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Primary Question:</strong> {missionContext.primaryQuestion}
          </p>
          <div className="inline-links" style={{ marginTop: 0 }}>
            <button type="button" data-testid="mission-begin" onClick={startMissionThread} disabled={loading}>
              Start Live Thread
            </button>
            <span className="play-mission-channel">Primary channel: {selectedMessengerChannel}</span>
          </div>
        </div>
      ) : null}

      <div className="panel section-shell play-messenger-shell">
        <div className="play-messenger-topline">
          <div>
            <p className="kicker">Messenger Runtime</p>
            <h2 style={{ margin: '8px 0 4px' }}>iPhone Chat Simulation</h2>
            <p className="muted" style={{ margin: 0 }}>
              Case events are played through a single channel thread. Type freely or use quick replies to branch.
            </p>
          </div>
          <label htmlFor="messenger-channel-select" className="play-messenger-channel-picker">
            Active channel
            <select
              id="messenger-channel-select"
              data-testid="messenger-channel-select"
              value={selectedMessengerChannel}
              onChange={(event) => setSelectedMessengerChannel(event.target.value as MessengerChannel)}
            >
              {availableMessengerChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="play-messenger-grid">
          <article className="play-messenger-brief">
            <h3 style={{ marginTop: 0 }}>Thread Rules</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Keep responses in-channel. Every reply updates trust, danger, and the next unlock.
            </p>
            <ul className="plain-list">
              <li>
                <strong>1. Observe:</strong>
                <span>Read incoming messages for contradictions, timeline clues, and emotional shifts.</span>
              </li>
              <li>
                <strong>2. Respond:</strong>
                <span>Type any natural response or send a quick option to advance the narrative.</span>
              </li>
              <li>
                <strong>3. Escalate:</strong>
                <span>Field ops and puzzle unlocks deepen each branch without leaving the thread.</span>
              </li>
            </ul>
          </article>

          <article className="iphone-chat-shell" data-testid="iphone-chat-shell">
            <div className="iphone-frame">
              <div className="iphone-notch" />
              <div className={`iphone-screen channel-${selectedMessengerChannel.toLowerCase()}`}>
                <header className="iphone-chat-header">
                  <strong>{dramaPack?.title ?? activeStoryTitle}</strong>
                  <span>{selectedMessengerChannel} secure thread</span>
                </header>
                <div className="iphone-chat-messages" data-testid="phone-chat-messages">
                  {messageFeed.length === 0 ? (
                    <article className="iphone-bubble incoming">
                      <strong>Control</strong>
                      <p>{missionContext.openingIncident}</p>
                    </article>
                  ) : (
                    messageFeed.map((message) => {
                      const outgoing = message.role === 'investigator';
                      return (
                        <article
                          key={message.id}
                          className={`iphone-bubble ${outgoing ? 'outgoing' : 'incoming'} role-${message.role}`}
                        >
                          <strong>{outgoing ? 'You' : message.senderName}</strong>
                          <p>{message.text}</p>
                          <span>{message.channel}</span>
                        </article>
                      );
                    })
                  )}
                </div>
                <div className="iphone-quick-replies">
                  {(currentBeat?.responseOptions ?? []).slice(0, 3).map((option) => (
                    <button
                      type="button"
                      key={`phone-${option.id}`}
                      data-testid={`phone-quick-reply-${option.id}`}
                      onClick={() => chooseResponse(option, option.label)}
                      disabled={!canReplyToBeat}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <form className="iphone-composer" onSubmit={submitMessengerReply}>
                  <label htmlFor="messenger-reply-input" className="sr-only">
                    Reply
                  </label>
                  <input
                    id="messenger-reply-input"
                    data-testid="phone-input"
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder={missionReady ? 'Type your response...' : 'Start mission to unlock chat input'}
                    disabled={!canReplyToBeat}
                  />
                  <button type="submit" data-testid="phone-send" disabled={!canReplyToBeat}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="panel section-shell play-grid">
        <section className="play-feed-column">
          <h2 style={{ marginTop: 0 }}>Incoming Channel Feed</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {loading
              ? 'Loading runtime package...'
              : loadingError
                ? loadingError
                : !missionReady
                  ? 'Mission briefing pending. Start the thread to receive live transmissions.'
                : isSimulatingBeat
                  ? 'Transmission burst in progress.'
                  : 'Awaiting operator input.'}
          </p>
          <div className="play-channel-strip">
            {(dramaPack?.channels ?? ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL']).slice(0, 6).map((channel) => (
              <span key={channel} className="play-channel-pill">{channel}</span>
            ))}
          </div>
          <div className="play-feed-list" data-testid="message-feed">
            {messageFeed.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No transmissions captured yet.</p>
            ) : (
              messageFeed.map((message) => (
                <article key={message.id} className={`play-feed-item role-${message.role}`}>
                  <div className="play-feed-item-top">
                    <strong>{message.senderName}</strong>
                    <span>{message.channel}</span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="play-beat-column">
          <h2 style={{ marginTop: 0 }}>Current Beat</h2>
          <p data-testid="current-beat" className="surface-tag">
            {currentBeat ? `${currentBeat.actTitle} - ${currentBeat.title}` : 'No beat loaded'}
          </p>
          <p className="muted">{currentBeat?.narrative ?? 'Select a story to initialize runtime.'}</p>

          <div className="play-metrics-grid">
            <div className="metric">
              <strong>Progress</strong>
              <span>{Math.round(sessionState?.investigationProgress ?? playerProgress)}%</span>
            </div>
            <div className="metric">
              <strong>Villain Stage</strong>
              <span>{currentBeat?.stage ?? 1}/4</span>
            </div>
            <div className="metric">
              <strong>Clues</strong>
              <span>{sessionState?.discoveredClues.length ?? 0}</span>
            </div>
          </div>

          <div className="play-response-list">
            <h3 style={{ margin: '8px 0 4px' }}>Response Options</h3>
            {(currentBeat?.responseOptions ?? []).map((option) => (
              <button
                type="button"
                key={option.id}
                data-testid={`response-option-${option.id}`}
                onClick={() => chooseResponse(option)}
                disabled={loading || isSimulatingBeat || !missionReady || Boolean(sessionState?.complete)}
              >
                <strong>{option.label}</strong>
                <small>{option.summary}</small>
              </button>
            ))}
          </div>

          <div className="play-response-list">
            <h3 style={{ margin: '8px 0 4px' }}>Hint System (Costs Apply)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Hints are LLM-guided and escalation-aware. Ask for approach, thinking, or full solve guidance. Each use gives the villain leverage.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => void requestHint('approach')}
                disabled={!missionReady || !currentBeat || Boolean(sessionState?.complete) || hintLoading}
              >
                Approach Hint
              </button>
              <button
                type="button"
                onClick={() => void requestHint('thinking')}
                disabled={!missionReady || !currentBeat || Boolean(sessionState?.complete) || hintLoading}
              >
                Thinking Hint
              </button>
              <button
                type="button"
                onClick={() => void requestHint('solve')}
                disabled={!missionReady || !currentBeat || Boolean(sessionState?.complete) || hintLoading}
              >
                Solve Hint (High Penalty)
              </button>
              <button
                type="button"
                onClick={applyHintSuggestion}
                disabled={(!latestHint?.suggestedOptionId && !latestHint?.suggestedOptionLabel) || !canReplyToBeat}
              >
                Use Suggested Response
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Hint Uses: {hintUses} - Villain Advantage: {villainAdvantage}%
            </p>
            {hintLoading ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Generating hint...
              </p>
            ) : null}
            {hintError ? (
              <p className="form-error" style={{ marginBottom: 0 }}>
                {hintError}
              </p>
            ) : null}
            {latestHint ? (
              <article className="panel" style={{ marginTop: 8, padding: 10 }}>
                <p className="kicker" style={{ marginBottom: 6 }}>
                  {latestHint.level.toUpperCase()} HINT - {latestHint.source.toUpperCase()}
                </p>
                <p style={{ margin: '0 0 6px' }}><strong>{latestHint.headline}</strong></p>
                <p style={{ margin: '0 0 6px' }}><strong>How To Think:</strong> {latestHint.howToThink}</p>
                <p style={{ margin: '0 0 6px' }}><strong>How To Approach:</strong> {latestHint.howToApproach}</p>
                <p style={{ margin: '0 0 6px' }}><strong>How To Solve:</strong> {latestHint.howToSolve}</p>
                {latestHint.directAnswer ? (
                  <p style={{ margin: '0 0 6px' }}><strong>Direct Answer:</strong> {latestHint.directAnswer}</p>
                ) : null}
                {latestHint.suggestedOptionLabel ? (
                  <p className="muted" style={{ margin: '0 0 6px' }}>
                    Suggested response option: {latestHint.suggestedOptionLabel}
                  </p>
                ) : null}
                <p className="muted" style={{ margin: '0 0 6px' }}>
                  Penalty Applied: +{latestHint.penalty.advantageGain}% villain advantage, +{latestHint.penalty.dayAdvance} day
                  ({latestHint.penalty.severity.toUpperCase()})
                </p>
                <p className="warning-line" style={{ marginBottom: 0 }}>
                  Consequence: {latestHint.caution}
                </p>
              </article>
            ) : null}
          </div>

          {resolvedEnding ? (
            <article className="play-ending-card" data-testid="resolved-ending">
              <h3 style={{ margin: '0 0 6px' }}>{resolvedEnding.title}</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                {resolvedEnding.summary}
              </p>
              <p style={{ marginBottom: 4 }}>{resolvedEnding.epilogue}</p>
              <p className="muted" style={{ margin: 0 }}>
                Sequel Hook: {resolvedEnding.sequelHook}
              </p>
            </article>
          ) : null}
        </section>
      </div>

      <div className="panel section-shell play-briefing-grid">
        <article className="play-briefing-card">
          <h2 style={{ marginTop: 0 }}>Investigator Briefing</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {playerBriefing?.recruitmentReason ??
              'You were assigned as a specialist after cross-case anomaly markers aligned with your prior investigations.'}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Opening Incident:</strong>{' '}
            {playerBriefing?.openingIncident ?? 'A synchronized multi-channel drop triggered this file.'}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Personal Stakes:</strong>{' '}
            {playerBriefing?.personalStakes ?? 'Failure leaves witnesses exposed to escalating antagonist pressure.'}
          </p>
          <p style={{ margin: 0 }}>
            <strong>First Directive:</strong>{' '}
            {playerBriefing?.firstDirective ?? 'Maintain evidence chain and preserve witness trust under pressure.'}
          </p>
        </article>
        <article className="play-briefing-card">
          <h2 style={{ marginTop: 0 }}>Flexible Campaign Tracker</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            The case adapts to player pace. Recommended completion is {campaignTargetDays} days, hard limit {campaignMaxDays} days.
          </p>
          <div className="campaign-week-list">
            {campaignPlan.weeks.map((week) => {
              const weekNumber = week.week;
              const totalWeeks = Math.max(campaignPlan.weeks.length, 1);
              const weekSize = Math.max(Math.ceil(campaignMaxDays / totalWeeks), 1);
              const currentWeek = clamp(Math.ceil(campaignDay / weekSize), 1, totalWeeks);
              const isActive = weekNumber === currentWeek;
              const isComplete = weekNumber < currentWeek;
              return (
                <article
                  key={week.label}
                  className={`campaign-week-card ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
                >
                  <p className="kicker" style={{ marginBottom: 6 }}>
                    Week {week.week}
                  </p>
                  <h3 style={{ margin: '0 0 4px' }}>{week.label}</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {week.objective}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Active focus: {activeCampaignWeek?.objective}
          </p>
          <p
            className={paceGuidance.severity === 'critical' ? 'form-error' : paceGuidance.severity === 'warning' ? 'warning-line' : 'muted'}
            style={{ marginBottom: 0 }}
          >
            {paceGuidance.label}: {paceGuidance.guidance}
          </p>
        </article>
      </div>

      <div className="panel section-shell play-ops-grid">
        <article className="play-ops-card">
          <h2 style={{ marginTop: 0 }}>Case File</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Human perspective first: mission scope, core question, and what failure costs.
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Operation Window:</strong> {missionContext.operationWindow}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Primary Question:</strong> {missionContext.primaryQuestion}
          </p>
          <p style={{ marginBottom: 6 }}>
            <strong>Objective:</strong> {missionContext.objective}
          </p>
          {caseFile?.successCriteria?.length ? (
            <>
              <p style={{ marginBottom: 4 }}><strong>Success Criteria</strong></p>
              <ul className="plain-list">
                {caseFile.successCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </>
          ) : null}
          {caseFile?.failureConsequences?.length ? (
            <>
              <p style={{ marginBottom: 4 }}><strong>Failure Consequences</strong></p>
              <ul className="plain-list">
                {caseFile.failureConsequences.map((consequence) => (
                  <li key={consequence}>{consequence}</li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <article className="play-ops-card">
          <h2 style={{ marginTop: 0 }}>Artifact Reading Desk</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Read before you answer. Each artifact is written to push motive, contradiction, and risk.
          </p>
          <div className="play-ops-log">
            {artifactCards.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No artifact cards are loaded for this story package.</p>
            ) : (
              artifactCards.map((artifact) => (
                <article key={artifact.id} className="play-ops-log-item">
                  <strong>{artifact.title} ({artifact.type})</strong>
                  <span>{artifact.summary}</span>
                  <span><strong>Source:</strong> {artifact.source}</span>
                  <span><strong>Excerpt:</strong> {artifact.excerpt}</span>
                  <span><strong>Investigator Prompt:</strong> {artifact.investigatorPrompt}</span>
                </article>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="panel section-shell play-ops-grid">
        <article className="play-ops-card">
          <h2 style={{ marginTop: 0 }}>Field Operations</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Perform non-branch actions between major decisions to surface additional context.
          </p>
          <div className="play-ops-actions">
            <button
              type="button"
              onClick={() => performFieldAction('analyze_audio')}
              disabled={!currentBeat || (fieldActionHistory[currentBeat.id] ?? []).includes('analyze_audio')}
            >
              Analyze Audio
            </button>
            <button
              type="button"
              onClick={() => performFieldAction('interview_witness')}
              disabled={!currentBeat || (fieldActionHistory[currentBeat.id] ?? []).includes('interview_witness')}
            >
              Interview Witness
            </button>
            <button
              type="button"
              onClick={() => performFieldAction('review_evidence')}
              disabled={!currentBeat || (fieldActionHistory[currentBeat.id] ?? []).includes('review_evidence')}
            >
              Review Evidence
            </button>
            <button
              type="button"
              onClick={() => performFieldAction('trace_number')}
              disabled={!currentBeat || (fieldActionHistory[currentBeat.id] ?? []).includes('trace_number')}
            >
              Trace Number
            </button>
          </div>
          <div className="play-ops-log">
            {fieldOpsLog.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No operations logged yet.
              </p>
            ) : (
              fieldOpsLog.slice(-5).map((entry) => (
                <article key={entry.id} className="play-ops-log-item">
                  <strong>Day {entry.day}: {entry.title}</strong>
                  <span>{entry.detail}</span>
                </article>
              ))
            )}
          </div>
        </article>
        <article className="play-ops-card">
          <h2 style={{ marginTop: 0 }}>Mission Objectives</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Resolve objectives to keep momentum inside the recommended pacing window.
          </p>
          <ul className="objective-list">
            {unresolvedObjectives.map((objective) => (
              <li key={objective.id} className={objective.complete ? 'complete' : ''}>
                <strong>{objective.complete ? 'Complete' : 'Open'}:</strong> {objective.label}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>Investigation Board</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Suspects, locations, evidence links, and timeline reconstruction are mapped below.
        </p>
        <div className="investigation-board-grid">
          <div className="investigation-cover-card">
            {storyMediaPaths.cover ? (
              <img src={storyMediaPaths.cover} alt={`${dramaPack?.title ?? activeStoryTitle} cover`} />
            ) : (
              <div
                className="evidence-pull-card"
                style={{
                  minHeight: 260,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div>
                  <strong>Verified cover art pending rerun</strong>
                  <p style={{ marginBottom: 0 }}>
                    This story currently has no catalog-approved hero or cover image.
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="kicker">Case File</p>
              <h3 style={{ margin: '8px 0 4px' }}>{dramaPack?.title ?? activeStoryTitle}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {dramaPack?.hook ??
                  'Branching clues, suspect pressure, and antagonist escalation across channels.'}
              </p>
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Nodes</h3>
            <ul className="plain-list">
              {(dramaPack?.investigationBoard.nodes ?? []).map((node) => (
                <li key={node.id}>
                  <strong>{node.label}</strong>
                  <span>{node.type.toLowerCase()} - {node.summary}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Evidence Pulls</h3>
            <div className="evidence-thumb-grid">
              {verifiedEvidenceCards.length === 0 ? (
                <article className="evidence-pull-card">
                  <h4>No evidence unlocked yet</h4>
                  <p>Progress the current beat to surface the first pull.</p>
                </article>
              ) : (
                verifiedEvidenceCards.map((card) => (
                  <article key={card.id} className="evidence-pull-card">
                    {card.imagePath ? (
                      <img
                        src={card.imagePath}
                        alt={card.title}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: 140,
                          objectFit: 'cover',
                          borderRadius: 10,
                          marginBottom: 10
                        }}
                      />
                    ) : null}
                    <h4>{card.title}</h4>
                    <p>{card.summary}</p>
                    {card.meta ? (
                      <p className="muted" style={{ marginBottom: 0 }}>
                        Source: {card.meta}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Timeline</h3>
            <ul className="plain-list">
              {(dramaPack?.investigationBoard.timeline ?? []).map((item) => (
                <li key={item.id}>
                  <strong>{item.timeLabel}</strong>
                  <span>{item.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel section-shell play-puzzle-grid">
        <article className="play-puzzle-card">
          <h2 style={{ marginTop: 0 }}>Community Puzzle Board</h2>
          {activePuzzle ? (
            <>
              <p className="kicker" style={{ marginBottom: 8 }}>Puzzle: {activePuzzle.title}</p>
              <p style={{ marginTop: 0 }}>{activePuzzle.objective}</p>
              <div className="puzzle-shard-list">
                {activePuzzle.shards.map((shard) => {
                  const unlocked = unlockedShardIds.includes(shard.id);
                  return (
                    <article key={shard.id} className={`puzzle-shard ${unlocked ? 'unlocked' : ''}`}>
                      <strong>{shard.heldBy}</strong>
                      <span>{unlocked ? shard.content : 'Locked shard - run field operations to unlock.'}</span>
                    </article>
                  );
                })}
              </div>
              <form className="play-cipher-form" onSubmit={submitCommunityPuzzle}>
                <label htmlFor="community-puzzle-input">
                  Enter keyword
                  <input
                    id="community-puzzle-input"
                    value={puzzleInput}
                    onChange={(event) => setPuzzleInput(event.target.value)}
                    placeholder="Keyword from shard pattern"
                  />
                </label>
                <button type="submit">Submit Keyword</button>
              </form>
              <p className="muted" style={{ marginBottom: 4 }}>
                Unlocked shards: {unlockedPuzzleShards.length} / {activePuzzle.shards.length}
              </p>
              <p
                className={
                  puzzleStatus === 'solved'
                    ? 'form-success'
                    : puzzleStatus === 'failed'
                      ? 'form-error'
                      : 'muted'
                }
                style={{ marginBottom: 4 }}
              >
                {puzzleStatus === 'solved'
                  ? `Puzzle solved. Reward clue unlocked: ${activePuzzle.rewardClueId}.`
                  : puzzleStatus === 'failed'
                    ? 'Keyword mismatch. Re-read shard details and timeline notes.'
                    : 'Collect shards and infer the keyword before submission.'}
              </p>
              <p className="muted" style={{ marginBottom: 0 }}>
                Attempts: {puzzleAttempts} · Failure consequence: {activePuzzle.failureConsequence}
              </p>
            </>
          ) : (
            <p className="muted">No puzzle configured for this case package.</p>
          )}
        </article>

        <article className="play-puzzle-card">
          <h2 style={{ marginTop: 0 }}>Visual Evidence Gallery</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            AI-generated story visuals are surfaced here for scene context, clues, and character recognition.
          </p>
          <div className="visual-gallery-grid">
            {resolvedVisualGallery.map((asset) => (
              <figure key={asset.id} className="visual-gallery-item">
                <img src={asset.path} alt={asset.title} loading="lazy" />
                <figcaption>
                  <strong>{asset.title}</strong>
                  <span>{asset.promptHint}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          {resolvedVisualGallery.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              No verified visual assets are currently available for this story.
            </p>
          ) : null}
        </article>
      </div>

      <div className="panel section-shell play-cipher-panel">
        <h2 style={{ marginTop: 0 }}>Audio Cipher Lab</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Inspired by found-audio ARG flow: isolate repeated numbers, verify against call duration, and
          decode the access gate.
        </p>
        <div className="play-cipher-grid">
          <article className="play-cipher-card">
            <h3 style={{ marginTop: 0 }}>Decode Directive</h3>
            <ol className="play-cipher-steps">
              <li>Review repeated number fragments across transmissions.</li>
              <li>Correlate with the {cipherReference}.</li>
              <li>Enter the three-digit access code to unlock a hidden clue.</li>
            </ol>
            <p className="muted" style={{ margin: 0 }}>
              Hint: the same number appears across multiple puzzle prompts and resolves when audio speed
              changes.
            </p>
          </article>
          <article className="play-cipher-card">
            <h3 style={{ marginTop: 0 }}>Access Input</h3>
            <form className="play-cipher-form" onSubmit={submitAudioCipher}>
              <label htmlFor="audio-cipher-code">
                Three-digit code
                <input
                  id="audio-cipher-code"
                  data-testid="audio-cipher-input"
                  value={audioCipherInput}
                  onChange={(event) => setAudioCipherInput(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{3}"
                  maxLength={3}
                  placeholder="000"
                />
              </label>
              <button type="submit" data-testid="audio-cipher-submit">
                Decode Clip
              </button>
            </form>
            <p
              data-testid="audio-cipher-status"
              className={
                audioCipherStatus === 'solved'
                  ? 'form-success'
                  : audioCipherStatus === 'failed'
                    ? 'form-error'
                    : 'muted'
              }
              style={{ marginBottom: 6 }}
            >
              {audioCipherStatus === 'solved'
                ? 'Access granted. Hidden reel routed to incoming feed.'
                : audioCipherStatus === 'failed'
                  ? 'Code mismatch. Re-check the call-duration clue.'
                  : 'Awaiting first decode attempt.'}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Attempts: {audioCipherAttempts}
            </p>
          </article>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, padding: '20px 20px 0' }}>Evidence Board View Controls</h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 12, padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => zoomBy(10)} data-testid="zoom-in">
              Zoom In
            </button>
            <button type="button" onClick={() => zoomBy(-10)} data-testid="zoom-out">
              Zoom Out
            </button>
            <button type="button" onClick={resetView} data-testid="reset-view">
              Reset View
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => panBy(0, -PAN_STEP)} data-testid="pan-up">
              Pan Up
            </button>
            <button type="button" onClick={() => panBy(0, PAN_STEP)} data-testid="pan-down">
              Pan Down
            </button>
            <button type="button" onClick={() => panBy(-PAN_STEP, 0)} data-testid="pan-left">
              Pan Left
            </button>
            <button type="button" onClick={() => panBy(PAN_STEP, 0)} data-testid="pan-right">
              Pan Right
            </button>
          </div>
        </div>
        <div
          style={{
            height: 180,
            border: '1px solid #31394f',
            borderRadius: 10,
            overflow: 'hidden',
            position: 'relative',
            background: '#111827',
            margin: '0 20px'
          }}
        >
          <div
            role="application"
            aria-label="Evidence board viewport"
            data-testid="evidence-board-viewport"
            onWheel={onBoardWheel}
            onPointerDown={onBoardPointerDown}
            onPointerMove={onBoardPointerMove}
            onPointerUp={onBoardPointerUp}
            onPointerCancel={onBoardPointerUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              touchAction: 'none',
              userSelect: 'none'
            }}
          >
            <div
              data-testid="evidence-board-content"
              className="evidence-board-live-cluster"
              style={{
                transform: boardTransform,
                transformOrigin: 'center center',
                transition: dragAnchor.current ? 'none' : 'transform 120ms linear'
              }}
            >
              {boardClusterItems.map((item) => (
                <article key={item.id} className="evidence-board-node">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
        <p data-testid="zoom-status" style={{ marginBottom: 6, padding: '0 20px' }}>
          Zoom: {zoom}%
        </p>
        <p data-testid="pan-status" style={{ margin: 0, padding: '0 20px 20px' }}>
          Pan: x {pan.x}, y {pan.y}
        </p>
      </div>

      <div className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>AI Sound Director</h2>
        <p style={{ marginTop: 0 }}>
          Real-time score direction from progress, time of night, villain proximity, and incident danger.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="director-progress">
            Player Progress: {playerProgress}
            <input
              id="director-progress"
              data-testid="director-progress"
              type="range"
              min={0}
              max={100}
              value={playerProgress}
              onChange={(event) => setPlayerProgress(Number(event.target.value))}
            />
          </label>
          <label htmlFor="director-villain-proximity">
            Villain Proximity: {villainProximity}
            <input
              id="director-villain-proximity"
              data-testid="director-villain-proximity"
              type="range"
              min={0}
              max={100}
              value={villainProximity}
              onChange={(event) => setVillainProximity(Number(event.target.value))}
            />
          </label>
          <label htmlFor="director-danger">
            Danger Level: {dangerLevel}
            <input
              id="director-danger"
              data-testid="director-danger"
              type="range"
              min={0}
              max={100}
              value={dangerLevel}
              onChange={(event) => setDangerLevel(Number(event.target.value))}
            />
          </label>
          <label htmlFor="director-time">
            Time of Night: {timeOfNightHour}:00
            <input
              id="director-time"
              data-testid="director-time"
              type="range"
              min={0}
              max={23}
              value={timeOfNightHour}
              onChange={(event) => setTimeOfNightHour(Number(event.target.value))}
            />
          </label>
          <label htmlFor="director-location">
            Location
            <select
              id="director-location"
              data-testid="director-location"
              value={location}
              onChange={(event) => setLocation(event.target.value as HorrorMusicLocation)}
            >
              <option value="forest">Forest</option>
              <option value="basement">Basement</option>
              <option value="hospital">Hospital</option>
              <option value="alley">Alley</option>
              <option value="ritual_chamber">Ritual Chamber</option>
            </select>
          </label>
          <button
            type="button"
            data-testid="director-sync-time"
            onClick={() => setTimeOfNightHour(new Date().getHours())}
          >
            Sync To Current Hour
          </button>
        </div>
        <p data-testid="director-band" style={{ marginBottom: 6 }}>
          Director Cue: {directorDecision.bandLabel}
        </p>
        <p data-testid="director-tension" style={{ margin: 0 }}>
          Tension Score: {directorDecision.tension}
        </p>
      </div>

      <div className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>AI Narrator Audio Controls</h2>
        <p>Voice-enabled character events with fallback providers and cached clips.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button type="button" onClick={() => setPlaying(true)} data-testid="audio-play">
            Play
          </button>
          <button type="button" onClick={() => setPlaying(false)} data-testid="audio-pause">
            Pause
          </button>
          <button type="button" onClick={() => setMuted((current) => !current)} data-testid="audio-mute-toggle">
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={() => setSubtitles((current) => !current)}
            data-testid="subtitle-toggle"
          >
            {subtitles ? 'Hide Subtitles' : 'Show Subtitles'}
          </button>
        </div>
        <label htmlFor="audio-volume" style={{ display: 'block', marginBottom: 8 }}>
          Volume
        </label>
        <input
          id="audio-volume"
          data-testid="audio-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
        <p data-testid="audio-status" style={{ marginBottom: 6 }}>
          Audio: {playing ? 'Playing' : 'Paused'}
        </p>
        <p data-testid="audio-muted-status" style={{ marginBottom: 6 }}>
          Muted: {muted ? 'Yes' : 'No'}
        </p>
        <p data-testid="audio-volume-status" style={{ marginBottom: 6 }}>
          Volume: {volume}%
        </p>
        <p data-testid="subtitle-status" style={{ margin: 0 }}>
          Subtitles: {subtitles ? 'Enabled' : 'Disabled'}
        </p>
      </div>

      {activePopup ? (
        <aside className="message-popup panel" data-testid="message-popup">
          <p className="kicker" style={{ marginBottom: 8 }}>Incoming {activePopup.channel}</p>
          <h3 style={{ margin: '0 0 6px' }}>{activePopup.senderName}</h3>
          <p style={{ marginTop: 0 }}>{activePopup.text}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" data-testid="popup-acknowledge" onClick={acceptPopup}>
              Acknowledge
            </button>
            <button
              type="button"
              data-testid="popup-play-voice"
              onClick={() => speakVoiceLine(dramaPack, activePopup)}
            >
              Replay Voice
            </button>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

