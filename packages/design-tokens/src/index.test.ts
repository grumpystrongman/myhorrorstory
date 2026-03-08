import { describe, expect, it } from 'vitest';
import { tokens } from './index';

describe('design tokens', () => {
  it('exposes accent color', () => {
    expect(tokens.color.accent).toBe('#bf8b30');
  });
});
