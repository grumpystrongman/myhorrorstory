import { AdaptiveMusicManager } from './adaptiveMusicManager';
import { MubertClient } from './mubertClient';
import { HorrorStateResolver } from './simpleStateManager';
import type { AdaptiveStateInput } from './types';

/**
 * Example glue for browser games.
 * Replace state sampling with your engine/runtime data source.
 */
export async function startAdaptiveHorrorMusic(): Promise<AdaptiveMusicManager> {
  const client = new MubertClient({
    // Insert your own Mubert credentials through env/config at runtime.
    customerId: window.localStorage.getItem('mubert_customer_id') ?? 'REPLACE_ME',
    accessToken: window.localStorage.getItem('mubert_access_token') ?? 'REPLACE_ME'
  });
  const music = new AdaptiveMusicManager(client, {
    crossfadeMs: 2600,
    stateDebounceMs: 700,
    minTransitionIntervalMs: 1200,
    volume: 0.72
  });
  const resolver = new HorrorStateResolver();

  await music.prime('exploration');

  const tick = () => {
    const runtimeState: AdaptiveStateInput = readGameState();
    const nextState = resolver.resolve(runtimeState);
    music.setState(nextState);
  };

  // Polling is intentionally simple; event-driven updates are better when available.
  const interval = window.setInterval(tick, 300);

  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
    music.stop();
  });

  return music;
}

function readGameState(): AdaptiveStateInput {
  // Replace this mock with real game state:
  // proximity from AI system, health from player state, alert from director system, etc.
  return {
    enemyProximity: Number((window as Window & { enemyProximity?: number }).enemyProximity ?? 0.1),
    playerHealth: Number((window as Window & { playerHealth?: number }).playerHealth ?? 100),
    alertLevel: Number((window as Window & { alertLevel?: number }).alertLevel ?? 10),
    inChase: Boolean((window as Window & { inChase?: boolean }).inChase ?? false),
    inBossEncounter: Boolean(
      (window as Window & { inBossEncounter?: boolean }).inBossEncounter ?? false
    ),
    inSafeRoom: Boolean((window as Window & { inSafeRoom?: boolean }).inSafeRoom ?? false),
    recentlyScared: Boolean(
      (window as Window & { recentlyScared?: boolean }).recentlyScared ?? false
    ),
    dead: Boolean((window as Window & { dead?: boolean }).dead ?? false)
  };
}
