import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';
import { CLOROX_COLOR_ANCHORS } from '../scanner/cloroxCalibration';
import { rgbToLab } from '../scanner/colorScience';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';
import { ADAPTIVE_HEALTH_THRESHOLDS } from './adaptiveHealthConfig';
import {
  buildLearningHealthSummary,
  buildPadLearningProgress,
  averageQualityScore,
} from './adaptiveHealth';
import {
  applyLearnedBlend,
  computeLearnedAnchorState,
} from './anchorBlending';
import { assessAnchorRegression, applyRollback, getEffectiveLearnedWeight } from './adaptiveRollback';
import {
  CALIBRATION_QUALITY_LABELS,
  computeCalibrationQuality,
  computeScannerConfidence,
  countVerifiedPads,
  countVerifiedScans,
  getLearningPhase,
  getUserFriendlyStatus,
} from './learningPhases';
import type {
  AdaptiveLearningProfile,
  AdaptiveProfileSummary,
  LearnedAnchorState,
  LearningHealthSummary,
  PadLearningProgress,
  VerifiedPadSample,
} from './adaptiveTypes';
import {
  isAdaptiveLearningEnabled,
  loadAdaptiveProfile,
  saveAdaptiveProfile,
} from './adaptiveStorage';
import { loadImportedCalibration } from './storage';
import type { StripCaptureQuality } from '../../models/types';
import type { SampleRejectionReason } from './sampleAcceptance';

let cachedLearnedStates: Map<string, LearnedAnchorState> | null = null;

function stateKey(padId: string, value: number): string {
  return `${padId}:${value}`;
}

/** Invalidate cached learned anchor states */
export function invalidateAdaptiveCache(): void {
  cachedLearnedStates = null;
}

function getBaselineRgb(padId: string, value: number): [number, number, number] {
  const imported = loadImportedCalibration();
  if (imported) {
    const pad = imported.pads.find((p) => p.padId === padId);
    const anchor = pad?.anchors.find((a) => a.value === value);
    if (anchor) return anchor.referenceRgb;
  }
  const builtin = CLOROX_COLOR_ANCHORS[padId]?.find((a) => a.value === value);
  return builtin?.rgb ?? [128, 128, 128];
}

/** Rebuild all learned anchor states from stored samples and run safety rollbacks */
export function rebuildLearnedAnchors(profile?: AdaptiveLearningProfile): Map<string, LearnedAnchorState> {
  const p = profile ?? loadAdaptiveProfile();
  const phase = getLearningPhase(countVerifiedScans(p));
  const states = new Map<string, LearnedAnchorState>();
  let totalRejected = 0;

  for (const pad of CLOROX_SALT_POOL_STRIP.pads) {
    for (const value of pad.scaleValues) {
      const baseline = getBaselineRgb(pad.id, value);
      const { state, rejectedCount } = computeLearnedAnchorState(
        pad.id,
        value,
        p.samples,
        baseline,
        0,
        phase
      );
      totalRejected += rejectedCount;
      states.set(stateKey(pad.id, value), state);
    }
  }

  if (totalRejected > p.rejectedOutlierCount) {
    p.rejectedOutlierCount = totalRejected;
  }

  let overrides = [...p.safetyOverrides];
  const newRollbacks = [...p.rollbackRecords];

  for (const state of states.values()) {
    if (!state.active) continue;
    const existing = overrides.find((o) => o.padId === state.padId && o.value === state.value);
    const assessment = assessAnchorRegression(state, p.samples, existing);
    if (!assessment) continue;

    if (existing?.disabled) continue;
    if (
      assessment.shouldReduce &&
      existing?.learnedWeightMultiplier === ADAPTIVE_HEALTH_THRESHOLDS.regressionWeightMultiplier
    ) {
      continue;
    }

    const { overrides: nextOverrides, record } = applyRollback(overrides, assessment, state);
    const changed =
      !existing ||
      existing.disabled !== record.disabled ||
      existing.learnedWeightMultiplier !== (record.disabled ? 0 : ADAPTIVE_HEALTH_THRESHOLDS.regressionWeightMultiplier);

    if (changed) {
      overrides = nextOverrides;
      newRollbacks.push(record);
    }
  }

  p.safetyOverrides = overrides;
  p.rollbackRecords = newRollbacks;
  saveAdaptiveProfile(p);

  cachedLearnedStates = states;
  return states;
}

function getLearnedStates(): Map<string, LearnedAnchorState> {
  if (!cachedLearnedStates) {
    return rebuildLearnedAnchors();
  }
  return cachedLearnedStates;
}

