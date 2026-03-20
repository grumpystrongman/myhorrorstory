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
import { getLaunchCaseById } from '../lib/launch-catalog';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const PAN_STEP = 24;
const SOUND_DIRECTOR_EVENT = 'myhorrorstory:sound-director-telemetry';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  const activeLaunchCase = getLaunchCaseById(storyId);
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
      hero: activeLaunchCase?.heroImagePath ?? `/visuals/stories/${storyId}.svg`,
      cover: activeLaunchCase?.coverImagePath ?? `/visuals/stories/${storyId}.svg`
    }),
    [activeLaunchCase?.coverImagePath, activeLaunchCase?.heroImagePath, storyId]
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
      : storyMediaPaths.hero;

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

  function clearBeatTimers(): void {
    for (const timeout of messageTimeouts.current) {
      window.clearTimeout(timeout);
    }
    messageTimeouts.current = [];
  }

  async function loadDramaPackage(nextStoryId: string): Promise<void> {
    setLoading(true);
    setLoadingError(null);
    clearBeatTimers();

    try {
      const response = await fetch(`/content/drama/${nextStoryId}.json`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`Unable to load drama package for ${nextStoryId}`);
      }
      const parsed = (await response.json()) as DramaPackage;
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
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to load story runtime package.');
    } finally {
      setLoading(false);
    }
  }

  function scheduleBeatMessages(messages: DramaMessage[]): void {
    clearBeatTimers();
    setIsSimulatingBeat(messages.length > 0);

    messages.forEach((message, index) => {
      const delayMs = 400 + index * 1500;
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

  function chooseResponse(option: DramaResponseOption): void {
    if (!dramaPack || !sessionState || !currentBeat) {
      return;
    }
    const result = applyResponseChoice(dramaPack, sessionState, currentBeat, option);
    setSessionState(result.nextState);
    setPlayerProgress(result.nextState.investigationProgress);
    setVillainProximity((current) => clamp(current + currentBeat.stage * 4 + option.reputationDelta.aggression, 0, 100));
    setDangerLevel((current) => clamp(current + currentBeat.stage * 5 + Math.max(0, option.reputationDelta.aggression), 0, 100));
    setPopupQueue([]);
    setActivePopup(null);

    if (result.nextState.complete) {
      const ending = resolveSessionEnding(dramaPack, result.nextState);
      setSessionEndingId(ending.id);
      setIsSimulatingBeat(false);
    }
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
    if (!currentBeat || !sessionState || sessionState.complete) {
      setIsSimulatingBeat(false);
      return;
    }
    const ordered = sortMessagesForFeed(currentBeat.incomingMessages);
    scheduleBeatMessages(ordered);
    return () => {
      clearBeatTimers();
    };
  }, [currentBeat?.id, sessionState?.complete, voiceDramaEnabled]);

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
            backgroundImage: `url(${beatBackgroundImage})`
          }}
        />
        <div className="play-session-hero-content">
          <p className="kicker">Live Runtime</p>
          <h1 style={{ fontFamily: 'Cinzel, serif', margin: '8px 0 4px' }}>Play Session</h1>
          <p className="section-copy">
            Simulated SMS, WhatsApp, Telegram, Signal, and email drops are delivered as in-app popups now.
            This flow is wired for future direct phone notification integrations.
          </p>
          <p data-testid="active-story" style={{ margin: 0, color: 'var(--muted)' }}>
            Active Story: {dramaPack?.title ?? activeStoryTitle}
          </p>
          <p data-testid="active-score" style={{ margin: 0, color: 'var(--muted)' }}>
            Score: {activeStoryTrack?.title ?? 'MHS Platform Overture'}
          </p>
          <div className="inline-links">
            <button type="button" onClick={restartSession}>Restart Session</button>
            <button type="button" onClick={() => setVoiceDramaEnabled((current) => !current)}>
              Voice Drama: {voiceDramaEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
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
                : isSimulatingBeat
                  ? 'New transmissions are arriving.'
                  : 'Awaiting your next decision.'}
          </p>
          <div className="play-channel-strip">
            {(dramaPack?.channels ?? ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL']).slice(0, 6).map((channel) => (
              <span key={channel} className="play-channel-pill">{channel}</span>
            ))}
          </div>
          <div className="play-feed-list" data-testid="message-feed">
            {messageFeed.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No transmissions yet.</p>
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
                disabled={loading || isSimulatingBeat || Boolean(sessionState?.complete)}
              >
                <strong>{option.label}</strong>
                <small>{option.summary}</small>
              </button>
            ))}
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

      <div className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>Investigation Board</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Suspects, locations, evidence links, and timeline reconstruction are surfaced below.
        </p>
        <div className="investigation-board-grid">
          <div className="investigation-cover-card">
            <img src={storyMediaPaths.cover} alt={`${dramaPack?.title ?? activeStoryTitle} cover`} />
            <div>
              <p className="kicker">Case File</p>
              <h3 style={{ margin: '8px 0 4px' }}>{dramaPack?.title ?? activeStoryTitle}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {dramaPack?.hook ??
                  'Branching clues, suspect pressure, and villain escalation across channels.'}
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
              {evidenceNodes.length === 0 ? (
                <article className="evidence-pull-card">
                  <h4>No evidence unlocked yet</h4>
                  <p>Progress the current beat to surface the first pull.</p>
                </article>
              ) : (
                evidenceNodes.map((node) => (
                  <article key={node.id} className="evidence-pull-card">
                    <h4>{node.label}</h4>
                    <p>{node.summary}</p>
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
          Real-time score direction from progress, time of night, villain proximity, and danger.
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
