import { matchPadColorFull, shouldUseNormalization } from './colorMatcher';
import {
  captureFrameToImageData,
  computeGuideRect,
  releaseCanvas,
  sampleNeutralReference,
  samplePadRegion,
} from './frameSampler';
import {
  calibratePadSample,
  createSessionCalibration,
  updateSessionReference,
  type SessionCalibrationState,
} from './sessionCalibration';
import {
  computeAlignmentScore,
  computeFocusScore,
  computeLightingScore,
  computeStabilityScore,
} from './qualityAnalyzer';
import { meanLuminance } from './colorScience';
import type { ScanProcessResult, ScanTargetConfig } from './types';
import { getCloroxScanTarget } from './cloroxCalibration';

/**
 * Process one temporary video frame: sample pads, match colors, discard image data.
 * No frames, blobs, or base64 are stored.
 */
export function processScanFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  stripType: 'six_way' | 'salt',
  sessionCal: SessionCalibrationState,
  previousLums: number[]
): { result: ScanProcessResult; updatedCalibration: SessionCalibrationState } | null {
  const imageData = captureFrameToImageData(video, canvas);
  if (!imageData) return null;

  try {
    const config = getCloroxScanTarget(stripType);
    const guide = computeGuideRect(imageData.width, imageData.height, config.aspectRatio);

    const focusScore = computeFocusScore(imageData, guide.x, guide.y, guide.w, guide.h);
    const lightingScore = computeLightingScore(imageData);
    const alignmentScore = computeAlignmentScore(imageData, guide.x, guide.y, guide.w, guide.h);
    const currentLum = meanLuminance(imageData.data);
    const stabilityScore = computeStabilityScore(currentLum, previousLums);

    const quality = { focusScore, lightingScore, alignmentScore, stabilityScore };

    let calState = sessionCal;
    const neutralSample = sampleNeutralReference(
      imageData,
      guide.x,
      guide.y,
      guide.w,
      guide.h,
      config.neutralRoi
    );
    calState = updateSessionReference(calState, neutralSample);

    const padMatches = config.padRois.map((roi) => {
      const raw = samplePadRegion(imageData, guide.x, guide.y, guide.w, guide.h, roi);
      const useNorm = shouldUseNormalization(roi.padId);
      const { rgb, calibrationConfidence } = useNorm
        ? calibratePadSample(calState, raw)
        : { rgb: raw, calibrationConfidence: calState.confidence || 0.5 };
      return matchPadColorFull(roi.padId, rgb, calibrationConfidence);
    });

    const calibrationConfidence = calState.confidence;

    return {
      result: {
        padMatches,
        quality,
        calibrationConfidence,
        calibrationApplied: calState.referenceRgb !== null,
        timestamp: Date.now(),
      },
      updatedCalibration: calState,
    };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Analyze live frame quality without full pad matching (lighter loop) */
export function analyzeLiveQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: ScanTargetConfig,
  previousLums: number[]
): { quality: ScanProcessResult['quality']; lum: number } | null {
  const imageData = captureFrameToImageData(video, canvas);
  if (!imageData) return null;

  try {
    const guide = computeGuideRect(imageData.width, imageData.height, config.aspectRatio);
    const lum = meanLuminance(imageData.data);
    return {
      quality: {
        focusScore: computeFocusScore(imageData, guide.x, guide.y, guide.w, guide.h),
        lightingScore: computeLightingScore(imageData),
        alignmentScore: computeAlignmentScore(imageData, guide.x, guide.y, guide.w, guide.h),
        stabilityScore: computeStabilityScore(lum, previousLums),
      },
      lum,
    };
  } finally {
    releaseCanvas(canvas);
  }
}

export function createScanSessionCalibration(): SessionCalibrationState {
  return createSessionCalibration();
}

export function getScanTargetConfig(stripType: 'six_way' | 'salt'): ScanTargetConfig {
  return getCloroxScanTarget(stripType);
}
