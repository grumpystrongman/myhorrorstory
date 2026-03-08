import { describe, expect, it } from 'vitest';
import { createManifestEntry } from './index';

describe('media pipeline', () => {
  it('creates manifest entry with hash', () => {
    const entry = createManifestEntry({
      id: 'portrait-1',
      type: 'character_portrait',
      prompt: 'Weathered detective portrait, 35mm film grain',
      provider: 'openai',
      outputKey: 'assets/portrait-1.png'
    });

    expect(entry.promptHash.length).toBeGreaterThan(8);
  });
});
