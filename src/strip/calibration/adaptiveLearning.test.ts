import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { StripCaptureQuality } from '../../models/types';
import type { PadMatchResult } from '../scanner/types';
import { rgbToLab } from '../scanner/colorScience';
import {
  buildVerifiedSample,
  extractEligibleSamples,
  isSampleEligible,
  type LearningCandidateInput,
} from './sampleAcceptance';
import {
  blendAnchorRgb,
  clampDriftFromBaseline,
  computeLearnedAnchorState,
  computeLearnedWeight,
  filterOutliers,
  weightedMedianRgb,
} from './anchorBlending';
import {
  addVerifiedSamples,
  rebuildLearnedAnchors,
  resetLearnedCalibration,
} from './adaptiveLearning';
import {
  isAdaptiveLearningEnabled,
  loadAdaptiveProfile,
  setAdaptiveLearningEnabled,
} from './adaptiveStorage';
import { validateAdaptiveImport } from './adaptiveImport';
import { getAnchorConfidenceCaps } from './anchorProvider';
import type { VerifiedPadSample } from './adaptiveTypes';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';

const goodQuality: StripCaptureQuality = {
  focusScore: 0.8,
  lightingScore: 0.8,
  alignmentScore: 0.8,
  stabilityScore: 0.8,
};

