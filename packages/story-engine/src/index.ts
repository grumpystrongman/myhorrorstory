import type { StoryBeat, StoryPackage } from '@myhorrorstory/contracts';

export interface StoryRuntimeState {
  flags: Record<string, string | number | boolean>;
  clues: Set<string>;
  score: number;
}

function checkCondition(
  condition: StoryBeat['requiredConditions'][number],
  state: StoryRuntimeState
): boolean {
  switch (condition.type) {
    case 'FLAG':
      return state.flags[condition.key] === condition.value;
    case 'SCORE_AT_LEAST':
      return state.score >= Number(condition.value);
    case 'HAS_CLUE':
      return state.clues.has(String(condition.value));
    case 'CHOICE_EQUALS':
      return state.flags[condition.key] === condition.value;
    default:
      return false;
  }
}

export function isBeatUnlocked(beat: StoryBeat, state: StoryRuntimeState): boolean {
  return beat.requiredConditions.every((condition) => checkCondition(condition, state));
}

export function getUnlockedBeats(story: StoryPackage, state: StoryRuntimeState): StoryBeat[] {
  const beats: StoryBeat[] = [];
  for (const act of story.acts) {
    for (const beat of act.beats) {
      if (isBeatUnlocked(beat, state)) {
        beats.push(beat);
      }
    }
  }

  return beats;
}

export function applyChoice(
  state: StoryRuntimeState,
  effects: Record<string, string | number | boolean>
): StoryRuntimeState {
  const nextFlags = { ...state.flags };
  let nextScore = state.score;

  for (const [key, value] of Object.entries(effects)) {
    if (key === 'scoreDelta' && typeof value === 'number') {
      nextScore += value;
      continue;
    }

    nextFlags[key] = value;
  }

  return {
    flags: nextFlags,
    clues: new Set(state.clues),
    score: nextScore
  };
}

export function revealClues(state: StoryRuntimeState, clueIds: string[]): StoryRuntimeState {
  const next = new Set(state.clues);
  for (const clueId of clueIds) {
    next.add(clueId);
  }

  return {
    flags: { ...state.flags },
    clues: next,
    score: state.score
  };
}
