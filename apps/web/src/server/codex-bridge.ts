import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type CodexSessionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface CodexBridgeJsonEvent {
  type: string;
  [key: string]: unknown;
}

export interface CodexBridgeEvent {
  id: string;
  at: string;
  source: 'system' | 'stdout' | 'stderr';
  kind: 'status' | 'prompt' | 'json' | 'log' | 'error';
  text?: string;
  payload?: CodexBridgeJsonEvent;
}

export interface CodexSessionSummary {
  id: string;
  title: string;
  threadId: string | null;
  status: CodexSessionStatus;
  createdAt: string;
  updatedAt: string;
  lastPrompt: string | null;
  lastAssistantMessage: string | null;
  eventCount: number;
  promptCount: number;
  errorMessage: string | null;
}

export interface CodexSessionDetail {
  session: CodexSessionSummary;
  prompts: string[];
  events: CodexBridgeEvent[];
}

type SessionListener = (event: CodexBridgeEvent, summary: CodexSessionSummary) => void;

interface CodexSessionState {
  id: string;
  title: string;
  threadId: string | null;
  status: CodexSessionStatus;
  createdAt: string;
  updatedAt: string;
  lastPrompt: string | null;
  lastAssistantMessage: string | null;
  promptHistory: string[];
  events: CodexBridgeEvent[];
  listeners: Set<SessionListener>;
  process: ChildProcessWithoutNullStreams | null;
  errorMessage: string | null;
}

interface BridgeState {
  sessions: Map<string, CodexSessionState>;
  order: string[];
}

const GLOBAL_STATE_KEY = '__myhorrorstory_codex_bridge_state__';
const MAX_EVENTS_PER_SESSION = 500;

function getBridgeState(): BridgeState {
  const globalState = globalThis as Record<string, unknown>;
  if (!globalState[GLOBAL_STATE_KEY]) {
    globalState[GLOBAL_STATE_KEY] = {
      sessions: new Map<string, CodexSessionState>(),
      order: []
    } satisfies BridgeState;
  }

  return globalState[GLOBAL_STATE_KEY] as BridgeState;
}

function detectCodexWorkdir(): string {
  const explicitWorkdir = process.env.CODEX_BRIDGE_WORKDIR;
  if (explicitWorkdir) {
    return resolve(explicitWorkdir);
  }

  const cwd = process.cwd();
  if (existsSync(resolve(cwd, '.git'))) {
    return cwd;
  }

  const repoCandidate = resolve(cwd, '..', '..');
  if (existsSync(resolve(repoCandidate, '.git'))) {
    return repoCandidate;
  }

  return cwd;
}

function codexCommand(): string {
  return process.env.CODEX_BRIDGE_COMMAND ?? 'codex';
}

function toSummary(session: CodexSessionState): CodexSessionSummary {
  return {
    id: session.id,
    title: session.title,
    threadId: session.threadId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastPrompt: session.lastPrompt,
    lastAssistantMessage: session.lastAssistantMessage,
    eventCount: session.events.length,
    promptCount: session.promptHistory.length,
    errorMessage: session.errorMessage
  };
}

function bumpSession(session: CodexSessionState): void {
  session.updatedAt = new Date().toISOString();
}

function notify(session: CodexSessionState, event: CodexBridgeEvent): void {
  const summary = toSummary(session);
  for (const listener of session.listeners) {
    listener(event, summary);
  }
}

function appendEvent(
  session: CodexSessionState,
  input: Omit<CodexBridgeEvent, 'id' | 'at'>
): CodexBridgeEvent {
  const event: CodexBridgeEvent = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...input
  };

  session.events.push(event);
  if (session.events.length > MAX_EVENTS_PER_SESSION) {
    session.events.splice(0, session.events.length - MAX_EVENTS_PER_SESSION);
  }

  bumpSession(session);
  notify(session, event);
  return event;
}

export function parseCodexEventLine(line: string): { kind: 'json'; event: CodexBridgeJsonEvent } | { kind: 'text'; text: string } {
  try {
    const parsed = JSON.parse(line) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      typeof (parsed as { type: unknown }).type === 'string'
    ) {
      return { kind: 'json', event: parsed as CodexBridgeJsonEvent };
    }
  } catch {
    // Line is not JSON; treat as plain text log.
  }

  return { kind: 'text', text: line };
}

function wireLineReader(
  stream: NodeJS.ReadableStream | null,
  onLine: (line: string) => void
): void {
  if (!stream) {
    return;
  }

  let buffer = '';
  stream.on('data', (chunk: Buffer | string) => {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    let lineBreakIndex = buffer.indexOf('\n');
    while (lineBreakIndex >= 0) {
      const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, '');
      buffer = buffer.slice(lineBreakIndex + 1);
      if (line.trim().length > 0) {
        onLine(line);
      }
      lineBreakIndex = buffer.indexOf('\n');
    }
  });

  stream.on('end', () => {
    const remainder = buffer.trim();
    if (remainder.length > 0) {
      onLine(remainder);
    }
  });
}

function deriveTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 52) {
    return normalized;
  }
  return `${normalized.slice(0, 49)}...`;
}

function startPromptRun(session: CodexSessionState, prompt: string): void {
  if (session.process) {
    throw new Error('session_busy');
  }

  const command = codexCommand();
  const args =
    session.threadId === null
      ? ['exec', '--json', prompt]
      : ['exec', 'resume', '--json', session.threadId, prompt];

  session.status = 'running';
  session.errorMessage = null;
  session.lastPrompt = prompt;
  session.promptHistory.push(prompt);
  appendEvent(session, {
    source: 'system',
    kind: 'prompt',
    text: prompt
  });
  appendEvent(session, {
    source: 'system',
    kind: 'status',
    text: 'Codex run started'
  });

  const child = spawn(command, args, {
    cwd: detectCodexWorkdir(),
    env: process.env
  });
  session.process = child;

  wireLineReader(child.stdout, (line) => {
    const parsed = parseCodexEventLine(line);
    if (parsed.kind === 'json') {
      appendEvent(session, {
        source: 'stdout',
        kind: 'json',
        payload: parsed.event
      });

      if (parsed.event.type === 'thread.started') {
        const threadId = parsed.event.thread_id;
        if (typeof threadId === 'string' && threadId.length > 0) {
          session.threadId = threadId;
          bumpSession(session);
        }
      }

      if (parsed.event.type === 'item.completed') {
        const item = parsed.event.item;
        if (
          typeof item === 'object' &&
          item !== null &&
          (item as { type?: unknown }).type === 'agent_message'
        ) {
          const text = (item as { text?: unknown }).text;
          if (typeof text === 'string' && text.trim().length > 0) {
            session.lastAssistantMessage = text;
            bumpSession(session);
          }
        }
      }
      return;
    }

    appendEvent(session, {
      source: 'stdout',
      kind: 'log',
      text: parsed.text
    });
  });

  wireLineReader(child.stderr, (line) => {
    appendEvent(session, {
      source: 'stderr',
      kind: 'log',
      text: line
    });
  });

  child.on('error', (error) => {
    session.status = 'failed';
    session.errorMessage = error.message;
    session.process = null;
    appendEvent(session, {
      source: 'system',
      kind: 'error',
      text: `Failed to execute Codex command: ${error.message}`
    });
  });

  child.on('close', (code) => {
    session.process = null;
    if (code === 0) {
      session.status = 'completed';
      appendEvent(session, {
        source: 'system',
        kind: 'status',
        text: 'Codex run completed'
      });
      return;
    }

    session.status = 'failed';
    session.errorMessage = `Codex process exited with code ${code ?? -1}`;
    appendEvent(session, {
      source: 'system',
      kind: 'error',
      text: session.errorMessage
    });
  });
}

function getSessionOrThrow(sessionId: string): CodexSessionState {
  const state = getBridgeState();
  const session = state.sessions.get(sessionId);
  if (!session) {
    throw new Error('session_not_found');
  }
  return session;
}

export function listCodexSessions(): CodexSessionSummary[] {
  const state = getBridgeState();
  return state.order
    .map((id) => state.sessions.get(id))
    .filter((session): session is CodexSessionState => Boolean(session))
    .map((session) => toSummary(session));
}

export function getCodexSession(sessionId: string): CodexSessionDetail {
  const session = getSessionOrThrow(sessionId);
  return {
    session: toSummary(session),
    prompts: [...session.promptHistory],
    events: [...session.events]
  };
}

export function createCodexSession(prompt: string): CodexSessionSummary {
  const normalizedPrompt = prompt.trim();
  if (normalizedPrompt.length === 0) {
    throw new Error('empty_prompt');
  }

  const state = getBridgeState();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const session: CodexSessionState = {
    id,
    title: deriveTitle(normalizedPrompt),
    threadId: null,
    status: 'idle',
    createdAt,
    updatedAt: createdAt,
    lastPrompt: null,
    lastAssistantMessage: null,
    promptHistory: [],
    events: [],
    listeners: new Set<SessionListener>(),
    process: null,
    errorMessage: null
  };

  state.sessions.set(id, session);
  state.order.unshift(id);

  startPromptRun(session, normalizedPrompt);
  return toSummary(session);
}

export function sendCodexGuidance(sessionId: string, prompt: string): CodexSessionSummary {
  const normalizedPrompt = prompt.trim();
  if (normalizedPrompt.length === 0) {
    throw new Error('empty_prompt');
  }

  const session = getSessionOrThrow(sessionId);
  if (session.status === 'running') {
    throw new Error('session_busy');
  }

  startPromptRun(session, normalizedPrompt);
  return toSummary(session);
}

export function subscribeToCodexSession(
  sessionId: string,
  listener: SessionListener
): () => void {
  const session = getSessionOrThrow(sessionId);
  session.listeners.add(listener);
  return () => {
    session.listeners.delete(listener);
  };
}
