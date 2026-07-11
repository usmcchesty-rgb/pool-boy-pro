/**
 * Adaptive learning health and stability thresholds.
 *
 * Stable anchor requires:
 * - minSamplesPerAnchorStable reliable samples
 * - varianceLab <= maxVarianceForStable
 * - recent correction rate <= maxCorrectionRateForStable
 * - no false-high-confidence pattern in recent window
 *
 * Rollback triggers:
 * - correction rate >= regressionCorrectionRate with >= minCorrectionsForRegression
 * - First: reduce learned weight by regressionWeightMultiplier
 * - After regressionDisableAfter events: disable learned anchor (baseline fallback)
 */

export const ADAPTIVE_HEALTH_THRESHOLDS = {
  /** Overall status: minimum accepted samples before "Learning" */
  minTotalSamplesForLearning: 3,
  /** Overall status: minimum samples to evaluate "Stable" */
  minTotalSamplesForStable: 10,
  /** Per-anchor: minimum reliable samples for Stable */
  minSamplesPerAnchorStable: 5,
  /** Per-anchor: max LAB variance for Stable */
  maxVarianceForStable: 6,
  /** Per-anchor: max fraction of user corrections in recent window for Stable */
  maxCorrectionRateForStable: 0.2,
  /** Samples to consider for recent correction rate */
  recentCorrectionWindow: 10,
  /** False-high corrections in profile triggering needs_review */
  maxFalseHighForReview: 3,
  /** High-variance active anchors triggering needs_review */
  maxHighVarianceForReview: 2,
  /** Min user corrections in window to evaluate regression */
  minCorrectionsForRegression: 2,
  /** Correction rate that triggers weight reduction */
  regressionCorrectionRate: 0.4,
  /** Learned weight multiplier after regression detected */
  regressionWeightMultiplier: 0.5,
  /** Consecutive regression events before disabling anchor */
  regressionDisableAfter: 2,
  /** Recent window for per-anchor regression check */
  regressionWindow: 8,
  /** Max activity log entries retained */
  maxActivityLogEntries: 50,
} as const;