export function getLearnedAnchorState(padId: string, value: number): LearnedAnchorState | null {
  if (!isAdaptiveLearningEnabled()) return null;
  const profile = loadAdaptiveProfile();
  if (profile.samples.length === 0) return null;
  return getLearnedStates().get(stateKey(padId, value)) ?? null;
}

/** Get blended RGB for matching — applies learned weight with safety overrides */
export function getBlendedAnchorRgb(padId: string, value: number): [number, number, number] {
  const baseline = getBaselineRgb(padId, value);
  if (!isAdaptiveLearningEnabled()) return baseline;

  const profile = loadAdaptiveProfile();
  const state = getLearnedStates().get(stateKey(padId, value));
  if (!state?.active || !state.learnedRgb) return baseline;

  const override = profile.safetyOverrides.find((o) => o.padId === padId && o.value === value);
  const effectiveWeight = getEffectiveLearnedWeight(state, override);
  if (effectiveWeight <= 0) return baseline;

  const adjustedState = { ...state, learnedWeight: effectiveWeight };
  return applyLearnedBlend(baseline, adjustedState);
}

export function getFalseHighConfidencePenalty(): number {
  const profile = loadAdaptiveProfile();
  return Math.min(0.25, profile.falseHighConfidenceCount * 0.02);
}

export function getAdaptiveProfileSummary(): AdaptiveProfileSummary {
  const profile = loadAdaptiveProfile();
  const imported = loadImportedCalibration();
  const states = getLearnedStates();
  const activeLearned = [...states.values()].filter((s) => s.active);
  const health = buildLearningHealthSummary(profile, states);
  const verifiedScanCount = countVerifiedScans(profile);
  const verifiedPadsCount = countVerifiedPads(profile);
  const phase = getLearningPhase(verifiedScanCount);
  const scannerConfidence = computeScannerConfidence({
    profile,
    states,
    healthStatus: health.overallStatus,
    falseHighCount: profile.falseHighConfidenceCount,
  });
  const calibrationQuality = computeCalibrationQuality(scannerConfidence);
  const paused = !isAdaptiveLearningEnabled();

  let activeSource: AdaptiveProfileSummary['activeSource'] = 'builtin_approximate';
  let activeSourceLabel = 'Built-in approximate anchors';
  let baselineWeight = 1;
  let learnedWeight = 0;

  if (activeLearned.length > 0) {
    const avgLearnedW =
      activeLearned.reduce((s, x) => s + x.learnedWeight, 0) / activeLearned.length;
    learnedWeight = avgLearnedW;
    baselineWeight = 1 - avgLearnedW;

    if (imported) {
      activeSource = 'blended_calibrated_learned';
      activeSourceLabel = `Blended: developer calibrated + adaptive (${profile.samples.length} samples)`;
    } else {
      activeSource = 'blended_baseline_learned';
      activeSourceLabel = `Adaptive device learning (${profile.samples.length} samples)`;
    }
  } else if (imported) {
    activeSource = 'developer_calibrated';
    activeSourceLabel = `Developer calibrated (${imported.calibrationVersion})`;
  }

  const samplesPerPadValue: Record<string, Record<number, number>> = {};
  for (const s of profile.samples) {
    if (!samplesPerPadValue[s.padId]) samplesPerPadValue[s.padId] = {};
    samplesPerPadValue[s.padId][s.confirmedValue] =
      (samplesPerPadValue[s.padId][s.confirmedValue] ?? 0) + 1;
  }

  const highVarianceAnchors = [...states.values()]
    .filter((s) => s.highVariance && s.active)
    .map((s) => ({ padId: s.padId, value: s.value, varianceLab: s.varianceLab }));

  return {
    enabled: isAdaptiveLearningEnabled(),
    totalSamples: profile.samples.length,
    verifiedScanCount,
    verifiedPadsCount,
    currentPhase: phase,
    scannerConfidence,
    calibrationQuality,
    calibrationQualityLabel: CALIBRATION_QUALITY_LABELS[calibrationQuality],
    statusLabel: getUserFriendlyStatus(health.overallStatus, verifiedScanCount, paused),
    dateLastImproved: profile.dateLastImproved,
    calibrationVersion: profile.calibrationVersion,
    lastUpdated: profile.lastUpdated,
    activeSource,
    activeSourceLabel,
    baselineWeight,
    learnedWeight,
    rejectedOutlierCount: profile.rejectedOutlierCount,
    falseHighConfidenceCount: profile.falseHighConfidenceCount,
    totalRejectedSamples: profile.totalRejectedSamples,
    samplesPerPadValue,
    highVarianceAnchors,
    learnedAnchorCount: activeLearned.length,
  };
}

