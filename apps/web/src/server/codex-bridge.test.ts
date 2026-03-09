import { describe, expect, it } from 'vitest';
import { parseCodexEventLine } from './codex-bridge';

describe('codex bridge parser', () => {
  it('parses codex jsonl events', () => {
    const parsed = parseCodexEventLine(
      '{"type":"item.completed","item":{"type":"agent_message","text":"Ready"}}'
    );

    expect(parsed.kind).toBe('json');
    if (parsed.kind === 'json') {
      expect(parsed.event.type).toBe('item.completed');
    }
  });

  it('treats non-json lines as plain text', () => {
    const parsed = parseCodexEventLine('WARN codex_core::shell_snapshot unsupported');

    expect(parsed.kind).toBe('text');
    if (parsed.kind === 'text') {
      expect(parsed.text).toContain('WARN');
    }
  });
});
