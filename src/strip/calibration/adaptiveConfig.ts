/**
 * Adaptive learning thresholds — conservative by design.
 *
 * Activation:
 * - 0–2 reliable samples: baseline anchor only (no learned blend)
 * - 3–4 reliable samples: light blend (15% learned weight)
 * - 5+ reliable samples: up to 60% learned weight (baseline never below 40%)
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
