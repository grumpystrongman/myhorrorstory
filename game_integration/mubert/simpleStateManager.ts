import type { AdaptiveStateInput, HorrorGameState } from './types';

export class HorrorStateResolver {
  private scareCooldownUntil = 0;

  setRecentScare(durationMs = 9000): void {
    this.scareCooldownUntil = Date.now() + durationMs;
  }

  resolve(input: AdaptiveStateInput): HorrorGameState {
    if (input.recentlyScared) {
      this.setRecentScare();
    }

    if (input.dead || input.playerHealth <= 0) {
      return 'death_game_over';
    }

    if (input.inBossEncounter) {
      return 'boss_encounter';
    }

    if (input.inChase || input.enemyProximity >= 0.88) {
      return 'chase';
    }

    if (input.enemyProximity >= 0.62) {
      return 'enemy_nearby';
    }

    if (Date.now() < this.scareCooldownUntil) {
      return 'post_scare_cooldown';
    }

    if (input.inSafeRoom && input.alertLevel < 25) {
      return 'safe_room';
    }

    if (input.alertLevel >= 50 || input.enemyProximity >= 0.35) {
      return 'tension_rising';
    }

    return 'exploration';
  }
}
