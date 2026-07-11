import { describe, expect, it, vi } from 'vitest';
import { rgbToLab } from '../scanner/colorScience';
import { ADAPTIVE_HEALTH_THRESHOLDS } from './adaptiveHealthConfig';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';
import {
  classifyOverallHealth,
  classifyPadStatus,
  computeCorrectionRate,
  isAnchorStable,
  buildLearningHealthSummary,
} from './adaptiveHealth';
import {
  assessAnchorRegression,
  applyRollback,
  getEffectiveLearnedWeight,
} from './adaptiveRollback';
import type { LearnedAnchorState, VerifiedPadSample } from './adaptiveTypes';

const goodQuality = {
  focusScore: 0.8,
  lightingScore: 0.8,
  alignmentScore: 0.8,
  stabilityScore: 0.8,
};

function makeSample(
  padId: string,
  value: number,
  corrected: boolean,
  proposed?: number
): VerifiedPadSample {
  const rgb: [number, number, number] = [200, 100, 50];
  return {
    id: `s-${Math.random()}`,
    brandId: 'clorox_salt_pool',
    padId,
    confirmedValue: value,
    rawRgb: rgb,
    normalizedRgb: rgb,
    lab: rgbToLab(rgb),
    deltaEToAnchor: 3,
    quality: goodQuality,
    lightingEstimate: 80,
    calibrationSource: 'test',
    timestamp: Date.now(),
    reliabilityWeight: 1,
    deviceCalibrationVersion: 'test',
    timingExpired: false,
    userCorrected: corrected,
    proposedValue: proposed ?? (corrected ? value + 1 : value),
    scanSessionId: 'test',
  };
}

function makeState(overrides: Partial<LearnedAnchorState> = {}): LearnedAnchorState {
  return {
    padId: 'freeChlorine',
    value: 3,
    learnedRgb: [255, 160, 190],
    learnedLab: rgbToLab([255, 160, 190]),
    sampleCount: 6,
    reliableSampleCount: 6,
    varianceLab: 3,
    baselineWeight: 0.4,
    learnedWeight: 0.6,
    highVariance: false,
    active: true,
    ...overrides,
  };
}

describe('learning status classification', () => {
  it('returns not_enough_data below minimum samples', () => {
    expect(
      classifyOverallHealth({
        totalAccepted: 1,
        totalRejected: 0,
        activeLearned: 0,
        highVarianceCount: 0,
        falseHighCount: 0,
        rollbackCount: 0,
        unreliablePadCount: 0,
        stableAnchorCount: 0,
        totalAnchorsWithSamples: 0,
      })
    ).toBe('not_enough_data');
  });

  it('returns learning with moderate data', () => {
    expect(
      classifyOverallHealth({
        totalAccepted: 5,
        totalRejected: 1,
        activeLearned: 2,
        highVarianceCount: 0,
        falseHighCount: 0,
        rollbackCount: 0,
        unreliablePadCount: 0,
        stableAnchorCount: 0,
        totalAnchorsWithSamples: 2,
      })
    ).toBe('learning');
  });

  it('returns needs_review on false-high threshold', () => {
    expect(
      classifyOverallHealth({
        totalAccepted: 15,
        totalRejected: 0,
        activeLearned: 5,
        highVarianceCount: 0,
        falseHighCount: ADAPTIVE_HEALTH_THRESHOLDS.maxFalseHighForReview,
        rollbackCount: 0,
        unreliablePadCount: 0,
        stableAnchorCount: 3,
        totalAnchorsWithSamples: 5,
      })
    ).toBe('needs_review');
  });
});

describe('stable anchor thresholds', () => {
  it('requires minimum reliable samples for stable', () => {
    const state = makeState({ reliableSampleCount: 2 });
    const samples = Array.from({ length: 5 }, () => makeSample('freeChlorine', 3, false));
    expect(isAnchorStable(state, samples, 0)).toBe(false);
  });

  it('marks stable when evidence rules pass', () => {
    const state = makeState({
      reliableSampleCount: ADAPTIVE_HEALTH_THRESHOLDS.minSamplesPerAnchorStable,
      varianceLab: 4,
    });
    const samples = Array.from({ length: 8 }, () => makeSample('freeChlorine', 3, false));
    expect(isAnchorStable(state, samples, 0)).toBe(true);
  });

  it('rejects stable with high variance', () => {
    const state = makeState({
      reliableSampleCount: 6,
      varianceLab: 10,
      highVariance: true,
    });
    const samples = Array.from({ length: 8 }, () => makeSample('freeChlorine', 3, false));
    expect(isAnchorStable(state, samples, 0)).toBe(false);
  });
});

