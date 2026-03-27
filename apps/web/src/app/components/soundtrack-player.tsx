'use client';

import {
  AISoundDirector,
  resolveScoreTrack,
  type HorrorMusicLocation,
  type SoundDirectorTelemetry
} from '@myhorrorstory/music';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const ENABLED_KEY = 'myhorrorstory.soundtrack.enabled';
const VOLUME_KEY = 'myhorrorstory.soundtrack.volume';
const SOUND_DIRECTOR_TELEMETRY_KEY = 'myhorrorstory.sound-director.telemetry';
const SOUND_DIRECTOR_EVENT = 'myhorrorstory:sound-director-telemetry';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHour(value: number): number {
  if (!Number.isFinite(value)) {
    return new Date().getHours();
  }
  const rounded = Math.floor(value);
  const wrapped = rounded % 24;
  return wrapped < 0 ? wrapped + 24 : wrapped;
}

function normalizeLocation(value: unknown): HorrorMusicLocation {
  const valid: HorrorMusicLocation[] = ['forest', 'basement', 'hospital', 'alley', 'ritual_chamber'];
  if (typeof value === 'string' && valid.includes(value as HorrorMusicLocation)) {
    return value as HorrorMusicLocation;
  }
  return 'basement';
}

function sanitizeTelemetry(
  input: Partial<SoundDirectorTelemetry> | null | undefined,
  fallbackMood: SoundDirectorTelemetry['storyMood']
): SoundDirectorTelemetry {
  return {
    playerProgress: clamp(Number(input?.playerProgress ?? 0), 0, 100),
    timeOfNightHour: normalizeHour(Number(input?.timeOfNightHour ?? new Date().getHours())),
    villainProximity: clamp(Number(input?.villainProximity ?? 0), 0, 100),
    dangerLevel: clamp(Number(input?.dangerLevel ?? 0), 0, 100),
    storyMood: input?.storyMood ?? fallbackMood,
    location: normalizeLocation(input?.location),
    sceneTypeHint: input?.sceneTypeHint
  };
}

