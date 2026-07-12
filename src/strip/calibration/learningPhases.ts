import type { LearningHealthStatus } from './adaptiveTypes';
import type { LearnedAnchorState } from './adaptiveTypes';
import type { AdaptiveLearningProfile } from './adaptiveTypes';

export type LearningPhase = 1 | 2 | 3 | 4;

export const LEARNING_PHASE_THRESHOLDS = {
  phase1Max: 10,
  phase2Max: 30,
  phase3Max: 100,
} as const;

export type CalibrationQuality = 'building' | 'fair' | 'good' | 'excellent';

export interface PhaseBlendConfig {
  phase: LearningPhase;
  label: string;
  /** Minimum reliable samples before any learned blending */
  minSamplesForBlend: number;
  /** Learned weight at minSamplesForBlend to minSamplesForStrong range */
  lightBlendWeight: number;
  /** Minimum samples for stronger weighting curve */
  minSamplesForStrong: number;
  /** Maximum learned weight for this phase */
  maxLearnedWeight: number;
}

export const PHASE_BLEND_CONFIG: Record<LearningPhase, PhaseBlendConfig> = {
  1: {
    phase: 1,
    label: 'Quick adaptation',
    minSamplesForBlend: 1,
    lightBlendWeight: 0.28,
    minSamplesForStrong: 3,
    maxLearnedWeight: 0.75,
  },
  2: {
    phase: 2,
    label: 'Active learning',
    minSamplesForBlend: 3,
    lightBlendWeight: 0.15,
    minSamplesForStrong: 5,
    maxLearnedWeight: 0.6,
  },
  3: {
    phase: 3,
    label: 'Refinement',
    minSamplesForBlend: 3,
    lightBlendWeight: 0.1,
    minSamplesForStrong: 5,
    maxLearnedWeight: 0.45,
  },
  4: {
    phase: 4,
    label: 'Maintenance',
    minSamplesForBlend: 3,
    lightBlendWeight: 0.08,
    minSamplesForStrong: 5,
    maxLearnedWeight: 0.25,
  },
};

/** Maskable icons use extra safe-zone padding — same idea for Android blend caps in phase 1 */
export const MASKABLE_PHASE_MAX_CAP = 0.8;

export function getLearningPhase(verifiedScanCount: number): LearningPhase {
  if (verifiedScanCount <= LEARNING_PHASE_THRESHOLDS.phase1Max) return 1;
  if (verifiedScanCount <= LEARNING_PHASE_THRESHOLDS.phase2Max) return 2;
  if (verifiedScanCount <= LEARNING_PHASE_THRESHOLDS.phase3Max) return 3;
  return 4;
}

/** Compute learned blend weight for a pad/value given reliable sample count and global phase */
export function computePhaseLearnedWeight(
  reliableSampleCount: number,
  phase: LearningPhase
): number {
  const config = PHASE_BLEND_CONFIG[phase];
  if (reliableSampleCount < config.minSamplesForBlend) return 0;
  if (reliableSampleCount < config.minSamplesForStrong) return config.lightBlendWeight;

  const extra = reliableSampleCount - config.minSamplesForStrong;
  const t = Math.min(1, extra / 5);
  const weight =
    config.lightBlendWeight + t * (config.maxLearnedWeight - config.lightBlendWeight);
  return Math.min(config.maxLearnedWeight, weight);
}

export function countVerifiedScans(profile: AdaptiveLearningProfile): number {
  if (profile.verifiedScanCount > 0) return profile.verifiedScanCount;
  const sessions = new Set(
    profile.samples.map((s) => s.scanSessionId).filter(Boolean)
  );
  return sessions.size;
}

export function countVerifiedPads(profile: AdaptiveLearningProfile): number {
  return new Set(profile.samples.map((s) => s.padId)).size;
}

export function computeScannerConfidence(params: {
  profile: AdaptiveLearningProfile;
  states: Map<string, LearnedAnchorState>;
  healthStatus: LearningHealthStatus;
  falseHighCount: number;
}): number {
  const { profile, states, healthStatus, falseHighCount } = params;
  const verifiedScans = countVerifiedScans(profile);
  const activeLearned = [...states.values()].filter((s) => s.active);
  const totalAnchors = states.size || 1;

  let score = 35;

  // Scan experience contributes up to 35 points
  score += Math.min(35, verifiedScans * 1.2);

  // Active learned anchors contribute up to 25 points
  score += (activeLearned.length / totalAnchors) * 25;

  // Stable low-variance anchors
  const stableAnchors = activeLearned.filter(
    (s) => !s.highVariance && s.reliableSampleCount >= 5
  );
  score += (stableAnchors.length / totalAnchors) * 15;

  // Phase maturity bonus in later phases
  const phase = getLearningPhase(verifiedScans);
  if (phase >= 3) score += 5;
  if (phase >= 4) score += 5;

  // Penalties
  if (healthStatus === 'needs_review') score -= 18;
  score -= Math.min(12, profile.rejectedOutlierCount * 0.5);
  score -= Math.min(10, falseHighCount * 2);
  score -= activeLearned.filter((s) => s.highVariance).length * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeCalibrationQuality(confidence: number): CalibrationQuality {
  if (confidence >= 88) return 'excellent';
  if (confidence >= 72) return 'good';
  if (confidence >= 50) return 'fair';
  return 'building';
}

export const CALIBRATION_QUALITY_LABELS: Record<CalibrationQuality, string> = {
  building: 'Building',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

export function getUserFriendlyStatus(
  healthStatus: LearningHealthStatus,
  verifiedScans: number,
  paused: boolean
): string {
  if (paused) return 'Paused';
  if (verifiedScans === 0) return 'Not started';
  if (healthStatus === 'needs_review') return 'Needs attention';
  if (healthStatus === 'stable') return 'Ready';
  if (verifiedScans <= LEARNING_PHASE_THRESHOLDS.phase1Max) return 'Learning';
  return 'Learning';
}

export function formatLastImproved(iso: string | null | undefined): string {
  if (!iso) return 'Not yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not yet';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
