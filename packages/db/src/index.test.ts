import { describe, expect, it } from 'vitest';
import { PrismaClient } from './index';

describe('db package', () => {
  it('exports PrismaClient', () => {
    expect(typeof PrismaClient).toBe('function');
  });
});
