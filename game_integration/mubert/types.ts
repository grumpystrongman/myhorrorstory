export type HorrorGameState =
  | 'exploration'
  | 'safe_room'
  | 'tension_rising'
  | 'enemy_nearby'
  | 'chase'
  | 'boss_encounter'
  | 'post_scare_cooldown'
  | 'death_game_over';

export type MubertIntensity = 'low' | 'medium' | 'high';
export type MubertFormat = 'wav' | 'mp3';

export interface MubertCredentials {
  /**
   * Insert your own customer id from Mubert dashboard.
   * Do not hardcode production secrets in source control.
   */
  customerId: string;
  /**
   * Insert your own access token from Mubert dashboard.
   * Do not hardcode production secrets in source control.
   */
  accessToken: string;
}

export interface MubertTrackRequestBody {
  playlist_index: string;
  duration: number;
  bitrate: 64 | 128 | 320;
  format: MubertFormat;
  intensity: MubertIntensity;
  mode: 'track';
}

export interface MubertStreamingRequestBody {
  playlist_index: string;
  bitrate: 64 | 128 | 320;
  intensity: MubertIntensity;
  type: 'http' | 'webrtc';
}

export interface MubertStateProfile {
  state: HorrorGameState;
  playlistIndex: string;
  intensity: MubertIntensity;
  durationSec: number;
  bitrate: 64 | 128 | 320;
  format: MubertFormat;
  theme: string;
  fallbackLoopUrl: string;
}

export interface AdaptiveStateInput {
  enemyProximity: number; // 0..1 (0 far, 1 immediate)
  playerHealth: number; // 0..100
  alertLevel: number; // 0..100
  inChase: boolean;
  inBossEncounter: boolean;
  inSafeRoom: boolean;
  recentlyScared: boolean;
  dead: boolean;
}
