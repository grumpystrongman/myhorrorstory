'use client';

import {
  AISoundDirector,
  createSoundDirectorLoop,
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

export function SoundtrackPlayer(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId');
  const track = useMemo(() => resolveScoreTrack({ pathname, storyId }), [pathname, storyId]);
  const isPlayRoute = pathname.startsWith('/play');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dynamicUrlRef = useRef<string | null>(null);
  const directorRef = useRef(new AISoundDirector());
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(46);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dynamicSrc, setDynamicSrc] = useState<string | null>(null);
  const [dynamicBandLabel, setDynamicBandLabel] = useState<string | null>(null);
  const [dynamicTension, setDynamicTension] = useState<number | null>(null);
  const [directorTelemetry, setDirectorTelemetry] = useState<SoundDirectorTelemetry | null>(null);
  const activeSource = isPlayRoute && dynamicSrc ? dynamicSrc : track.src;
  const displayTrackLabel = isPlayRoute && dynamicBandLabel ? `${track.title} · ${dynamicBandLabel}` : track.title;
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
      if (dynamicUrlRef.current) {
        URL.revokeObjectURL(dynamicUrlRef.current);
        dynamicUrlRef.current = null;
      }
      return;
    }

    const progressBucket = Math.round(directorTelemetry.playerProgress / 10) * 10;
    const proximityBucket = Math.round(directorTelemetry.villainProximity / 10) * 10;
    const dangerBucket = Math.round(directorTelemetry.dangerLevel / 10) * 10;
    const hourBucket = Math.floor(directorTelemetry.timeOfNightHour);
    const seed = [
      storyId ?? 'freeplay',
      directorTelemetry.storyMood,
      directorTelemetry.location,
      progressBucket,
      proximityBucket,
      dangerBucket,
      hourBucket
    ].join(':');

    const output = createSoundDirectorLoop(directorTelemetry, {
      sampleRate: 12000,
      seed,
      director: directorRef.current
    });

    const blobBytes = new Uint8Array(output.loop.wavBytes.length);
    blobBytes.set(output.loop.wavBytes);
    const blob = new Blob([blobBytes], { type: 'audio/wav' });
    const nextUrl = URL.createObjectURL(blob);

    if (dynamicUrlRef.current) {
      URL.revokeObjectURL(dynamicUrlRef.current);
    }
    dynamicUrlRef.current = nextUrl;
    setDynamicSrc(nextUrl);
    setDynamicBandLabel(output.decision.bandLabel);
    setDynamicTension(output.decision.tension);
  }, [directorTelemetry, isPlayRoute, storyId]);

  useEffect(() => {
    return () => {
      if (dynamicUrlRef.current) {
        URL.revokeObjectURL(dynamicUrlRef.current);
        dynamicUrlRef.current = null;
      }
    };
  }, []);

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

  return (
    <div
      className="panel"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 320,
        zIndex: 40,
        display: 'grid',
        gap: 8,
        backdropFilter: 'blur(6px)',
        background: 'rgba(17, 24, 39, 0.92)',
        border: '1px solid #3d2f1f'
      }}
    >
      <audio
        ref={audioRef}
        src={activeSource}
        preload="auto"
        data-testid="soundtrack-audio"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <p style={{ margin: 0, letterSpacing: '0.12em', color: 'var(--muted)' }}>SOUNDTRACK</p>
      <p data-testid="soundtrack-track" style={{ margin: 0, fontWeight: 600 }}>
        {displayTrackLabel}
      </p>
      <p data-testid="soundtrack-status" style={{ margin: 0, color: 'var(--muted)' }}>
        {displayStatus}
      </p>
      {isPlayRoute ? (
        <p data-testid="soundtrack-director-tension" style={{ margin: 0, color: 'var(--muted)' }}>
          Tension: {dynamicTension ?? 0}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" data-testid="soundtrack-toggle" onClick={togglePlayback}>
          {enabled ? 'Mute Score' : 'Enable Score'}
        </button>
        <label htmlFor="soundtrack-volume" style={{ fontSize: 13 }}>
          Volume
        </label>
        <input
          id="soundtrack-volume"
          data-testid="soundtrack-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
