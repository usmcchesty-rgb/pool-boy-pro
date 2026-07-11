import { whiteBalanceFromReference, type Rgb } from './colorScience';

/** Per-scanner-session calibration state (not persisted) */
export interface SessionCalibrationState {
  referenceRgb: Rgb | null;
  confidence: number;
  sampleCount: number;
}

export function createSessionCalibration(): SessionCalibrationState {
  return { referenceRgb: null, confidence: 0, sampleCount: 0 };
}

/** Update session reference from a neutral patch sample */
export function updateSessionReference(
  state: SessionCalibrationState,
  referenceSample: Rgb
): SessionCalibrationState {
  if (!state.referenceRgb) {
    return {
      referenceRgb: referenceSample,
      confidence: 0.7,
      sampleCount: 1,
    };
  }
  const blend = 0.3;
  const ref: Rgb = [
    Math.round(state.referenceRgb[0] * (1 - blend) + referenceSample[0] * blend),
    Math.round(state.referenceRgb[1] * (1 - blend) + referenceSample[1] * blend),
    Math.round(state.referenceRgb[2] * (1 - blend) + referenceSample[2] * blend),
  ];
  return {
    referenceRgb: ref,
    confidence: Math.min(0.95, state.confidence + 0.05),
    sampleCount: state.sampleCount + 1,
  };
}

/** Apply session white-balance to a pad sample */
export function calibratePadSample(
  state: SessionCalibrationState,
  rgb: Rgb
): { rgb: Rgb; calibrationConfidence: number } {
  if (!state.referenceRgb) {
    return { rgb, calibrationConfidence: 0.5 };
  }
  const { normalized, confidence } = whiteBalanceFromReference(rgb, state.referenceRgb);
  return {
    rgb: normalized,
    calibrationConfidence: Math.min(state.confidence, confidence),
  };
}
