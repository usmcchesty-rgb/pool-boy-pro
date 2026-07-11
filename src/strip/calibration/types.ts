import type { Rgb, Lab } from '../scanner/colorScience';

/** Supported calibration JSON schema version */
export const CALIBRATION_SCHEMA_VERSION = 1;

export type CalibrationReliability = 'approximate' | 'measured' | 'validated';

export interface CalibrationLightingProfile {
  label?: string;
  estimatedLux?: number;
  notes?: string;
}

/** One chart-value anchor derived from calibration samples */
export interface CalibrationAnchorEntry {
  value: number;
  referenceRgb: Rgb;
  referenceLab: Lab;
  sampleCount: number;
  source: string;
  reliability: CalibrationReliability;
  lightingProfile?: CalibrationLightingProfile;
  deviceNotes?: string;
}

export interface CalibrationPadData {
  padId: string;
  anchors: CalibrationAnchorEntry[];
}

/** Developer-exported calibration dataset for a strip brand */
export interface StripCalibrationData {
  version: number;
  brandId: string;
  createdAt: string;
  calibrationVersion: string;
  sourceDescription: string;
  pads: CalibrationPadData[];
}

/** Single accepted/rejected color sample during developer calibration */
export interface CalibrationSample {
  id: string;
  padId: string;
  chartValue: number;
  rawRgb: Rgb;
  normalizedRgb: Rgb;
  lab: Lab;
  accepted: boolean;
  capturedAt: number;
  lightingNotes?: string;
}

/** Aggregated statistics from multiple calibration samples */
export interface CalibrationSampleStats {
  sampleCount: number;
  averageRgb: Rgb;
  medianRgb: Rgb;
  averageLab: Lab;
  varianceRgb: [number, number, number];
  spreadLab: number;
}

export type AnchorSourceType =
  | 'builtin_approximate'
  | 'developer_calibrated'
  | 'adaptive_learned'
  | 'blended_baseline_learned'
  | 'blended_calibrated_learned';

/** Runtime indicator of which anchor set the scanner is using */
export interface ActiveAnchorInfo {
  source: AnchorSourceType | string;
  calibrationVersion?: string;
  label: string;
  baselineWeight?: number;
  learnedWeight?: number;
  learnedSampleCount?: number;
}
