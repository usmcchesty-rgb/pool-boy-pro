import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { AdaptiveLearningProfile } from './adaptiveTypes';
import {
  computeCalibrationQuality,
  computePhaseLearnedWeight,
  computeScannerConfidence,
  countVerifiedPads,
  countVerifiedScans,
  getLearningPhase,
  getUserFriendlyStatus,
  PHASE_BLEND_CONFIG,
} from './learningPhases';
import {
  computeLearnedWeight,
  computeLearnedAnchorState,
} from './anchorBlending';
import {
  addVerifiedSamples,
  getAdaptiveProfileSummary,
  resetLearnedCalibration,
} from './adaptiveLearning';
import {
  isAdaptiveLearningEnabled,
  pauseAdaptiveLearning,
  resumeAdaptiveLearning,
  setAdaptiveLearningEnabled,
  loadAdaptiveProfile,
} from './adaptiveStorage';
import type { VerifiedPadSample } from './adaptiveTypes';
import type { StripCaptureQuality } from '../../models/types';
import { rgbToLab } from '../scanner/colorScience';

const goodQuality: StripCaptureQuality = {
  focusScore: 0.8,
  lightingScore: 0.8,
  alignmentScore: 0.8,
  stabilityScore: 0.8,
};

function makeSample(sessionId: string, padId = 'freeChlorine'): VerifiedPadSample {
  return {
    id: `s-${Math.random()}`,
    brandId: 'clorox_salt_pool',
    padId,
    confirmedValue: 3,
    rawRgb: [250, 155, 185],
    normalizedRgb: [250, 155, 185],
    lab: rgbToLab([250, 155, 185]),
    deltaEToAnchor: 2,
    quality: goodQuality,
    lightingEstimate: 80,
    calibrationSource: 'test',
    timestamp: Date.now(),
    reliabilityWeight: 1,
    deviceCalibrationVersion: 'test',
    timingExpired: false,
    userCorrected: false,
    scanSessionId: sessionId,
  };
}

describe('learning phases', () => {
  it('transitions phases at scan count thresholds', () => {
    expect(getLearningPhase(0)).toBe(1);
    expect(getLearningPhase(10)).toBe(1);
    expect(getLearningPhase(11)).toBe(2);
    expect(getLearningPhase(30)).toBe(2);
    expect(getLearningPhase(31)).toBe(3);
    expect(getLearningPhase(100)).toBe(3);
    expect(getLearningPhase(101)).toBe(4);
  });

  it('uses aggressive blend weights in phase 1', () => {
    expect(computePhaseLearnedWeight(1, 1)).toBe(PHASE_BLEND_CONFIG[1].lightBlendWeight);
    expect(computePhaseLearnedWeight(1, 1)).toBeGreaterThan(computePhaseLearnedWeight(3, 2));
    expect(computePhaseLearnedWeight(8, 1)).toBe(PHASE_BLEND_CONFIG[1].maxLearnedWeight);
  });

  it('uses moderate weights in phase 2', () => {
    expect(computePhaseLearnedWeight(2, 2)).toBe(0);
    expect(computePhaseLearnedWeight(3, 2)).toBe(0.15);
    expect(computePhaseLearnedWeight(10, 2)).toBe(0.6);
  });

  it('uses slow refinement in phase 3', () => {
    expect(computePhaseLearnedWeight(10, 3)).toBeCloseTo(0.45, 5);
    expect(computePhaseLearnedWeight(10, 3)).toBeLessThan(computePhaseLearnedWeight(10, 2));
  });

  it('uses maintenance weights in phase 4', () => {
    expect(computePhaseLearnedWeight(10, 4)).toBe(0.25);
    expect(computePhaseLearnedWeight(10, 4)).toBeLessThan(computePhaseLearnedWeight(10, 3));
  });

  it('bootstraps learned anchor from a single sample in phase 1', () => {
    const baseline: [number, number, number] = [255, 160, 190];
    const { state } = computeLearnedAnchorState(
      'freeChlorine',
      3,
      [makeSample('boot-1')],
      baseline,
      0,
      1
    );
    expect(state.active).toBe(true);
    expect(state.learnedWeight).toBeGreaterThan(0);
  });
});