describe('performance regression detection', () => {
  it('detects high correction rate', () => {
    const state = makeState();
    const samples = [
      makeSample('freeChlorine', 3, true, 1),
      makeSample('freeChlorine', 3, true, 5),
      makeSample('freeChlorine', 3, false, 3),
    ];
    const assessment = assessAnchorRegression(state, samples);
    expect(assessment?.shouldReduce || assessment?.shouldDisable).toBe(true);
  });

  it('reduces learned weight on regression', () => {
    const state = makeState();
    const assessment = assessAnchorRegression(state, [
      makeSample('freeChlorine', 3, true, 1),
      makeSample('freeChlorine', 3, true, 5),
    ])!;
    const { overrides, record } = applyRollback([], assessment, state);
    expect(overrides[0].learnedWeightMultiplier).toBe(ADAPTIVE_HEALTH_THRESHOLDS.regressionWeightMultiplier);
    expect(record.reason).toContain('Correction rate');
    expect(record.disabled).toBe(false);
  });

  it('disables anchor after repeated regression', () => {
    const state = makeState();
    const assessment = assessAnchorRegression(state, [
      makeSample('freeChlorine', 3, true, 1),
      makeSample('freeChlorine', 3, true, 5),
    ], {
      padId: 'freeChlorine',
      value: 3,
      learnedWeightMultiplier: ADAPTIVE_HEALTH_THRESHOLDS.regressionWeightMultiplier,
      disabled: false,
      regressionCount: 1,
      updatedAt: new Date().toISOString(),
    })!;
    expect(assessment?.shouldDisable).toBe(true);
    const { overrides, record } = applyRollback(
      [{ padId: 'freeChlorine', value: 3, learnedWeightMultiplier: 0.5, disabled: false, regressionCount: 1, updatedAt: '' }],
      assessment!,
      state
    );
    expect(overrides[0].disabled).toBe(true);
    expect(record.disabled).toBe(true);
  });

  it('falls back to baseline via zero effective weight when disabled', () => {
    const state = makeState();
    const weight = getEffectiveLearnedWeight(state, {
      padId: 'freeChlorine',
      value: 3,
      learnedWeightMultiplier: 0,
      disabled: true,
      regressionCount: 2,
      updatedAt: '',
    });
    expect(weight).toBe(0);
  });
});

describe('correction rate', () => {
  it('computes recent correction rate', () => {
    const samples = [
      makeSample('ph', 7.5, true),
      makeSample('ph', 7.5, false),
      makeSample('ph', 7.5, true),
    ];
    expect(computeCorrectionRate(samples, 'ph')).toBeCloseTo(2 / 3);
  });
});

describe('per-pad status', () => {
  it('classifies baseline_only when no active anchors', () => {
    const states = [makeState({ active: false, learnedWeight: 0 })];
    expect(classifyPadStatus('freeChlorine', states, [], [], 0)).toBe('baseline_only');
  });
});

describe('health summary', () => {
  it('builds summary with accepted and rejected counts', () => {
    const summary = buildLearningHealthSummary(
      {
        samples: [makeSample('freeChlorine', 3, false)],
        totalRejectedSamples: 2,
        falseHighConfidenceCount: 0,
        lastUpdated: new Date().toISOString(),
        rollbackRecords: [],
        safetyOverrides: [],
      },
      new Map([['freeChlorine:3', makeState({ active: false })]])
    );
    expect(summary.totalAcceptedSamples).toBe(1);
    expect(summary.totalRejectedSamples).toBe(2);
    expect(summary.overallStatus).toBe('not_enough_data');
  });
});

describe('rollback reason recording', () => {
  it('records reason in rollback record', () => {
    const state = makeState();
    const assessment = assessAnchorRegression(state, [
      makeSample('freeChlorine', 3, true, 1),
      makeSample('freeChlorine', 3, true, 5),
    ])!;
    const { record } = applyRollback([], assessment, state);
    expect(record.reason.length).toBeGreaterThan(10);
    expect(record.regressionCount).toBe(1);
  });
});

describe('reset helpers', () => {
  it('documents blend thresholds in config', () => {
    expect(ADAPTIVE_LEARNING_THRESHOLDS.minSamplesForBlend).toBe(3);
    expect(ADAPTIVE_HEALTH_THRESHOLDS.minSamplesPerAnchorStable).toBe(5);
  });
});

describe('per-pad and per-value reset', () => {
  it('resetLearnedPadValue removes only matching samples', async () => {
    const { resetLearnedPadValue, loadAdaptiveProfile, saveAdaptiveProfile, resetLearnedCalibration } =
      await import('./adaptiveStorage');
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
    resetLearnedCalibration();
    const profile = loadAdaptiveProfile();
    profile.samples = [
      makeSample('freeChlorine', 3, false),
      makeSample('freeChlorine', 5, false),
      makeSample('ph', 7.5, false),
    ];
    saveAdaptiveProfile(profile);
    const removed = resetLearnedPadValue('freeChlorine', 3);
    expect(removed).toBe(1);
    expect(loadAdaptiveProfile().samples).toHaveLength(2);
  });

  it('resetLearnedPad removes all samples for pad', async () => {
    const { resetLearnedPad, loadAdaptiveProfile, saveAdaptiveProfile, resetLearnedCalibration } =
      await import('./adaptiveStorage');
    resetLearnedCalibration();
    const profile = loadAdaptiveProfile();
    profile.samples = [
      makeSample('freeChlorine', 3, false),
      makeSample('freeChlorine', 5, false),
      makeSample('ph', 7.5, false),
    ];
    saveAdaptiveProfile(profile);
    const removed = resetLearnedPad('freeChlorine');
    expect(removed).toBe(2);
    expect(loadAdaptiveProfile().samples.every((s) => s.padId !== 'freeChlorine')).toBe(true);
  });
});
