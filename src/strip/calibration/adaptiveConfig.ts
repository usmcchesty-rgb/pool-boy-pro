/**
 * Adaptive learning thresholds — conservative by design.
 *
 * Progressive phases (see learningPhases.ts) adjust blend weights by verified scan count:
 * - Phase 1 (0–10 scans): aggressive — 28% at 1 sample, up to 75% learned
 * - Phase 2 (11–30 scans): moderate — 15% at 3 samples, up to 60% learned
 * - Phase 3 (31–100 scans): refinement — up to 45% learned
 * - Phase 4 (100+ scans): maintenance — up to 25% learned
 *
 * Drift: learned RGB clamped to ±40 per channel from baseline.
 * Outliers: samples with LAB distance > 12 from weighted median are rejected.
 */

export const ADAPTIVE_SCHEMA_VERSION = 1;

export const ADAPTIVE_LEARNING_THRESHOLDS = {
  /** Minimum reliable samples before any learned blending */
  minSamplesForBlend: 3,
  /** Sample count for stronger learned weighting */
  minSamplesForStrong: 5,
  /** Learned weight at 3–4 samples */
  lightBlendWeight: 0.15,
  /** Maximum learned weight (baseline retains at least 40%) */
  maxLearnedWeight: 0.6,
  /** Max per-channel RGB drift from baseline */
  maxDriftRgb: 40,
  /** LAB distance from median to reject outlier sample */
  outlierLabDistance: 12,
  /** Minimum quality scores (match qualityAnalyzer thresholds) */
  minFocus: 0.35,
  minLighting: 0.45,
  minAlignment: 0.4,
  minStability: 0.65,
  /** Reliability weight when reading window expired but user continued */
  expiredWindowReliability: 0.5,
  /** Confidence cap when learned samples < minSamplesForStrong */
  lowSampleConfidenceCap: 74,
  /** Confidence cap when anchor has high variance */
  highVarianceConfidenceCap: 49,
  /** High variance threshold (LAB spread) */
  highVarianceLabSpread: 8,
  /** Max recent samples to retain per pad/value */
  maxSamplesPerPadValue: 20,
} as const;
