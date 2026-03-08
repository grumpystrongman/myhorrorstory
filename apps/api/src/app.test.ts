import { describe, expect, it } from 'vitest';
import { PartiesService } from './parties/parties.service.js';

describe('api core services', () => {
  it('creates party', () => {
    const service = new PartiesService();
    const party = service.create({
      storyId: 'static-between-stations',
      mode: 'PARTY',
      hostless: false
    });

    expect(party.storyId).toBe('static-between-stations');
  });
});
