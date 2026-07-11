import { rgbToLab, type Lab, type Rgb } from '../scanner/colorScience';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';
import type { LearnedAnchorState, VerifiedPadSample } from './adaptiveTypes';

const T = ADAPTIVE_LEARNING_THRESHOLDS;

function labDistance(a: Lab, b: Lab): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Compute learned weight from reliable sample count */
export function computeLearnedWeight(reliableSampleCount: number): number {
  if (reliableSampleCount < T.minSamplesForBlend) return 0;
  if (reliableSampleCount < T.minSamplesForStrong) return T.lightBlendWeight;
  const extra = reliableSampleCount - T.minSamplesForStrong;
  const t = Math.min(1, extra / 5);
  return T.lightBlendWeight + t * (T.maxLearnedWeight - T.lightBlendWeight);
}

/** Weighted median of RGB channels */
export function weightedMedianRgb(samples: VerifiedPadSample[]): Rgb | null {
  if (samples.length === 0) return null;

  function weightedMedianChannel(getValue: (s: VerifiedPadSample) => number): number {
    const sorted = [...samples].sort((a, b) => getValue(a) - getValue(b));
    const totalWeight = sorted.reduce((s, x) => s + x.reliabilityWeight, 0);
    let cumulative = 0;
    for (const s of sorted) {
      cumulative += s.reliabilityWeight;
      if (cumulative >= totalWeight / 2) return getValue(s);
    }
    return getValue(sorted[sorted.length - 1]);
  }

  return [
    Math.round(weightedMedianChannel((s) => s.normalizedRgb[0])),
    Math.round(weightedMedianChannel((s) => s.normalizedRgb[1])),
    Math.round(weightedMedianChannel((s) => s.normalizedRgb[2])),
  ];
}

/** Reject statistical outliers by LAB distance from median */
export function filterOutliers(samples: VerifiedPadSample[]): {
  accepted: VerifiedPadSample[];
  rejectedCount: number;
} {
  if (samples.length < 3) return { accepted: samples, rejectedCount: 0 };

  const medianRgb = weightedMedianRgb(samples);
  if (!medianRgb) return { accepted: samples, rejectedCount: 0 };

  const medianLab = rgbToLab(medianRgb);
  const accepted: VerifiedPadSample[] = [];
  let rejectedCount = 0;

  for (const s of samples) {
    const sampleLab = rgbToLab(s.normalizedRgb);
    const dist = labDistance(sampleLab, medianLab);
    if (dist > T.outlierLabDistance) {
      rejectedCount++;
    } else {
      accepted.push(s);
    }
  }

  if (accepted.length === 0) {
    return { accepted: samples.slice(0, 1), rejectedCount: samples.length - 1 };
  }

  return { accepted, rejectedCount };
}

/** Clamp learned RGB so it cannot drift too far from baseline */
export function clampDriftFromBaseline(learned: Rgb, baseline: Rgb): Rgb {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  return [
    clamp(learned[0], baseline[0] - T.maxDriftRgb, baseline[0] + T.maxDriftRgb),
    clamp(learned[1], baseline[1] - T.maxDriftRgb, baseline[1] + T.maxDriftRgb),
    clamp(learned[2], baseline[2] - T.maxDriftRgb, baseline[2] + T.maxDriftRgb),
  ];
}

/** Blend baseline and learned RGB — never fully discard baseline */
export function blendAnchorRgb(baseline: Rgb, learned: Rgb, learnedWeight: number): Rgb {
  const w = Math.max(0, Math.min(T.maxLearnedWeight, learnedWeight));
  const bw = 1 - w;
  return [
    Math.round(baseline[0] * bw + learned[0] * w),
    Math.round(baseline[1] * bw + learned[1] * w),
    Math.round(baseline[2] * bw + learned[2] * w),
  ];
}

function computeVarianceLab(samples: VerifiedPadSample[]): number {
  if (samples.length < 2) return 0;
  const avgL = samples.reduce((s, x) => s + x.lab[0], 0) / samples.length;
  const avgA = samples.reduce((s, x) => s + x.lab[1], 0) / samples.length;
  const avgB = samples.reduce((s, x) => s + x.lab[2], 0) / samples.length;
  return (
    samples.reduce(
      (s, x) => s + (x.lab[0] - avgL) ** 2 + (x.lab[1] - avgA) ** 2 + (x.lab[2] - avgB) ** 2,
      0
    ) / samples.length
  );
}

/** Build learned anchor state for one pad/chart value */
export function computeLearnedAnchorState(
  padId: string,
  value: number,
  samples: VerifiedPadSample[],
  baselineRgb: Rgb,
  previousRejected = 0
): { state: LearnedAnchorState; rejectedCount: number } {
  const padSamples = samples.filter((s) => s.padId === padId && s.confirmedValue === value);
  const { accepted, rejectedCount } = filterOutliers(padSamples);
  const reliableSampleCount = accepted.reduce((s, x) => s + (x.reliabilityWeight >= 0.5 ? 1 : 0.5), 0);
  const learnedWeight = computeLearnedWeight(Math.floor(reliableSampleCount));
  const varianceLab = Math.sqrt(computeVarianceLab(accepted));

  if (learnedWeight === 0 || accepted.length === 0) {
    return {
      state: {
        padId,
        value,
        learnedRgb: null,
        learnedLab: null,
        sampleCount: padSamples.length,
        reliableSampleCount: Math.floor(reliableSampleCount),
        varianceLab,
        baselineWeight: 1,
        learnedWeight: 0,
        highVariance: varianceLab > T.highVarianceLabSpread,
        active: false,
      },
      rejectedCount: rejectedCount + previousRejected,
    };
  }

  const rawLearned = weightedMedianRgb(accepted)!;
  const clampedLearned = clampDriftFromBaseline(rawLearned, baselineRgb);

  return {
    state: {
      padId,
      value,
      learnedRgb: clampedLearned,
      learnedLab: rgbToLab(clampedLearned),
      sampleCount: padSamples.length,
      reliableSampleCount: Math.floor(reliableSampleCount),
      varianceLab,
      baselineWeight: 1 - learnedWeight,
      learnedWeight,
      highVariance: varianceLab > T.highVarianceLabSpread,
      active: true,
    },
    rejectedCount: rejectedCount + previousRejected,
  };
}

/** Apply learned state to produce final blended RGB for matching */
export function applyLearnedBlend(baselineRgb: Rgb, state: LearnedAnchorState): Rgb {
  if (!state.active || !state.learnedRgb) return baselineRgb;
  return blendAnchorRgb(baselineRgb, state.learnedRgb, state.learnedWeight);
}
