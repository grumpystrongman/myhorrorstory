'use client';

import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const PAN_STEP = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function PlayPage(): JSX.Element {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [subtitles, setSubtitles] = useState(true);
  const dragAnchor = useRef<{ x: number; y: number } | null>(null);

  const boardTransform = useMemo(
    () => `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
    [pan.x, pan.y, zoom]
  );

  function zoomBy(delta: number): void {
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  }

  function resetView(): void {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }

  function panBy(deltaX: number, deltaY: number): void {
    setPan((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY
    }));
  }

  function onBoardWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 10 : -10);
  }

  function onBoardPointerDown(event: PointerEvent<HTMLDivElement>): void {
    dragAnchor.current = {
      x: event.clientX,
      y: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onBoardPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!dragAnchor.current) {
      return;
    }

    const deltaX = event.clientX - dragAnchor.current.x;
    const deltaY = event.clientY - dragAnchor.current.y;
    dragAnchor.current = {
      x: event.clientX,
      y: event.clientY
    };
    panBy(deltaX, deltaY);
  }

  function onBoardPointerUp(event: PointerEvent<HTMLDivElement>): void {
    dragAnchor.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Cinzel, serif' }}>Play Session</h1>
        <p>Evidence board, clues, notes, timeline, and synchronized chapter events.</p>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Evidence Board View Controls</h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => zoomBy(10)} data-testid="zoom-in">
              Zoom In
            </button>
            <button type="button" onClick={() => zoomBy(-10)} data-testid="zoom-out">
              Zoom Out
            </button>
            <button type="button" onClick={resetView} data-testid="reset-view">
              Reset View
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => panBy(0, -PAN_STEP)} data-testid="pan-up">
              Pan Up
            </button>
            <button type="button" onClick={() => panBy(0, PAN_STEP)} data-testid="pan-down">
              Pan Down
            </button>
            <button type="button" onClick={() => panBy(-PAN_STEP, 0)} data-testid="pan-left">
              Pan Left
            </button>
            <button type="button" onClick={() => panBy(PAN_STEP, 0)} data-testid="pan-right">
              Pan Right
            </button>
          </div>
        </div>
        <div
          style={{
            height: 180,
            border: '1px solid #31394f',
            borderRadius: 10,
            overflow: 'hidden',
            position: 'relative',
            background: '#111827'
          }}
        >
          <div
            role="application"
            aria-label="Evidence board viewport"
            data-testid="evidence-board-viewport"
            onWheel={onBoardWheel}
            onPointerDown={onBoardPointerDown}
            onPointerMove={onBoardPointerMove}
            onPointerUp={onBoardPointerUp}
            onPointerCancel={onBoardPointerUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              touchAction: 'none',
              userSelect: 'none'
            }}
          >
            <div
              data-testid="evidence-board-content"
              style={{
                width: 260,
                height: 120,
                borderRadius: 12,
                border: '1px solid #bf8b30',
                background: '#1f2937',
                display: 'grid',
                placeItems: 'center',
                transform: boardTransform,
                transformOrigin: 'center center',
                transition: dragAnchor.current ? 'none' : 'transform 120ms linear'
              }}
            >
              Evidence Cluster A
            </div>
          </div>
        </div>
        <p data-testid="zoom-status" style={{ marginBottom: 6 }}>
          Zoom: {zoom}%
        </p>
        <p data-testid="pan-status" style={{ margin: 0 }}>
          Pan: x {pan.x}, y {pan.y}
        </p>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>AI Narrator Audio Controls</h2>
        <p>Voice-enabled character events with fallback providers and cached clips.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button type="button" onClick={() => setPlaying(true)} data-testid="audio-play">
            Play
          </button>
          <button type="button" onClick={() => setPlaying(false)} data-testid="audio-pause">
            Pause
          </button>
          <button type="button" onClick={() => setMuted((current) => !current)} data-testid="audio-mute-toggle">
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={() => setSubtitles((current) => !current)}
            data-testid="subtitle-toggle"
          >
            {subtitles ? 'Hide Subtitles' : 'Show Subtitles'}
          </button>
        </div>
        <label htmlFor="audio-volume" style={{ display: 'block', marginBottom: 8 }}>
          Volume
        </label>
        <input
          id="audio-volume"
          data-testid="audio-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
        <p data-testid="audio-status" style={{ marginBottom: 6 }}>
          Audio: {playing ? 'Playing' : 'Paused'}
        </p>
        <p data-testid="audio-muted-status" style={{ marginBottom: 6 }}>
          Muted: {muted ? 'Yes' : 'No'}
        </p>
        <p data-testid="audio-volume-status" style={{ marginBottom: 6 }}>
          Volume: {volume}%
        </p>
        <p data-testid="subtitle-status" style={{ margin: 0 }}>
          Subtitles: {subtitles ? 'Enabled' : 'Disabled'}
        </p>
      </div>
    </main>
  );
}
