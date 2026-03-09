'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CodexSessionStatus = 'idle' | 'running' | 'completed' | 'failed';

interface CodexBridgeJsonEvent {
  type: string;
  [key: string]: unknown;
}

interface CodexBridgeEvent {
  id: string;
  at: string;
  source: 'system' | 'stdout' | 'stderr';
  kind: 'status' | 'prompt' | 'json' | 'log' | 'error';
  text?: string;
  payload?: CodexBridgeJsonEvent;
}

interface CodexSessionSummary {
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

interface CodexSessionDetail {
  session: CodexSessionSummary;
  prompts: string[];
  events: CodexBridgeEvent[];
}

interface ConfigResponse {
  tokenRequired: boolean;
}

interface SessionListResponse {
  tokenRequired: boolean;
  sessions: CodexSessionSummary[];
}

interface EventSnapshotPayload {
  type: 'snapshot';
  session: CodexSessionSummary;
  events: CodexBridgeEvent[];
}

interface EventUpdatePayload {
  type: 'update';
  session: CodexSessionSummary;
  event: CodexBridgeEvent;
}

type StreamPayload = EventSnapshotPayload | EventUpdatePayload;

function isAgentMessageEvent(event: CodexBridgeEvent): boolean {
  if (event.kind !== 'json' || !event.payload) {
    return false;
  }

  if (event.payload.type !== 'item.completed') {
    return false;
  }

  const item = event.payload.item;
  return typeof item === 'object' && item !== null && (item as { type?: unknown }).type === 'agent_message';
}

function eventPrimaryText(event: CodexBridgeEvent): string {
  if (event.kind === 'prompt') {
    return event.text ?? '';
  }

  if (event.kind === 'status' || event.kind === 'error' || event.kind === 'log') {
    return event.text ?? '';
  }

  if (isAgentMessageEvent(event)) {
    const item = event.payload?.item as { text?: unknown } | undefined;
    if (item && typeof item.text === 'string') {
      return item.text;
    }
  }

  if (event.kind === 'json' && event.payload) {
    return JSON.stringify(event.payload);
  }

  return '';
}

function statusColor(status: CodexSessionStatus): string {
  switch (status) {
    case 'running':
      return '#d0a238';
    case 'completed':
      return '#5fb274';
    case 'failed':
      return '#d76161';
    default:
      return '#8f99ad';
  }
}

export default function CodexConsole(): JSX.Element {
  const [tokenRequired, setTokenRequired] = useState(false);
  const [token, setToken] = useState('');
  const [sessions, setSessions] = useState<CodexSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<CodexSessionSummary | null>(null);
  const [events, setEvents] = useState<CodexBridgeEvent[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [guidancePrompt, setGuidancePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-codex-bridge-token'] = token;
    }
    return headers;
  }, [token]);

  const selectedStatus = selectedSession?.status ?? 'idle';

  const fetchConfig = useCallback(async () => {
    const response = await fetch('/api/codex/config', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load Codex bridge configuration');
    }
    const payload = (await response.json()) as ConfigResponse;
    setTokenRequired(payload.tokenRequired);
  }, []);

