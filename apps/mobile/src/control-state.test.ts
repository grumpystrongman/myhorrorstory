import { describe, expect, it } from 'vitest';
import {
  defaultMobileControlState,
  panBy,
  pauseAudio,
  playAudio,
  toggleMuted,
  toggleSubtitles,
  zoomBy
} from './control-state';

describe('mobile control state', () => {
  it('toggles subtitles', () => {
    const next = toggleSubtitles(defaultMobileControlState);
    expect(next.subtitles).toBe(false);
  });

  it('clamps zoom between min and max', () => {
    const zoomedIn = zoomBy(defaultMobileControlState, 250);
    expect(zoomedIn.zoom).toBe(200);

    const zoomedOut = zoomBy(defaultMobileControlState, -250);
    expect(zoomedOut.zoom).toBe(50);
  });

  it('updates pan coordinates', () => {
    const panned = panBy(defaultMobileControlState, 24, -24);
    expect(panned.panX).toBe(24);
    expect(panned.panY).toBe(-24);
  });

  it('updates audio control state', () => {
    const playing = playAudio(defaultMobileControlState);
    expect(playing.playing).toBe(true);

    const muted = toggleMuted(playing);
    expect(muted.muted).toBe(true);

    const paused = pauseAudio(muted);
    expect(paused.playing).toBe(false);
  });
});