function sanitizeStoryId(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function storyThemeLoopPath(storyId: string): string {
  return `/agent-army/stories/${storyId}/audio/story_theme_loop/${storyId}-story-theme-loop-v1.wav`;
}

function storyArcAmbiencePath(storyId: string, arc: 'contact' | 'disruption' | 'endgame'): string {
  return `/agent-army/stories/${storyId}/audio/arc_ambience/${storyId}-${storyId}-arc-${arc}-arc-ambience-v1.wav`;
}

function resolveDirectedScoreSource(
  storyId: string | null,
  band: 'calm_ambience' | 'suspense_drones' | 'heartbeat_percussion',
  fallbackSrc: string
): string {
  if (!storyId) {
    return fallbackSrc;
  }

  if (band === 'heartbeat_percussion') {
    return storyArcAmbiencePath(storyId, 'endgame');
  }
  if (band === 'suspense_drones') {
    return storyArcAmbiencePath(storyId, 'disruption');
  }

  return storyThemeLoopPath(storyId);
}

export function SoundtrackPlayer(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId');
  const track = useMemo(() => resolveScoreTrack({ pathname, storyId }), [pathname, storyId]);
  const isPlayRoute = pathname.startsWith('/play');
  const effectiveStoryId = sanitizeStoryId(storyId ?? track.storyId ?? null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const directorRef = useRef(new AISoundDirector());
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(46);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dynamicSrc, setDynamicSrc] = useState<string | null>(null);
  const [dynamicBandLabel, setDynamicBandLabel] = useState<string | null>(null);
  const [dynamicTension, setDynamicTension] = useState<number | null>(null);
  const [directorTelemetry, setDirectorTelemetry] = useState<SoundDirectorTelemetry | null>(null);
  const [compactUi, setCompactUi] = useState(false);
  const storyLoopSource = effectiveStoryId ? storyThemeLoopPath(effectiveStoryId) : null;
  const activeSource = isPlayRoute && dynamicSrc ? dynamicSrc : storyLoopSource ?? track.src;
  const displayTrackLabel = isPlayRoute && dynamicBandLabel ? `${track.title} - ${dynamicBandLabel}` : track.title;
  const displayStatus =
    enabled && isPlayRoute && dynamicBandLabel
      ? `${isPlaying ? 'Playing' : 'Ready'} (${dynamicBandLabel})`
      : enabled
        ? isPlaying
          ? 'Playing'
          : 'Ready'
        : 'Muted';

  useEffect(() => {
    const storedEnabled = window.localStorage.getItem(ENABLED_KEY);
    const storedVolume = window.localStorage.getItem(VOLUME_KEY);
    const storedTelemetry = window.localStorage.getItem(SOUND_DIRECTOR_TELEMETRY_KEY);

    if (storedEnabled !== null) {
      setEnabled(storedEnabled === 'true');
    }
    if (storedVolume !== null) {
      const parsedVolume = Number(storedVolume);
      if (Number.isFinite(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
        setVolume(parsedVolume);
      }
    }

    if (storedTelemetry) {
      try {
        const parsed = JSON.parse(storedTelemetry) as Partial<SoundDirectorTelemetry>;
        setDirectorTelemetry(sanitizeTelemetry(parsed, track.mood));
      } catch {
        setDirectorTelemetry(sanitizeTelemetry(null, track.mood));
      }
    } else {
      setDirectorTelemetry(sanitizeTelemetry(null, track.mood));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ENABLED_KEY, String(enabled));
  }, [enabled]);

  useEffect(() => {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    setDirectorTelemetry((current) => sanitizeTelemetry(current, track.mood));
  }, [track.mood]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1024px), (pointer: coarse)');
    const apply = (): void => setCompactUi(mediaQuery.matches);
    apply();

    mediaQuery.addEventListener('change', apply);
    return () => {
      mediaQuery.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event): void => {
      const custom = event as CustomEvent<Partial<SoundDirectorTelemetry>>;
      const nextTelemetry = sanitizeTelemetry(custom.detail, track.mood);
      setDirectorTelemetry(nextTelemetry);
      window.localStorage.setItem(SOUND_DIRECTOR_TELEMETRY_KEY, JSON.stringify(nextTelemetry));
    };

    window.addEventListener(SOUND_DIRECTOR_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SOUND_DIRECTOR_EVENT, handler as EventListener);
    };
  }, [track.mood]);

  useEffect(() => {
    if (!isPlayRoute || !directorTelemetry) {
      setDynamicBandLabel(null);
      setDynamicTension(null);
      setDynamicSrc(null);
      return;
    }

    const decision = directorRef.current.evaluate(directorTelemetry);
    const directedSource = resolveDirectedScoreSource(effectiveStoryId, decision.band, track.src);
    setDynamicSrc(directedSource);
    setDynamicBandLabel(decision.bandLabel);
    setDynamicTension(decision.tension);
  }, [directorTelemetry, effectiveStoryId, isPlayRoute, track.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume / 100;
    audio.loop = true;

    if (!enabled) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const playPromise = audio.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [activeSource, enabled, volume]);

  function togglePlayback(): void {
    setEnabled((current) => !current);
  }

  function handleAudioError(): void {
    if (isPlayRoute && dynamicSrc && dynamicSrc !== track.src) {
      setDynamicSrc(track.src);
      setDynamicBandLabel('Fallback Story Mix');
    }
  }

  return (
    <div className="soundtrack-top-control" data-testid="soundtrack-control">
      <audio
        ref={audioRef}
        src={activeSource}
        preload="auto"
        data-testid="soundtrack-audio"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleAudioError}
      />
      <div className="soundtrack-header-row">
        <p className="soundtrack-label">SOUNDTRACK</p>
        {isPlayRoute && !compactUi ? (
          <p data-testid="soundtrack-director-tension" className="soundtrack-meta">
            Tension: {dynamicTension ?? 0}
          </p>
        ) : null}
      </div>
      <p data-testid="soundtrack-track" className="soundtrack-track">
        {displayTrackLabel}
      </p>
      <p data-testid="soundtrack-status" className="soundtrack-meta">
        {displayStatus}
      </p>
      <div className="soundtrack-controls-row">
        <button type="button" data-testid="soundtrack-toggle" onClick={togglePlayback}>
          {enabled ? 'Mute Score' : 'Enable Score'}
        </button>
        {!compactUi ? (
          <>
            <label htmlFor="soundtrack-volume" className="soundtrack-volume-label">
              Volume
            </label>
            <input
              id="soundtrack-volume"
              data-testid="soundtrack-volume"
              className="soundtrack-volume-input"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

