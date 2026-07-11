import type { StripAccuracyLevel, StripCaptureQuality } from '../../models/types';
import type { StripPhysicalType } from '../types';

/** Per-pad color match from a single scan */
export interface PadMatchResult {
  padId: string;
  proposedValue: number;
  confidence: number;
  confidenceLevel: StripAccuracyLevel;
  deltaE: number;
  sampledRgb: [number, number, number];
  matchedAnchorRgb: [number, number, number];
  alternateValue?: number;
  alternateConfidence?: number;
  alternateDeltaE?: number;
  ambiguous?: boolean;
  ambiguityReason?: string;
  anchorSource?: string;
}

/** Complete result from processing one temporary frame */
export interface ScanProcessResult {
  padMatches: PadMatchResult[];
  quality: StripCaptureQuality;
  calibrationConfidence: number;
  calibrationApplied: boolean;
  timestamp: number;
}

/** Live quality status for UI messaging */
export type QualityStatus =
  | 'align'
  | 'lighting'
  | 'steady'
  | 'ready';

export interface QualityAssessment {
  scores: StripCaptureQuality;
  status: QualityStatus;
  message: string;
  ready: boolean;
}

/** Normalized region of interest (0–1 relative to guide box) */
export interface PadRoi {
  padId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScanTargetConfig {
  stripType: StripPhysicalType;
  /** Guide box aspect ratio (width / height) */
  aspectRatio: number;
  padRois: PadRoi[];
  /** Neutral reference patch for session calibration */
  neutralRoi: { x: number; y: number; w: number; h: number };
}
