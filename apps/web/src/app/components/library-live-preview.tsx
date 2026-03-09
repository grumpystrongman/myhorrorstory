'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyResponseChoice,
  beatById,
  createInitialSessionState,
  sortMessagesForFeed,
  type DramaMessage,
  type DramaPackage,
  type SessionState
} from '../lib/play-session';

interface LibraryPreviewStory {
  storyId: string;
  storyTitle: string;
  coverImagePath: string;
  playPath: string;
}

interface LibraryLivePreviewProps {
  stories: LibraryPreviewStory[];
}

export function LibraryLivePreview({ stories }: LibraryLivePreviewProps): JSX.Element {
  const [activeStoryId, setActiveStoryId] = useState<string>(stories[0]?.storyId ?? 'midnight-lockbox');
  const [pack, setPack] = useState<DramaPackage | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [feed, setFeed] = useState<DramaMessage[]>([]);
  const [activeMessage, setActiveMessage] = useState<DramaMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const timers = useRef<number[]>([]);

  const selectedStory = useMemo(
    () => stories.find((story) => story.storyId === activeStoryId) ?? stories[0],
    [activeStoryId, stories]
  );

  const currentBeat = useMemo(() => {
    if (!pack || !sessionState) {
      return undefined;
    }
    return beatById(pack, sessionState.currentBeatId);
  }, [pack, sessionState]);

  const antagonistMessage = useMemo(
    () => [...feed].reverse().find((message) => message.role === 'antagonist') ?? null,
    [feed]
  );

  function clearTimers(): void {
    for (const timer of timers.current) {
      window.clearTimeout(timer);
    }
    timers.current = [];
  }

  function scheduleMessages(messages: DramaMessage[]): void {
    clearTimers();
    setIsStreaming(messages.length > 0);
    setActiveMessage(null);
    messages.forEach((message, index) => {
      const timer = window.setTimeout(() => {
        setFeed((current) => [...current, message]);
        setActiveMessage(message);
        if (index === messages.length - 1) {
          setIsStreaming(false);
        }
      }, 450 + index * 1200);
      timers.current.push(timer);
    });
  }

  function selectResponse(optionId: string): void {
    if (!pack || !sessionState || !currentBeat) {
      return;
    }
    const option = currentBeat.responseOptions.find((candidate) => candidate.id === optionId);
    if (!option) {
      return;
    }
    const result = applyResponseChoice(pack, sessionState, currentBeat, option);
    setSessionState(result.nextState);
    setActiveMessage(null);
  }

  function restartPreview(): void {
    if (!pack) {
      return;
    }
    setSessionState(createInitialSessionState(pack));
    setFeed([]);
    setActiveMessage(null);
    setIsStreaming(false);
    clearTimers();
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPack(null);
    setSessionState(null);
    setFeed([]);
    setActiveMessage(null);
    setIsStreaming(false);
    clearTimers();

    void fetch(`/content/drama/${activeStoryId}.json`, {
      cache: 'no-store'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${activeStoryId} package.`);
        }
        return (await response.json()) as DramaPackage;
      })
      .then((nextPack) => {
        if (cancelled) {
          return;
        }
        setPack(nextPack);
        setSessionState(createInitialSessionState(nextPack));
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load live preview.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [activeStoryId]);

  useEffect(() => {
    if (!currentBeat || !sessionState || sessionState.complete) {
      setIsStreaming(false);
      return;
    }
    scheduleMessages(sortMessagesForFeed(currentBeat.incomingMessages));
    return () => {
      clearTimers();
    };
  }, [currentBeat?.id, sessionState?.complete]);

  return (
    <section className="panel section-shell library-preview-shell">
      <div className="library-preview-top">
        <div>
          <span className="surface-tag">Playable Preview</span>
          <h2 className="section-title">Live Investigation Simulation</h2>
          <p className="section-copy">
            This is the actual branching runtime: incoming channel drops, villain contact, response
            choices, and progression state.
          </p>
        </div>
        <div className="library-preview-controls">
          <label htmlFor="library-preview-story">Case</label>
          <select
            id="library-preview-story"
            value={activeStoryId}
            onChange={(event) => setActiveStoryId(event.target.value)}
          >
            {stories.map((story) => (
              <option key={story.storyId} value={story.storyId}>
                {story.storyTitle}
              </option>
            ))}
          </select>
          <button type="button" onClick={restartPreview} disabled={!pack}>
            Restart Preview
          </button>
          <a className="cta-primary" href={selectedStory?.playPath ?? '/play'}>
            Open Full Session
          </a>
        </div>
      </div>

      <div className="library-preview-grid">
        <article className="library-preview-story panel">
          <img src={selectedStory?.coverImagePath ?? '/visuals/surfaces/library.svg'} alt="Story cover" />
          <div>
            <p className="kicker">Current Beat</p>
            <h3>{currentBeat ? `${currentBeat.actTitle}: ${currentBeat.title}` : 'Loading Case Runtime'}</h3>
            <p className="muted">
              {currentBeat?.narrative ??
                (loading ? 'Loading runtime package...' : error ?? 'Waiting for runtime package.')}
            </p>
            <p className="muted">
              Progress: {Math.round(sessionState?.investigationProgress ?? 0)}% · Stage {currentBeat?.stage ?? 1}/4
            </p>
          </div>
        </article>

        <div className="library-preview-feed panel">
          <h3>Channel Feed</h3>
          <p className="muted">
            {isStreaming
              ? 'Transmissions are arriving now.'
              : loading
                ? 'Loading feed...'
                : sessionState?.complete
                  ? 'Case preview reached an ending.'
                  : 'Awaiting your response.'}
          </p>
          <div className="library-preview-feed-list">
            {feed.length === 0 ? (
              <p className="muted">No transmissions yet.</p>
            ) : (
              feed.map((message) => (
                <article key={message.id} className={`play-feed-item role-${message.role}`}>
                  <div className="play-feed-item-top">
                    <strong>{message.senderName}</strong>
                    <span>{message.channel}</span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="library-preview-bottom">
        <article className="panel library-preview-alert">
          <h3>Villain Contact</h3>
          <p className="muted">
            {antagonistMessage?.text ??
              'No direct antagonist line yet. Advance a beat to trigger escalation.'}
          </p>
          {activeMessage ? (
            <p className="muted">
              Latest incoming: {activeMessage.senderName} on {activeMessage.channel}
            </p>
          ) : null}
        </article>

        <article className="panel library-preview-choices">
          <h3>Choose Response</h3>
          <div className="play-response-list">
            {(currentBeat?.responseOptions ?? []).map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => selectResponse(option.id)}
                disabled={loading || isStreaming || Boolean(sessionState?.complete)}
              >
                <strong>{option.label}</strong>
                <small>{option.summary}</small>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
