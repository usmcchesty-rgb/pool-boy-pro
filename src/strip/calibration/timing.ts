import type { StripBrandDefinition } from '../types';

export type StripTimingPhase =
  | 'not_started'
  | 'dip_wait'
  | 'reading_window'
  | 'window_expired';

export interface StripTimingConfig {
  dipWaitSeconds: { min: number; max: number };
  readWithinSeconds: number;
  /** Whether timing values were verified against the physical product */
  timingVerified: boolean;
  timingNotes?: string;
}

export interface StripTimingState {
  phase: StripTimingPhase;
  /** When user indicated they dipped the strip (ms epoch) */
  dipStartedAt: number | null;
  /** Seconds remaining in dip-wait countdown */
  dipWaitRemaining: number;
  /** Seconds remaining in reading window */
  readingWindowRemaining: number;
  /** Whether automatic scanning is allowed */
  scanAllowed: boolean;
  /** User acknowledged expired window warning */
  expiredAcknowledged: boolean;
}

export function getStripTimingConfig(brand: StripBrandDefinition): StripTimingConfig {
  return {
    dipWaitSeconds: brand.dipWaitSeconds,
    readWithinSeconds: brand.readWithinSeconds,
    timingVerified: false,
    timingNotes:
      'Timing values are from package documentation. Physical product verification is recommended before relying on automatic scan timing.',
  };
}

export function createInitialTimingState(): StripTimingState {
  return {
    phase: 'not_started',
    dipStartedAt: null,
    dipWaitRemaining: 0,
    readingWindowRemaining: 0,
    scanAllowed: false,
    expiredAcknowledged: false,
  };
}

/** Start timing after user dips the strip */
export function startStripTiming(config: StripTimingConfig): StripTimingState {
  return {
    phase: 'dip_wait',
    dipStartedAt: Date.now(),
    dipWaitRemaining: config.dipWaitSeconds.max,
    readingWindowRemaining: config.readWithinSeconds,
    scanAllowed: false,
    expiredAcknowledged: false,
  };
}

/** Advance timing state by elapsed seconds */
export function advanceStripTiming(
  state: StripTimingState,
  config: StripTimingConfig,
  now = Date.now()
): StripTimingState {
  if (!state.dipStartedAt) return state;

  const elapsedSec = (now - state.dipStartedAt) / 1000;
  const dipWaitRemaining = Math.max(0, config.dipWaitSeconds.max - elapsedSec);
  const readingWindowRemaining = Math.max(0, config.readWithinSeconds - elapsedSec);

  if (elapsedSec < config.dipWaitSeconds.max) {
    return {
      ...state,
      phase: 'dip_wait',
      dipWaitRemaining,
      readingWindowRemaining,
      scanAllowed: false,
    };
  }

  if (elapsedSec <= config.readWithinSeconds) {
    return {
      ...state,
      phase: 'reading_window',
      dipWaitRemaining: 0,
      readingWindowRemaining,
      scanAllowed: true,
    };
  }

  return {
    ...state,
    phase: 'window_expired',
    dipWaitRemaining: 0,
    readingWindowRemaining: 0,
    scanAllowed: state.expiredAcknowledged,
  };
}

export function acknowledgeExpiredWindow(state: StripTimingState): StripTimingState {
  return { ...state, expiredAcknowledged: true, scanAllowed: true };
}

export function getTimingMessage(state: StripTimingState, config: StripTimingConfig): string {
  switch (state.phase) {
    case 'not_started':
      return `Dip the strip, then tap "Start Timer". Wait ${config.dipWaitSeconds.min}–${config.dipWaitSeconds.max}s before reading.`;
    case 'dip_wait':
      return `Developing… wait ${Math.ceil(state.dipWaitRemaining)}s before scanning.`;
    case 'reading_window':
      return `Reading window open — scan within ${Math.ceil(state.readingWindowRemaining)}s.`;
    case 'window_expired':
      return 'Reading window may have passed. Results may be less accurate.';
    default:
      return '';
  }
}