  const refreshSessions = useCallback(async () => {
    const response = await fetch('/api/codex/sessions', {
      cache: 'no-store',
      headers: authHeaders
    });

    if (response.status === 401) {
      throw new Error('Unauthorized. Provide the bridge token.');
    }

    if (!response.ok) {
      throw new Error('Failed to load Codex sessions');
    }

    const payload = (await response.json()) as SessionListResponse;
    setTokenRequired(payload.tokenRequired);
    setSessions(payload.sessions);
    if (selectedSessionId === null && payload.sessions.length > 0) {
      setSelectedSessionId(payload.sessions[0]?.id ?? null);
    }
  }, [authHeaders, selectedSessionId]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/codex/sessions/${sessionId}`, {
      cache: 'no-store',
      headers: authHeaders
    });

    if (response.status === 401) {
      throw new Error('Unauthorized. Provide the bridge token.');
    }

    if (!response.ok) {
      throw new Error('Failed to load session detail');
    }

    const payload = (await response.json()) as CodexSessionDetail;
    setSelectedSession(payload.session);
    setEvents(payload.events);
  }, [authHeaders]);

  const closeStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const openStream = useCallback(
    (sessionId: string) => {
      closeStream();

      const streamUrl = new URL(`/api/codex/sessions/${sessionId}/events`, window.location.origin);
      if (token) {
        streamUrl.searchParams.set('token', token);
      }

      const stream = new EventSource(streamUrl.toString());
      stream.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data) as StreamPayload;
          if (payload.type === 'snapshot') {
            setSelectedSession(payload.session);
            setEvents(payload.events);
            return;
          }

          setSelectedSession(payload.session);
          setEvents((current) => {
            const next = [...current, payload.event];
            if (next.length > 500) {
              next.splice(0, next.length - 500);
            }
            return next;
          });

          setSessions((current) =>
            current.map((session) => (session.id === payload.session.id ? payload.session : session))
          );
        } catch {
          setError('Failed to parse Codex stream event');
        }
      };

      stream.onerror = () => {
        setError('Codex stream disconnected. Reload session to reconnect.');
      };

      streamRef.current = stream;
    },
    [closeStream, token]
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem('codex-bridge-token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem('codex-bridge-token', token);
      return;
    }
    window.localStorage.removeItem('codex-bridge-token');
  }, [token]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchConfig();
        await refreshSessions();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to initialize Codex console');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchConfig, refreshSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setEvents([]);
      closeStream();
      return;
    }

    void (async () => {
      try {
        setError(null);
        await loadSessionDetail(selectedSessionId);
        openStream(selectedSessionId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load Codex session');
      }
    })();

    return () => {
      closeStream();
    };
  }, [closeStream, loadSessionDetail, openStream, selectedSessionId]);

  const createSession = useCallback(async () => {
    if (newPrompt.trim().length === 0) {
      setError('Enter a prompt first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/codex/sessions', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: newPrompt
        })
      });

      if (response.status === 401) {
        throw new Error('Unauthorized. Provide the bridge token.');
      }

      if (!response.ok) {
        throw new Error('Failed to start Codex session.');
      }

      const payload = (await response.json()) as { session: CodexSessionSummary };
      setNewPrompt('');
      setSessions((current) => [payload.session, ...current]);
      setSelectedSessionId(payload.session.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to start Codex session');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, newPrompt]);

  const sendGuidance = useCallback(async () => {
    if (!selectedSessionId) {
      setError('Select a session before sending guidance.');
      return;
    }

    if (guidancePrompt.trim().length === 0) {
      setError('Enter guidance text first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/codex/sessions/${selectedSessionId}/prompt`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: guidancePrompt
        })
      });

      if (response.status === 401) {
        throw new Error('Unauthorized. Provide the bridge token.');
      }

      if (response.status === 409) {
        throw new Error('Session is busy. Wait for the current run to complete.');
      }

      if (!response.ok) {
        throw new Error('Failed to send guidance.');
      }

      const payload = (await response.json()) as { session: CodexSessionSummary };
      setGuidancePrompt('');
      setSelectedSession(payload.session);
      setSessions((current) =>
        current.map((session) => (session.id === payload.session.id ? payload.session : session))
      );
    } catch (guidanceError) {
      setError(guidanceError instanceof Error ? guidanceError.message : 'Failed to send guidance');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, guidancePrompt, selectedSessionId]);

  return (
    <section className="panel" style={{ display: 'grid', gap: 16 }} data-testid="codex-console">
      <header style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Codex Bridge Console</h2>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Run prompts against local Codex CLI, stream progress updates, and provide guidance follow-ups.
        </p>
      </header>

      <div style={{ display: 'grid', gap: 10 }}>
        <label htmlFor="codex-token" style={{ fontSize: 14 }}>
          Bridge Token {tokenRequired ? '(Required)' : '(Optional)'}
        </label>
        <input
          id="codex-token"
          data-testid="codex-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="x-codex-bridge-token"
          style={{
            width: '100%',
            borderRadius: 10,
            border: '1px solid #37415a',
            padding: '10px 12px',
            background: '#121826',
            color: 'var(--text)'
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <label htmlFor="codex-new-prompt" style={{ fontSize: 14 }}>
          New Prompt
        </label>
        <textarea
          id="codex-new-prompt"
          data-testid="codex-new-prompt"
          value={newPrompt}
          onChange={(event) => setNewPrompt(event.target.value)}
          rows={5}
          placeholder="Describe what Codex should do in this repository."
          style={{
            width: '100%',
            borderRadius: 10,
            border: '1px solid #37415a',
            padding: '10px 12px',
            background: '#121826',
            color: 'var(--text)',
            resize: 'vertical'
          }}
        />
        <button
          type="button"
          data-testid="codex-run-prompt"
          onClick={() => void createSession()}
          disabled={loading}
          style={{
            borderRadius: 10,
            border: '1px solid #4f5c7d',
            padding: '10px 12px',
            background: '#1f2a43',
            color: 'var(--text)',
            cursor: 'pointer'
          }}
        >
          Run Prompt
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)'
        }}
      >
        <aside style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Sessions</h3>
          <div style={{ display: 'grid', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
            {sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                data-testid={`codex-session-${session.id}`}
                onClick={() => setSelectedSessionId(session.id)}
                style={{
                  textAlign: 'left',
                  borderRadius: 10,
                  border: selectedSessionId === session.id ? '1px solid #7d8eb8' : '1px solid #2f3a53',
                  padding: '10px 12px',
                  background: selectedSessionId === session.id ? '#1f2a43' : '#151c2e',
                  color: 'var(--text)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{session.title}</strong>
                  <span style={{ color: statusColor(session.status), fontSize: 12 }}>{session.status}</span>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                  {session.promptCount} prompt(s) · {session.eventCount} updates
                </div>
              </button>
            ))}
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
                No sessions yet. Run a prompt to start.
              </p>
            ) : null}
          </div>
        </aside>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h3 style={{ margin: 0 }}>Live Updates</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              {selectedSession
                ? `Session ${selectedSession.id}${selectedSession.threadId ? ` · Thread ${selectedSession.threadId}` : ''}`
                : 'Select a session to view updates'}
            </p>
          </div>
          <div
            data-testid="codex-event-stream"
            style={{
              border: '1px solid #2d3850',
              borderRadius: 12,
              padding: 12,
              maxHeight: 420,
              overflowY: 'auto',
              background: '#121826',
              display: 'grid',
              gap: 10
            }}
          >
            {events.map((event) => (
              <article
                key={event.id}
                style={{
                  border: '1px solid #2a3448',
                  borderRadius: 8,
                  padding: 8,
                  display: 'grid',
                  gap: 6
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#9ca8c5' }}>
                    {event.kind} · {event.source}
                  </span>
                  <time style={{ color: 'var(--muted)' }}>{new Date(event.at).toLocaleTimeString()}</time>
                </header>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: "'Source Sans 3', sans-serif",
                    color: event.kind === 'error' ? '#ff9a9a' : 'var(--text)'
                  }}
                >
                  {eventPrimaryText(event)}
                </pre>
              </article>
            ))}
            {events.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>No events streamed yet.</p>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label htmlFor="codex-guidance" style={{ fontSize: 14 }}>
              Guidance Prompt
            </label>
            <textarea
              id="codex-guidance"
              data-testid="codex-guidance"
              value={guidancePrompt}
              onChange={(event) => setGuidancePrompt(event.target.value)}
              rows={4}
              placeholder="Provide additional guidance for the selected session."
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid #37415a',
                padding: '10px 12px',
                background: '#121826',
                color: 'var(--text)',
                resize: 'vertical'
              }}
            />
            <button
              type="button"
              data-testid="codex-send-guidance"
              onClick={() => void sendGuidance()}
              disabled={loading || selectedSessionId === null || selectedStatus === 'running'}
              style={{
                borderRadius: 10,
                border: '1px solid #4f5c7d',
                padding: '10px 12px',
                background: '#1f2a43',
                color: 'var(--text)',
                cursor: 'pointer'
              }}
            >
              Send Guidance
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p style={{ margin: 0, color: '#f6a8a8', fontSize: 14 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
