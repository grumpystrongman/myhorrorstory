import type { HorrorGameState, MubertStateProfile } from './types';

/**
 * NOTE:
 * `playlistIndex` values are placeholders by design and should be replaced
 * with your own validated Mubert channels/playlists for production.
 */
export const HORROR_STATE_MAP: Record<HorrorGameState, MubertStateProfile> = {
  exploration: {
    state: 'exploration',
    playlistIndex: '1.0.0',
    intensity: 'low',
    durationSec: 120,
    bitrate: 320,
    format: 'wav',
    theme: 'dark_ambient_decay',
    fallbackLoopUrl: '/audio/fallback/exploration_loop.wav'
  },
  safe_room: {
    state: 'safe_room',
    playlistIndex: '1.0.1',
    intensity: 'low',
    durationSec: 90,
    bitrate: 320,
    format: 'wav',
    theme: 'muted_relief_with_dread_residue',
    fallbackLoopUrl: '/audio/fallback/safe_room_loop.wav'
  },
  tension_rising: {
    state: 'tension_rising',
    playlistIndex: '1.1.0',
    intensity: 'medium',
    durationSec: 90,
    bitrate: 320,
    format: 'wav',
    theme: 'irregular_pulse_paranoia',
    fallbackLoopUrl: '/audio/fallback/tension_loop.wav'
  },
  enemy_nearby: {
    state: 'enemy_nearby',
    playlistIndex: '1.1.1',
    intensity: 'medium',
    durationSec: 75,
    bitrate: 320,
    format: 'wav',
    theme: 'predator_proximity_pressure',
    fallbackLoopUrl: '/audio/fallback/enemy_nearby_loop.wav'
  },
  chase: {
    state: 'chase',
    playlistIndex: '1.2.0',
    intensity: 'high',
    durationSec: 65,
    bitrate: 320,
    format: 'wav',
    theme: 'industrial_pursuit_terror',
    fallbackLoopUrl: '/audio/fallback/chase_loop.wav'
  },
  boss_encounter: {
    state: 'boss_encounter',
    playlistIndex: '1.3.0',
    intensity: 'high',
    durationSec: 80,
    bitrate: 320,
    format: 'wav',
    theme: 'ritual_colossus_dread',
    fallbackLoopUrl: '/audio/fallback/boss_loop.wav'
  },
  post_scare_cooldown: {
    state: 'post_scare_cooldown',
    playlistIndex: '1.0.2',
    intensity: 'low',
    durationSec: 60,
    bitrate: 320,
    format: 'wav',
    theme: 'shocked_breath_recovery',
    fallbackLoopUrl: '/audio/fallback/post_scare_loop.wav'
  },
  death_game_over: {
    state: 'death_game_over',
    playlistIndex: '1.9.0',
    intensity: 'low',
    durationSec: 45,
    bitrate: 320,
    format: 'wav',
    theme: 'void_after_failure',
    fallbackLoopUrl: '/audio/fallback/death_loop.wav'
  }
};
