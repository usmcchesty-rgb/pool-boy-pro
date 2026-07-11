import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  advanceStripTiming,
  acknowledgeExpiredWindow,
  createInitialTimingState,
  getStripTimingConfig,
  startStripTiming,
} from './timing';
import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';

describe('strip timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const config = getStripTimingConfig(CLOROX_SALT_POOL_STRIP);

  it('marks timing as unverified from brand config', () => {
    expect(config.timingVerified).toBe(false);
    expect(config.dipWaitSeconds).toEqual({ min: 1, max: 2 });
    expect(config.readWithinSeconds).toBe(15);
  });

  it('blocks scanning during dip wait', () => {
    const started = startStripTiming(config);
    expect(started.scanAllowed).toBe(false);
    expect(started.phase).toBe('dip_wait');

    const after1s = advanceStripTiming(started, config, Date.now() + 1000);
    expect(after1s.scanAllowed).toBe(false);
    expect(after1s.phase).toBe('dip_wait');
  });

  it('allows scanning during reading window', () => {
    const started = startStripTiming(config);
    const ready = advanceStripTiming(started, config, Date.now() + 2500);
    expect(ready.phase).toBe('reading_window');
    expect(ready.scanAllowed).toBe(true);
  });

  it('expires reading window and requires acknowledgment', () => {
    const started = startStripTiming(config);
    const expired = advanceStripTiming(started, config, Date.now() + 16000);
    expect(expired.phase).toBe('window_expired');
    expect(expired.scanAllowed).toBe(false);

    const ack = acknowledgeExpiredWindow(expired);
    expect(ack.scanAllowed).toBe(true);
    expect(ack.expiredAcknowledged).toBe(true);
  });

  it('starts in not_started state', () => {
    const initial = createInitialTimingState();
    expect(initial.phase).toBe('not_started');
    expect(initial.scanAllowed).toBe(false);
  });
});

describe('validation statistics', () => {
  it('computes exact-match and within-one-step percentages', async () => {
    const { computePadValidationSummary } = await import('./validationStats');
    const scale = [6.8, 7.2, 7.5, 7.8, 8.4];
    const summary = computePadValidationSummary('ph', [
      {
        id: '1',
        padId: 'ph',
        proposedValue: 7.5,
        confirmedValue: 7.5,
        confidence: 80,
        confidenceLevel: 'high',
        deltaE: 4,
        anchorSource: 'builtin_approximate',
        recordedAt: 1,
      },
      {
        id: '2',
        padId: 'ph',
        proposedValue: 7.5,
        confirmedValue: 7.8,
        confidence: 70,
        confidenceLevel: 'medium',
        deltaE: 6,
        anchorSource: 'builtin_approximate',
        recordedAt: 2,
      },
    ], scale);

    expect(summary.totalSamples).toBe(2);
    expect(summary.exactMatchPercent).toBe(50);
    expect(summary.withinOneStepPercent).toBe(100);
    expect(summary.confusionPairs[0]).toEqual({ proposed: 7.5, confirmed: 7.8, count: 1 });
  });
});
