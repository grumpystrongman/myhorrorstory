'use client';

import { useMemo, useState, type FormEvent } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const storyOptions = [
  'midnight-lockbox',
  'static-between-stations',
  'signal-from-kharon-9',
  'ward-1908'
];

export function SupportAssistant(): JSX.Element {
  const [storyId, setStoryId] = useState<string>('midnight-lockbox');
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Local game guide ready. Ask for tactical help, clue strategy, or branch-safe decisions.'
    }
  ]);

  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787/api/v1').replace(/\/$/, ''),
    []
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const question = input.trim();
    if (!question) {
      return;
    }

    setInput('');
    setError(null);
    setLoading(true);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);

    try {
      const response = await fetch(`${apiBase}/support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'game_guide',
          storyId,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Support assistant failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        provider: string;
        model: string;
        reply: string;
      };

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `${payload.reply}\n\n[provider=${payload.provider} model=${payload.model}]`
        }
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Support assistant unavailable.');
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel section-shell" style={{ display: 'grid', gap: 12 }}>
      <h2 className="section-title">Local LLM Game Guide</h2>
      <p className="section-copy">
        Uses the local support model endpoint for in-session guidance and feature help.
      </p>
      <label htmlFor="support-story-select" style={{ fontSize: 13 }}>
        Story Context
      </label>
      <select
        id="support-story-select"
        value={storyId}
        onChange={(event) => setStoryId(event.target.value)}
        style={{ width: '100%', maxWidth: 320 }}
      >
        {storyOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 12,
          display: 'grid',
          gap: 8,
          maxHeight: 280,
          overflowY: 'auto',
          background: 'rgba(8, 12, 18, 0.55)'
        }}
      >
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '8px 10px',
              background: message.role === 'assistant' ? 'rgba(18, 26, 38, 0.82)' : 'rgba(47, 27, 19, 0.82)'
            }}
          >
            <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {message.role}
            </p>
            <p style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap' }}>{message.content}</p>
          </article>
        ))}
      </div>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <textarea
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for clue strategy, branch-safe moves, or support steps."
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
          {error ? <span style={{ color: '#d46a6a', fontSize: 13 }}>{error}</span> : null}
        </div>
      </form>
    </section>
  );
}
