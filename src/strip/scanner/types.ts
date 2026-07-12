import type { StripAccuracyLevel, StripCaptureQuality } from '../../models/types';
import type { StripPhysicalType } from '../types';

export type GeometrySource = 'automatic_detection' | 'adjusted_strip_box' | 'guide_fallback';

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
  /** How the strip sampling region was determined */
  geometrySource?: GeometrySource;
  /** True when strip geometry was uncertain — requires explicit confirmation */
  lowGeometryConfidence?: boolean;
}

/** Complete result from processing one temporary frame */
export interface ScanProcessResult {
  padMatches: PadMatchResult[];
  quality: StripCaptureQuality;
  calibrationConfidence: number;
  calibrationApplied: boolean;
  timestamp: number;
  stripDetected?: boolean;
  /** Normalized pad regions used for sampling (for verification overlay) */
  sampledPadRegions?: PadRoi[];
  /** Strip geometry metadata when available */
  geometryConfidence?: number;
  geometrySource?: GeometrySource;
  requiresCorrection?: boolean;
}

/** Live quality status for UI messaging */
export type QualityStatus =
  | 'searching'
  | 'closer'
  | 'align'
  | 'lighting'
  | 'steady'
  | 'ready';

export interface QualityAssessment {
  scores: StripCaptureQuality;
  status: QualityStatus;
  message: string;
  ready: boolean;
  /** True when a frame is usable for manual capture */
  hasUsableFrame: boolean;
  stripDetected: boolean;
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
