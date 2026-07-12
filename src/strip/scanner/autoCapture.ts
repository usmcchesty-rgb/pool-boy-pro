/** Stable duration before auto-capture (0.75–1.25 s target) */
export const AUTO_CAPTURE_STABLE_MS = 1000;
export const AUTO_CAPTURE_MIN_STABLE_FRAMES = 12;

export interface AutoCaptureState {
  stableFrames: number;
  readySince: number | null;
}

export function createAutoCaptureState(): AutoCaptureState {
  return { stableFrames: 0, readySince: null };
}

export function resetAutoCaptureState(state: AutoCaptureState): AutoCaptureState {
  state.stableFrames = 0;
  state.readySince = null;
  return state;
}

export interface AutoCaptureTickResult {
  shouldCapture: boolean;
  state: AutoCaptureState;
}

/** Advance auto-capture timer; resets when not ready */
export function tickAutoCapture(
  state: AutoCaptureState,
  ready: boolean,
  now = Date.now()
): AutoCaptureTickResult {
  if (!ready) {
    resetAutoCaptureState(state);
    return { shouldCapture: false, state };
  }

  state.stableFrames += 1;
  if (state.readySince === null) state.readySince = now;

  const elapsed = now - state.readySince;
  const shouldCapture =
    state.stableFrames >= AUTO_CAPTURE_MIN_STABLE_FRAMES && elapsed >= AUTO_CAPTURE_STABLE_MS;

  return { shouldCapture, state };
}