function makeMatch(overrides: Partial<PadMatchResult> = {}): PadMatchResult {
  return {
    padId: 'freeChlorine',
    proposedValue: 3,
    confidence: 80,
    confidenceLevel: 'high',
    deltaE: 4,
    sampledRgb: [255, 160, 190],
    matchedAnchorRgb: [255, 160, 190],
    ambiguous: false,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<LearningCandidateInput> = {}): LearningCandidateInput {
  return {
    brandId: 'clorox_salt_pool',
    padId: 'freeChlorine',
    match: makeMatch(),
    confirmedValue: 3,
    quality: goodQuality,
    lightingEstimate: 80,
    calibrationSource: 'builtin_approximate',
    timingExpired: false,
    timingAcknowledged: false,
    scanSessionId: 'test-session',
    deviceCalibrationVersion: 'baseline',
    userExplicitlyVerified: true,
    ...overrides,
  };
}

function makeSample(rgb: [number, number, number], weight = 1): VerifiedPadSample {
  return {
    id: `s-${Math.random()}`,
    brandId: 'clorox_salt_pool',
    padId: 'freeChlorine',
    confirmedValue: 3,
    rawRgb: rgb,
    normalizedRgb: rgb,
    lab: rgbToLab(rgb),
    deltaEToAnchor: 2,
    quality: goodQuality,
    lightingEstimate: 80,
    calibrationSource: 'test',
    timestamp: Date.now(),
    reliabilityWeight: weight,
    deviceCalibrationVersion: 'test',
    timingExpired: false,
    userCorrected: false,
    scanSessionId: 'test',
  };
}

describe('sample acceptance', () => {
  it('accepts verified high-quality sample', () => {
    expect(isSampleEligible(makeCandidate()).eligible).toBe(true);
  });

  it('rejects unverified sample', () => {
    expect(isSampleEligible(makeCandidate({ userExplicitlyVerified: false })).eligible).toBe(false);
  });

  it('rejects low-quality sample', () => {
    const bad = { focusScore: 0.1, lightingScore: 0.1, alignmentScore: 0.1, stabilityScore: 0.1 };
    expect(isSampleEligible(makeCandidate({ quality: bad })).eligible).toBe(false);
  });

  it('rejects ambiguous without correction', () => {
    expect(
      isSampleEligible(
        makeCandidate({
          match: makeMatch({ ambiguous: true, proposedValue: 3 }),
          confirmedValue: 3,
        })
      ).eligible
    ).toBe(false);
  });

  it('accepts ambiguous when user corrected', () => {
    const { samples } = extractEligibleSamples([
      makeCandidate({
        match: makeMatch({ ambiguous: true }),
        confirmedValue: 5,
      }),
    ]);
    expect(samples).toHaveLength(1);
  });

  it('rejects expired window without acknowledgment', () => {
    expect(
      isSampleEligible(makeCandidate({ timingExpired: true, timingAcknowledged: false })).eligible
    ).toBe(false);
  });
});

describe('anchor blending', () => {
  it('returns zero learned weight below minimum samples in phase 2', () => {
    expect(computeLearnedWeight(2, 2)).toBe(0);
  });

  it('returns light blend at 3 samples in phase 2', () => {
    expect(computeLearnedWeight(3, 2)).toBe(ADAPTIVE_LEARNING_THRESHOLDS.lightBlendWeight);
  });

  it('increases weight at 5+ samples in phase 2', () => {
    expect(computeLearnedWeight(6, 2)).toBeGreaterThan(ADAPTIVE_LEARNING_THRESHOLDS.lightBlendWeight);
    expect(computeLearnedWeight(10, 2)).toBeLessThanOrEqual(ADAPTIVE_LEARNING_THRESHOLDS.maxLearnedWeight);
  });

  it('allows earlier blending in phase 1', () => {
    expect(computeLearnedWeight(1, 1)).toBeGreaterThan(0);
  });

  it('never fully discards baseline in blend', () => {
    const baseline: [number, number, number] = [100, 100, 100];
    const learned: [number, number, number] = [200, 200, 200];
    const blended = blendAnchorRgb(baseline, learned, 0.6);
    expect(blended[0]).toBeGreaterThan(100);
    expect(blended[0]).toBeLessThan(200);
  });

  it('clamps drift from baseline', () => {
    const baseline: [number, number, number] = [100, 100, 100];
    const far: [number, number, number] = [200, 200, 200];
    const clamped = clampDriftFromBaseline(far, baseline);
    expect(clamped[0]).toBeLessThanOrEqual(140);
  });

  it('rejects statistical outliers', () => {
    const samples = [
      makeSample([100, 100, 100]),
      makeSample([102, 100, 98]),
      makeSample([250, 250, 250]),
    ];
    const { accepted, rejectedCount } = filterOutliers(samples);
    expect(rejectedCount).toBeGreaterThan(0);
    expect(accepted.length).toBeLessThan(3);
  });

  it('activates learned anchor only with enough samples', () => {
    const baseline: [number, number, number] = [255, 160, 190];
    const few = [makeSample([250, 155, 185]), makeSample([252, 158, 188])];
    const { state: fewState } = computeLearnedAnchorState('freeChlorine', 3, few, baseline, 0, 2);
    expect(fewState.active).toBe(false);

    const many = [
      ...few,
      makeSample([251, 157, 187]),
      makeSample([253, 159, 189]),
      makeSample([254, 160, 188]),
    ];
    const { state: manyState } = computeLearnedAnchorState('freeChlorine', 3, many, baseline, 0, 2);
    expect(manyState.active).toBe(true);
  });
});

describe('adaptive learning storage', () => {
  beforeEach(() => {
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
    setAdaptiveLearningEnabled(true);
  });

  it('adds samples and rebuilds anchors', () => {
    const samples = Array.from({ length: 5 }, (_, i) =>
      makeSample([250 + i, 155 + i, 185 + i])
    );
    const { added } = addVerifiedSamples(samples);
    expect(added).toBe(5);
    expect(loadAdaptiveProfile().samples).toHaveLength(5);
  });

  it('resets learned calibration only', () => {
    addVerifiedSamples([makeSample([100, 100, 100])]);
    resetLearnedCalibration();
    expect(loadAdaptiveProfile().samples).toHaveLength(0);
    expect(isAdaptiveLearningEnabled()).toBe(true);
  });

  it('tracks false-high-confidence count', () => {
    addVerifiedSamples([makeSample([100, 100, 100])], 2);
    expect(loadAdaptiveProfile().falseHighConfidenceCount).toBe(2);
  });

  it('rebuilds anchors after sample removal', async () => {
    const { removeSample } = await import('./adaptiveStorage');
    const samples = Array.from({ length: 5 }, (_, i) =>
      makeSample([250 + i, 155 + i, 185 + i])
    );
    samples.forEach((s, i) => {
      s.id = `sample-${i}`;
    });
    addVerifiedSamples(samples);
    removeSample('sample-0');
    rebuildLearnedAnchors();
    expect(loadAdaptiveProfile().samples).toHaveLength(4);
  });
});

describe('adaptive import validation', () => {
  it('rejects image-like keys', () => {
    const result = validateAdaptiveImport({ version: 1, brandId: 'clorox_salt_pool', samples: [], photo: 'data' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid pad id', () => {
    const result = validateAdaptiveImport({
      version: 1,
      brandId: 'clorox_salt_pool',
      samples: [{ padId: 'invalid', confirmedValue: 3, rawRgb: [1, 2, 3], normalizedRgb: [1, 2, 3] }],
    });
    expect(result.valid).toBe(false);
  });
});

describe('confidence safeguards', () => {
  beforeEach(() => {
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
    setAdaptiveLearningEnabled(true);
  });

  it('caps confidence for low sample count', () => {
    const samples = Array.from({ length: 3 }, () => makeSample([250, 155, 185]));
    addVerifiedSamples(samples);
    rebuildLearnedAnchors();
    const caps = getAnchorConfidenceCaps('freeChlorine', 3);
    expect(caps.lowSampleCap).toBe(74);
  });
});

describe('weighted median', () => {
  it('computes weighted median RGB', () => {
    const median = weightedMedianRgb([
      makeSample([100, 100, 100], 1),
      makeSample([110, 110, 110], 2),
      makeSample([120, 120, 120], 1),
    ]);
    expect(median).toEqual([110, 110, 110]);
  });
});

describe('buildVerifiedSample', () => {
  it('lowers reliability for expired acknowledged window', () => {
    const sample = buildVerifiedSample(
      makeCandidate({ timingExpired: true, timingAcknowledged: true })
    );
    expect(sample.reliabilityWeight).toBeLessThan(1);
  });
});
