import type { StripCaptureQuality } from '../../models/types';
import type { Rgb, Lab } from '../scanner/colorScience';

/** Single user-verified pad color sample stored locally */
export interface VerifiedPadSample {
  id: string;
  brandId: string;
  padId: string;
  confirmedValue: number;
  rawRgb: Rgb;
  normalizedRgb: Rgb;
  lab: Lab;
  deltaEToAnchor: number;
  quality: StripCaptureQuality;
  lightingEstimate: number;
  calibrationSource: string;
  timestamp: number;
  reliabilityWeight: number;
  deviceCalibrationVersion: string;
  timingExpired: boolean;
  userCorrected: boolean;
  /** Scanner proposed value at capture time */
  proposedValue?: number;
  scanSessionId: string;
}

/** Computed learned anchor state for one pad/chart value */
export interface LearnedAnchorState {
  padId: string;
  value: number;
  learnedRgb: Rgb | null;
  learnedLab: Lab | null;
  sampleCount: number;
  reliableSampleCount: number;
  varianceLab: number;
  baselineWeight: number;
  learnedWeight: number;
  highVariance: boolean;
  active: boolean;
}

/** Device-local adaptive calibration profile */
export interface AdaptiveLearningProfile {
  version: number;
  brandId: string;
  enabled: boolean;
  calibrationVersion: string;
  lastUpdated: string;
  samples: VerifiedPadSample[];
  rejectedOutlierCount: number;
  falseHighConfidenceCount: number;
  /** Cumulative rejected samples from learning sessions */
  totalRejectedSamples: number;
  /** Recent accepted/rejected learning activity */
  activityLog: LearningActivityEntry[];
  /** Rollback history per anchor */
  rollbackRecords: AnchorRollbackRecord[];
  /** Active safety overrides (reduced/disabled learned weights) */
  safetyOverrides: AnchorSafetyOverride[];
}

export type LearningHealthStatus = 'not_enough_data' | 'learning' | 'stable' | 'needs_review';

export type PadLearningStatus = 'baseline_only' | 'learning' | 'stable' | 'unreliable';

export interface LearningActivityEntry {
  id: string;
  padId: string;
  confirmedValue?: number;
  accepted: boolean;
  rejectionReason?: string;
  qualityScore: number;
  timestamp: number;
  scanSessionId?: string;
}

export interface AnchorRollbackRecord {
  padId: string;
  value: number;
  reason: string;
  previousLearnedWeight: number;
  currentLearnedWeight: number;
  disabled: boolean;
  recordedAt: string;
  regressionCount: number;
}

export interface AnchorSafetyOverride {
  padId: string;
  value: number;
  learnedWeightMultiplier: number;
  disabled: boolean;
  rollbackReason?: string;
  regressionCount: number;
  updatedAt: string;
}

export interface LearningHealthSummary {
  totalAcceptedSamples: number;
  totalRejectedSamples: number;
  activeLearnedAnchors: number;
  baselineOnlyAnchors: number;
  highVarianceAnchors: number;
  falseHighConfidenceCorrections: number;
  lastLearningUpdate: string;
  overallStatus: LearningHealthStatus;
  rollbackCount: number;
}

export interface PadLearningProgress {
  padId: string;
  label: string;
  sampleCount: number;
  activeLearnedValues: number;
  totalChartValues: number;
  baselineWeight: number;
  learnedWeight: number;
  varianceLab: number;
  recentCorrectionRate: number;
  topMistake?: { proposed: number; confirmed: number; count: number };
  status: PadLearningStatus;
  disabledAnchors: number;
}

export interface AdaptiveProfileSummary {
  enabled: boolean;
  totalSamples: number;
  calibrationVersion: string;
  lastUpdated: string;
  activeSource: AdaptiveAnchorSourceType;
  activeSourceLabel: string;
  baselineWeight: number;
  learnedWeight: number;
  rejectedOutlierCount: number;
  falseHighConfidenceCount: number;
  samplesPerPadValue: Record<string, Record<number, number>>;
  highVarianceAnchors: Array<{ padId: string; value: number; varianceLab: number }>;
  learnedAnchorCount: number;
}

export type AdaptiveAnchorSourceType =
  | 'builtin_approximate'
  | 'developer_calibrated'
  | 'adaptive_learned'
  | 'blended_baseline_learned'
  | 'blended_calibrated_learned';
