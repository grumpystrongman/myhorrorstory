import { describe, expect, it } from 'vitest';
import { panelStyle } from './index';

describe('ui', () => {
  it('builds panel style', () => {
    const style = panelStyle();
    expect(style.backgroundColor).toBeDefined();
  });
});