describe('learning profile statistics', () => {
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

  it('tracks verified scan sessions', () => {
    addVerifiedSamples([makeSample('scan-a'), makeSample('scan-a', 'totalAlkalinity')]);
    addVerifiedSamples([makeSample('scan-b')]);

    const profile = loadAdaptiveProfile();
    expect(profile.verifiedScanCount).toBe(2);
    expect(countVerifiedScans(profile)).toBe(2);
    expect(countVerifiedPads(profile)).toBe(2);
  });

  it('improves confidence as scans accumulate', () => {
    const emptySummary = getAdaptiveProfileSummary();
    expect(emptySummary.scannerConfidence).toBeLessThan(50);

    for (let i = 0; i < 12; i++) {
      addVerifiedSamples(
        Array.from({ length: 5 }, (_, j) => makeSample(`scan-${i}`, j === 0 ? 'freeChlorine' : 'totalAlkalinity'))
      );
    }

    const summary = getAdaptiveProfileSummary();
    expect(summary.verifiedScanCount).toBe(12);
    expect(summary.currentPhase).toBe(2);
    expect(summary.scannerConfidence).toBeGreaterThan(emptySummary.scannerConfidence);
    expect(['fair', 'good', 'excellent']).toContain(summary.calibrationQuality);
  });

  it('records dateLastImproved when calibration advances', () => {
    addVerifiedSamples(Array.from({ length: 5 }, () => makeSample('improve-1')));
    const profile = loadAdaptiveProfile();
    expect(profile.dateLastImproved).not.toBeNull();
  });

  it('exposes user-friendly profile summary fields', () => {
    addVerifiedSamples([makeSample('friendly-1')]);
    const summary = getAdaptiveProfileSummary();
    expect(summary.statusLabel).toBe('Learning');
    expect(summary.calibrationQualityLabel).toBeTruthy();
    expect(summary.verifiedPadsCount).toBeGreaterThan(0);
  });
});

describe('pause and resume learning', () => {
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

  it('pauses and resumes without clearing samples', () => {
    addVerifiedSamples([makeSample('pause-1')]);
    pauseAdaptiveLearning();
    expect(isAdaptiveLearningEnabled()).toBe(false);
    expect(getUserFriendlyStatus('learning', 1, true)).toBe('Paused');

    resumeAdaptiveLearning();
    expect(isAdaptiveLearningEnabled()).toBe(true);
    expect(loadAdaptiveProfile().samples).toHaveLength(1);
  });

  it('reset clears learning progress', () => {
    addVerifiedSamples([makeSample('reset-1')]);
    resetLearnedCalibration();
    const profile = loadAdaptiveProfile();
    expect(profile.samples).toHaveLength(0);
    expect(profile.verifiedScanCount).toBe(0);
  });
});

describe('confidence and calibration quality', () => {
  it('maps confidence to calibration quality labels', () => {
    expect(computeCalibrationQuality(92)).toBe('excellent');
    expect(computeCalibrationQuality(80)).toBe('good');
    expect(computeCalibrationQuality(60)).toBe('fair');
    expect(computeCalibrationQuality(30)).toBe('building');
  });

  it('reduces confidence when health needs review', () => {
    const profile: AdaptiveLearningProfile = {
      version: 1,
      brandId: 'clorox_salt_pool',
      enabled: true,
      calibrationVersion: 'test',
      lastUpdated: new Date().toISOString(),
      verifiedScanCount: 20,
      verifiedScanSessionIds: [],
      dateLastImproved: null,
      samples: [],
      rejectedOutlierCount: 0,
      falseHighConfidenceCount: 0,
      totalRejectedSamples: 0,
      activityLog: [],
      rollbackRecords: [],
      safetyOverrides: [],
    };

    const stable = computeScannerConfidence({
      profile,
      states: new Map(),
      healthStatus: 'learning',
      falseHighCount: 0,
    });
    const review = computeScannerConfidence({
      profile,
      states: new Map(),
      healthStatus: 'needs_review',
      falseHighCount: 0,
    });
    expect(review).toBeLessThan(stable);
  });
});

describe('long-term stability', () => {
  it('caps learned weight lower in maintenance phase', () => {
    expect(computeLearnedWeight(10, 4)).toBe(0.25);
    expect(computeLearnedWeight(10, 4)).toBeLessThan(computeLearnedWeight(10, 2));
  });
});
