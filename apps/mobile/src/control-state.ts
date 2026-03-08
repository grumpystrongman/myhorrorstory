export interface MobileControlState {
  zoom: number;
  panX: number;
  panY: number;
  playing: boolean;
  muted: boolean;
  subtitles: boolean;
}

export const defaultMobileControlState: MobileControlState = {
  zoom: 100,
  panX: 0,
  panY: 0,
  playing: false,
  muted: false,
  subtitles: true
};

export function zoomBy(state: MobileControlState, delta: number): MobileControlState {
  const nextZoom = Math.max(50, Math.min(200, state.zoom + delta));
  return { ...state, zoom: nextZoom };
}

export function panBy(state: MobileControlState, deltaX: number, deltaY: number): MobileControlState {
  return {
    ...state,
    panX: state.panX + deltaX,
    panY: state.panY + deltaY
  };
}

export function toggleSubtitles(state: MobileControlState): MobileControlState {
  return {
    ...state,
    subtitles: !state.subtitles
  };
}

export function playAudio(state: MobileControlState): MobileControlState {
  return {
    ...state,
    playing: true
  };
}

export function pauseAudio(state: MobileControlState): MobileControlState {
  return {
    ...state,
    playing: false
  };
}

export function toggleMuted(state: MobileControlState): MobileControlState {
  return {
    ...state,
    muted: !state.muted
  };
}
