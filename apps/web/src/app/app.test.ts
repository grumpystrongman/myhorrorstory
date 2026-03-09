import { describe, expect, it } from 'vitest';
import { getLaunchCases } from './lib/launch-catalog';

describe('web catalog smoke', () => {
  it('includes launch and short-mode stories', () => {
    const stories = getLaunchCases();
    expect(stories.length).toBe(11);
    const shortMode = stories.find((story) => story.storyId === 'midnight-lockbox');
    expect(shortMode?.mode).toBe('short-test');
    expect(shortMode?.visualPath).toContain('/visuals/stories/midnight-lockbox.svg');
  });
});