/** Append learning activity entries to profile (mutates in place) */
export function appendLearningActivity(
  profile: AdaptiveLearningProfile,
  accepted: VerifiedPadSample[],
  rejections: SampleRejectionReason[],
  quality?: StripCaptureQuality
): void {
  const H = ADAPTIVE_HEALTH_THRESHOLDS;
  const defaultQuality = averageQualityScore(quality);

  for (const sample of accepted) {
    profile.activityLog.unshift({
      id: `act-${sample.id}`,
      padId: sample.padId,
      confirmedValue: sample.confirmedValue,
      accepted: true,
      qualityScore: averageQualityScore(sample.quality),
      timestamp: sample.timestamp,
      scanSessionId: sample.scanSessionId,
    });
  }

  for (const rej of rejections) {
    profile.activityLog.unshift({
      id: `act-rej-${Date.now()}-${rej.padId}`,
      padId: rej.padId,
      accepted: false,
      rejectionReason: rej.reason,
      qualityScore: defaultQuality,
      timestamp: Date.now(),
    });
    profile.totalRejectedSamples += 1;
  }

  profile.activityLog = profile.activityLog.slice(0, H.maxActivityLogEntries);
}

export function getLearningHealthSummary(): LearningHealthSummary {
  const profile = loadAdaptiveProfile();
  return buildLearningHealthSummary(profile, getLearnedStates());
}

export function getPadLearningProgress(): PadLearningProgress[] {
  const profile = loadAdaptiveProfile();
  const states = [...getLearnedStates().values()];
  return buildPadLearningProgress(
    states,
    profile.safetyOverrides,
    profile.samples,
    profile.falseHighConfidenceCount
  );
}

export function getRecentLearningActivity(limit = 15) {
  const profile = loadAdaptiveProfile();
  return profile.activityLog.slice(0, limit);
}

/** Add verified samples and rebuild anchors */
export function addVerifiedSamples(
  newSamples: VerifiedPadSample[],
  falseHighCount = 0,
  rejections: SampleRejectionReason[] = [],
  quality?: StripCaptureQuality
): { added: number; profile: AdaptiveLearningProfile } {
  const profile = loadAdaptiveProfile();
  const T = ADAPTIVE_LEARNING_THRESHOLDS;
  const beforeStates = rebuildLearnedAnchors(profile);
  const beforeActiveWeight = [...beforeStates.values()]
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.learnedWeight, 0);

  const newSessionIds = new Set(
    newSamples.map((s) => s.scanSessionId).filter(Boolean)
  );
  for (const sessionId of newSessionIds) {
    if (!profile.verifiedScanSessionIds.includes(sessionId)) {
      profile.verifiedScanSessionIds.push(sessionId);
      profile.verifiedScanCount += 1;
    }
  }

  for (const sample of newSamples) {
    const existing = profile.samples.filter(
      (s) => s.padId === sample.padId && s.confirmedValue === sample.confirmedValue
    );

    if (existing.length >= T.maxSamplesPerPadValue) {
      const oldest = existing.sort((a, b) => a.timestamp - b.timestamp)[0];
      profile.samples = profile.samples.filter((s) => s.id !== oldest.id);
    }

    profile.samples.push({
      ...sample,
      lab: rgbToLab(sample.normalizedRgb),
    });
  }

  if (falseHighCount > 0) {
    profile.falseHighConfidenceCount += falseHighCount;
  }

  profile.lastUpdated = new Date().toISOString();
  profile.calibrationVersion = `adaptive-v${profile.samples.length}`;
  appendLearningActivity(profile, newSamples, rejections, quality);
  saveAdaptiveProfile(profile);
  invalidateAdaptiveCache();
  const afterStates = rebuildLearnedAnchors(profile);
  const afterActiveWeight = [...afterStates.values()]
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.learnedWeight, 0);
  const beforeActiveCount = [...beforeStates.values()].filter((s) => s.active).length;
  const afterActiveCount = [...afterStates.values()].filter((s) => s.active).length;

  if (
    afterActiveWeight > beforeActiveWeight + 0.01 ||
    afterActiveCount > beforeActiveCount
  ) {
    profile.dateLastImproved = profile.lastUpdated;
    saveAdaptiveProfile(profile);
  }

  return { added: newSamples.length, profile };
}

export function exportAdaptiveLearningJson(): string {
  const profile = loadAdaptiveProfile();
  return JSON.stringify(profile, null, 2);
}

export { resetLearnedCalibration, resetLearnedPad, resetLearnedPadValue } from './adaptiveStorage';
export { removeSample } from './adaptiveStorage';
