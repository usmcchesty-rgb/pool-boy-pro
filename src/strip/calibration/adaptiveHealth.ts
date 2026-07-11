import type { StripCaptureQuality } from '../../models/types';
import { ADAPTIVE_HEALTH_THRESHOLDS } from './adaptiveHealthConfig';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';
import type {
  AnchorSafetyOverride,
  LearnedAnchorState,
  LearningHealthStatus,
  LearningHealthSummary,
  PadLearningProgress,
  PadLearningStatus,
  VerifiedPadSample,
} from './adaptiveTypes';
import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';

const H = ADAPTIVE_HEALTH_THRESHOLDS;
const T = ADAPTIVE_LEARNING_THRESHOLDS;

export function averageQualityScore(quality?: StripCaptureQuality): number {
  if (!quality) return 0;
  return (quality.focusScore + quality.lightingScore + quality.alignmentScore + quality.stabilityScore) / 4;
}

/** Recent correction rate for samples at a pad/value */
export function computeCorrectionRate(
  samples: VerifiedPadSample[],
  padId: string,
  value?: number,
  window: number = H.recentCorrectionWindow
): number {
  let filtered = samples.filter((s) => s.padId === padId);
  if (value !== undefined) {
    filtered = filtered.filter((s) => s.confirmedValue === value);
  }
  const recent = [...filtered].sort((a, b) => b.timestamp - a.timestamp).slice(0, window);
  if (recent.length === 0) return 0;
  const corrections = recent.filter((s) => s.userCorrected).length;
  return corrections / recent.length;
}

