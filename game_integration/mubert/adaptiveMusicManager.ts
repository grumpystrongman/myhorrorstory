import { HORROR_STATE_MAP } from './stateMap';
import { MubertApiError, MubertClient } from './mubertClient';
import type { HorrorGameState, MubertStateProfile } from './types';

interface AdaptiveMusicManagerOptions {
  crossfadeMs?: number;
  stateDebounceMs?: number;
  minTransitionIntervalMs?: number;
  volume?: number;
  useStreaming?: boolean;
}

export class AdaptiveMusicManager {
  private readonly crossfadeMs: number;
  private readonly stateDebounceMs: number;
  private readonly minTransitionIntervalMs: number;
  private readonly useStreaming: boolean;
  private readonly cache = new Map<HorrorGameState, string>();
  private readonly preloadJobs = new Map<HorrorGameState, Promise<void>>();
  private readonly players = {
    a: new Audio(),
    b: new Audio()
  };
  private activePlayerKey: 'a' | 'b' = 'a';
  private currentState: HorrorGameState | null = null;
  private pendingState: HorrorGameState | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTransitionAt = 0;
  private baseVolume: number;

  constructor(
    private readonly client: MubertClient,
    options: AdaptiveMusicManagerOptions = {}
  ) {
    this.crossfadeMs = options.crossfadeMs ?? 2800;
    this.stateDebounceMs = options.stateDebounceMs ?? 800;
    this.minTransitionIntervalMs = options.minTransitionIntervalMs ?? 1200;
    this.baseVolume = options.volume ?? 0.72;
    this.useStreaming = options.useStreaming ?? false;

    this.players.a.loop = true;
    this.players.b.loop = true;
    this.players.a.preload = 'auto';
    this.players.b.preload = 'auto';
    this.players.a.volume = this.baseVolume;
    this.players.b.volume = 0;
  }

  async prime(initialState: HorrorGameState): Promise<void> {
    const profile = HORROR_STATE_MAP[initialState];
    const url = await this.resolveUrl(profile);
    const player = this.players[this.activePlayerKey];
    player.src = url;
    player.currentTime = 0;
    await this.playSilently(player);
    player.volume = this.baseVolume;
    this.currentState = initialState;
    this.lastTransitionAt = Date.now();
    void this.preloadLikelyNeighbors(initialState);
  }

  setState(nextState: HorrorGameState): void {
    if (this.pendingState === nextState || this.currentState === nextState) {
      return;
    }
    this.pendingState = nextState;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      const target = this.pendingState;
      this.pendingState = null;
      if (!target) {
        return;
      }
      void this.transitionTo(target);
    }, this.stateDebounceMs);
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const player of Object.values(this.players)) {
      player.pause();
      player.src = '';
    }
    this.currentState = null;
    this.pendingState = null;
  }

  private async transitionTo(nextState: HorrorGameState): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastTransitionAt;
    if (elapsed < this.minTransitionIntervalMs) {
      const waitFor = this.minTransitionIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitFor));
    }

    if (this.currentState === nextState) {
      return;
    }

    const profile = HORROR_STATE_MAP[nextState];
    const url = await this.resolveUrl(profile);
    const incomingKey: 'a' | 'b' = this.activePlayerKey === 'a' ? 'b' : 'a';
    const outgoingKey: 'a' | 'b' = this.activePlayerKey;
    const incoming = this.players[incomingKey];
    const outgoing = this.players[outgoingKey];

    incoming.loop = true;
    incoming.src = url;
    incoming.currentTime = 0;
    incoming.volume = 0;
    await this.playSilently(incoming);
    await this.crossfade(outgoing, incoming, this.crossfadeMs);
    outgoing.pause();

    this.activePlayerKey = incomingKey;
    this.currentState = nextState;
    this.lastTransitionAt = Date.now();
    void this.preloadLikelyNeighbors(nextState);
  }

  private async resolveUrl(profile: MubertStateProfile): Promise<string> {
    const cached = this.cache.get(profile.state);
    if (cached) {
      return cached;
    }
    try {
      const url = this.useStreaming
        ? await this.client.requestStreamingUrl({
            playlist_index: profile.playlistIndex,
            bitrate: profile.bitrate,
            intensity: profile.intensity,
            type: 'http'
          })
        : await this.client.requestTrackUrl({
            playlist_index: profile.playlistIndex,
            duration: profile.durationSec,
            bitrate: profile.bitrate,
            format: profile.format,
            intensity: profile.intensity,
            mode: 'track'
          });
      this.cache.set(profile.state, url);
      return url;
    } catch (error) {
      if (error instanceof MubertApiError) {
        console.warn(`[music] mubert fallback for ${profile.state}`, error.message);
      } else {
        console.warn(`[music] unexpected fallback for ${profile.state}`, error);
      }
      return profile.fallbackLoopUrl;
    }
  }

  private async preloadLikelyNeighbors(state: HorrorGameState): Promise<void> {
    const neighbors: HorrorGameState[] = this.pickNeighborStates(state);
    for (const neighbor of neighbors) {
      if (this.cache.has(neighbor) || this.preloadJobs.has(neighbor)) {
        continue;
      }
      const job = this.resolveUrl(HORROR_STATE_MAP[neighbor])
        .then((url) => {
          this.cache.set(neighbor, url);
        })
        .finally(() => {
          this.preloadJobs.delete(neighbor);
        });
      this.preloadJobs.set(neighbor, job);
      await job;
    }
  }

  private pickNeighborStates(state: HorrorGameState): HorrorGameState[] {
    switch (state) {
      case 'exploration':
        return ['tension_rising', 'safe_room'];
      case 'safe_room':
        return ['exploration', 'post_scare_cooldown'];
      case 'tension_rising':
        return ['enemy_nearby', 'exploration'];
      case 'enemy_nearby':
        return ['chase', 'tension_rising'];
      case 'chase':
        return ['enemy_nearby', 'death_game_over'];
      case 'boss_encounter':
        return ['chase', 'death_game_over'];
      case 'post_scare_cooldown':
        return ['exploration', 'tension_rising'];
      case 'death_game_over':
      default:
        return ['post_scare_cooldown', 'exploration'];
    }
  }

  private async crossfade(outgoing: HTMLAudioElement, incoming: HTMLAudioElement, durationMs: number): Promise<void> {
    if (durationMs <= 0) {
      outgoing.volume = 0;
      incoming.volume = this.baseVolume;
      return;
    }

    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (time: number) => {
        const elapsed = time - start;
        const t = Math.min(1, elapsed / durationMs);
        // Equal power fade for smooth psychoacoustic transition.
        const outgoingGain = Math.cos((t * Math.PI) / 2);
        const incomingGain = Math.sin((t * Math.PI) / 2);
        outgoing.volume = this.baseVolume * outgoingGain;
        incoming.volume = this.baseVolume * incomingGain;
        if (t >= 1) {
          outgoing.volume = 0;
          incoming.volume = this.baseVolume;
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  private async playSilently(player: HTMLAudioElement): Promise<void> {
    try {
      await player.play();
    } catch (error) {
      // Most browsers require user gesture before audio playback.
      console.warn('[music] playback blocked until user interaction', error);
    }
  }
}
