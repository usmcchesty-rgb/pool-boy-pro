import { describe, expect, it } from 'vitest';
import {
  createAutoCaptureState,
  resetAutoCaptureState,
  tickAutoCapture,
  AUTO_CAPTURE_STABLE_MS,
  AUTO_CAPTURE_MIN_STABLE_FRAMES,
} from './autoCapture';

describe('autoCapture', () => {
  it('does not capture until stable duration elapsed', () => {
    const state = createAutoCaptureState();
    const start = 1000;

    for (let i = 0; i < AUTO_CAPTURE_MIN_STABLE_FRAMES - 1; i++) {
      const result = tickAutoCapture(state, true, start + i * 16);
      expect(result.shouldCapture).toBe(false);
    }

    const beforeDuration = tickAutoCapture(state, true, start + 500);
    expect(beforeDuration.shouldCapture).toBe(false);

    const afterDuration = tickAutoCapture(state, true, start + AUTO_CAPTURE_STABLE_MS + 50);
    expect(afterDuration.shouldCapture).toBe(true);
  });

  it('resets timer when alignment is lost', () => {
    const state = createAutoCaptureState();
    tickAutoCapture(state, true, 1000);
    tickAutoCapture(state, true, 1100);
    resetAutoCaptureState(state);
    tickAutoCapture(state, false, 1200);
    expect(state.stableFrames).toBe(0);
    expect(state.readySince).toBeNull();

    const result = tickAutoCapture(state, true, 1300);
    expect(result.shouldCapture).toBe(false);
  });

  it('resets on not-ready frame', () => {
    const state = createAutoCaptureState();
    tickAutoCapture(state, true, 1000);
    tickAutoCapture(state, true, 1100);
    const lost = tickAutoCapture(state, false, 1200);
    expect(lost.shouldCapture).toBe(false);
    expect(state.stableFrames).toBe(0);
  });
});