/** Top scanner mistake: proposed vs confirmed from corrected samples */
export function computeTopMistake(
  samples: VerifiedPadSample[],
  padId: string
): PadLearningProgress['topMistake'] {
  const corrected = samples.filter((s) => s.padId === padId && s.userCorrected);
  const map = new Map<string, { proposed: number; confirmed: number; count: number }>();
  for (const s of corrected) {
    const proposed = s.proposedValue ?? s.confirmedValue;
    const key = `${proposed}→${s.confirmedValue}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { proposed, confirmed: s.confirmedValue, count: 1 });
    }
  }
  if (map.size === 0) return undefined;
  return [...map.values()].sort((a, b) => b.count - a.count)[0];
}

/** Whether an anchor meets Stable evidence rules */
export function isAnchorStable(
  state: LearnedAnchorState,
  samples: VerifiedPadSample[],
  falseHighCount: number
): boolean {
  if (!state.active) return false;
  if (state.reliableSampleCount < H.minSamplesPerAnchorStable) return false;
  if (state.varianceLab > H.maxVarianceForStable) return false;
  if (state.highVariance) return false;

  const correctionRate = computeCorrectionRate(samples, state.padId, state.value);
  if (correctionRate > H.maxCorrectionRateForStable) return false;

  if (falseHighCount >= H.maxFalseHighForReview) return false;

  return true;
}

/** Classify per-anchor learning status */
export function classifyAnchorStatus(
  state: LearnedAnchorState,
  override: AnchorSafetyOverride | undefined,
  samples: VerifiedPadSample[],
  falseHighCount: number
): PadLearningStatus {
  if (override?.disabled) return 'unreliable';
  if (!state.active) return 'baseline_only';
  if (state.highVariance || (override && override.learnedWeightMultiplier < 1)) {
    const rate = computeCorrectionRate(samples, state.padId, state.value, H.regressionWindow);
    if (rate >= H.regressionCorrectionRate) return 'unreliable';
  }
  if (isAnchorStable(state, samples, falseHighCount)) return 'stable';
  if (state.reliableSampleCount >= T.minSamplesForBlend) return 'learning';
  return 'baseline_only';
}

/** Classify overall learning health status */
export function classifyOverallHealth(params: {
  totalAccepted: number;
  totalRejected: number;
  activeLearned: number;
  highVarianceCount: number;
  falseHighCount: number;
  rollbackCount: number;
  unreliablePadCount: number;
  stableAnchorCount: number;
  totalAnchorsWithSamples: number;
}): LearningHealthStatus {
  const {
    totalAccepted,
    highVarianceCount,
    falseHighCount,
    rollbackCount,
    unreliablePadCount,
    stableAnchorCount,
    totalAnchorsWithSamples,
  } = params;

  if (totalAccepted < H.minTotalSamplesForLearning) return 'not_enough_data';

  if (
    falseHighCount >= H.maxFalseHighForReview ||
    highVarianceCount >= H.maxHighVarianceForReview ||
    rollbackCount > 0 ||
    unreliablePadCount > 0
  ) {
    return 'needs_review';
  }

  if (
    totalAccepted >= H.minTotalSamplesForStable &&
    stableAnchorCount > 0 &&
    stableAnchorCount >= Math.max(1, Math.floor(totalAnchorsWithSamples * 0.5))
  ) {
    return 'stable';
  }

  return 'learning';
}

export function classifyPadStatus(
  padId: string,
  states: LearnedAnchorState[],
  overrides: AnchorSafetyOverride[],
  samples: VerifiedPadSample[],
  falseHighCount: number
): PadLearningStatus {
  const padStates = states.filter((s) => s.padId === padId);
  const padOverrides = overrides.filter((o) => o.padId === padId);

  if (padOverrides.some((o) => o.disabled)) return 'unreliable';

  const active = padStates.filter((s) => s.active);
  if (active.length === 0) return 'baseline_only';

  const statuses = active.map((s) => {
    const ov = padOverrides.find((o) => o.value === s.value);
    return classifyAnchorStatus(s, ov, samples, falseHighCount);
  });

  if (statuses.every((s) => s === 'stable')) return 'stable';
  if (statuses.some((s) => s === 'unreliable')) return 'unreliable';
  if (statuses.some((s) => s === 'learning' || s === 'stable')) return 'learning';
  return 'baseline_only';
}

export function buildLearningHealthSummary(
  profile: {
    samples: VerifiedPadSample[];
    totalRejectedSamples: number;
    falseHighConfidenceCount: number;
    lastUpdated: string;
    rollbackRecords: { padId: string; value: number }[];
    safetyOverrides: AnchorSafetyOverride[];
  },
  states: Map<string, LearnedAnchorState>
): LearningHealthSummary {
  const allStates = [...states.values()];
  const activeLearned = allStates.filter((s) => s.active);
  const totalChartAnchors = CLOROX_SALT_POOL_STRIP.pads.reduce((n, p) => n + p.scaleValues.length, 0);
  const highVariance = activeLearned.filter((s) => s.highVariance).length;

  let stableCount = 0;
  let anchorsWithSamples = 0;
  let unreliablePads = 0;

  for (const pad of CLOROX_SALT_POOL_STRIP.pads) {
    const padStates = allStates.filter((s) => s.padId === pad.id && s.sampleCount > 0);
    if (padStates.length > 0) anchorsWithSamples += padStates.filter((s) => s.active).length;

    const padStatus = classifyPadStatus(
      pad.id,
      allStates,
      profile.safetyOverrides,
      profile.samples,
      profile.falseHighConfidenceCount
    );
    if (padStatus === 'unreliable') unreliablePads++;

    for (const s of padStates) {
      const ov = profile.safetyOverrides.find((o) => o.padId === s.padId && o.value === s.value);
      if (isAnchorStable(s, profile.samples, profile.falseHighConfidenceCount) && !ov?.disabled) {
        stableCount++;
      }
    }
  }

  return {
    totalAcceptedSamples: profile.samples.length,
    totalRejectedSamples: profile.totalRejectedSamples,
    activeLearnedAnchors: activeLearned.filter((s) => {
      const ov = profile.safetyOverrides.find((o) => o.padId === s.padId && o.value === s.value);
      return !ov?.disabled;
    }).length,
    baselineOnlyAnchors: totalChartAnchors - activeLearned.length,
    highVarianceAnchors: highVariance,
    falseHighConfidenceCorrections: profile.falseHighConfidenceCount,
    lastLearningUpdate: profile.lastUpdated,
    overallStatus: classifyOverallHealth({
      totalAccepted: profile.samples.length,
      totalRejected: profile.totalRejectedSamples,
      activeLearned: activeLearned.length,
      highVarianceCount: highVariance,
      falseHighCount: profile.falseHighConfidenceCount,
      rollbackCount: profile.rollbackRecords.length,
      unreliablePadCount: unreliablePads,
      stableAnchorCount: stableCount,
      totalAnchorsWithSamples: anchorsWithSamples,
    }),
    rollbackCount: profile.rollbackRecords.length,
  };
}

export function buildPadLearningProgress(
  states: LearnedAnchorState[],
  overrides: AnchorSafetyOverride[],
  samples: VerifiedPadSample[],
  falseHighCount: number
): PadLearningProgress[] {
  return CLOROX_SALT_POOL_STRIP.pads.map((pad) => {
    const padStates = states.filter((s) => s.padId === pad.id);
    const padSamples = samples.filter((s) => s.padId === pad.id);
    const active = padStates.filter((s) => s.active);
    const disabled = overrides.filter((o) => o.padId === pad.id && o.disabled).length;

    const avgVariance =
      active.length > 0 ? active.reduce((s, x) => s + x.varianceLab, 0) / active.length : 0;
    const avgLearnedW =
      active.length > 0 ? active.reduce((s, x) => s + x.learnedWeight, 0) / active.length : 0;

    return {
      padId: pad.id,
      label: pad.label,
      sampleCount: padSamples.length,
      activeLearnedValues: active.filter((s) => {
        const ov = overrides.find((o) => o.padId === s.padId && o.value === s.value);
        return !ov?.disabled;
      }).length,
      totalChartValues: pad.scaleValues.length,
      baselineWeight: 1 - avgLearnedW,
      learnedWeight: avgLearnedW,
      varianceLab: avgVariance,
      recentCorrectionRate: computeCorrectionRate(samples, pad.id),
      topMistake: computeTopMistake(samples, pad.id),
      status: classifyPadStatus(pad.id, states, overrides, samples, falseHighCount),
      disabledAnchors: disabled,
    };
  });
}
