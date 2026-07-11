import type { StripCaptureMethod } from '../models/types';
import type { StripAccuracyLevel } from '../models/types';

/** Manual chart matching caps overall confidence */
export const MANUAL_ENTRY_CONFIDENCE_CAP = 65;

/** Camera capture baseline before quality weighting */
export const CAMERA_ENTRY_CONFIDENCE_BASE = 75;

export function confidenceToAccuracyLevel(score: number): StripAccuracyLevel {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function getAccuracyLabel(level: StripAccuracyLevel): string {
  switch (level) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
  }
}

/** Overall strip test confidence for a capture method */
export function getOverallStripConfidence(method: StripCaptureMethod): number {
  if (method === 'manual') return MANUAL_ENTRY_CONFIDENCE_CAP;
  if (method === 'camera_verified') return CAMERA_ENTRY_CONFIDENCE_BASE;
  return CAMERA_ENTRY_CONFIDENCE_BASE;
}

export function getOverallStripAccuracy(method: StripCaptureMethod): StripAccuracyLevel {
  return confidenceToAccuracyLevel(getOverallStripConfidence(method));
}

/** Per-pad confidence fallback by capture method */
export function getPadConfidence(method: StripCaptureMethod): number {
  return getOverallStripConfidence(method);
}
