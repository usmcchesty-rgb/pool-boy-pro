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
import { detectStripInGuide, type StripBoundingBox } from './stripDetector';
import {
  applyGeometryConfidenceToMatches,
  buildCaptureGeometry,
  computePadRoisFromStrip,
  type CaptureGeometry,
} from './stripGeometry';
import { cloneImageData, createPreviewSession } from './temporaryPreview';

export interface ScanCapturePackage {
  result: ScanProcessResult;
  imageData: ImageData;
  geometry: CaptureGeometry;
  detectedStripBox: StripBoundingBox;
  updatedCalibration: SessionCalibrationState;
  phase: 'six_way' | 'salt';
}

/**
 * Capture one frame and return full package including in-memory image data for correction.
 * Caller stores imageData via temporaryPreview.storePreviewSession — never persisted.
 */
export function captureScanFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  stripType: 'six_way' | 'salt',
  sessionCal: SessionCalibrationState,
  previousLums: number[]
): ScanCapturePackage | null {
  const imageData = captureFrameToImageData(video, canvas);
  if (!imageData) return null;

  try {
    const config = getCloroxScanTarget(stripType);
    const guide = computeGuideRect(imageData.width, imageData.height, config.aspectRatio);
    const strip = detectStripInGuide(imageData, guide.x, guide.y, guide.w, guide.h);
    const geometry = buildCaptureGeometry(strip, guide, imageData.width, imageData.height);
    const padRois = computePadRoisFromStrip(strip, config);

    const focusScore = computeFocusScore(imageData, strip.x, strip.y, strip.w, strip.h);
    const lightingScore = computeLightingScore(imageData);
    const alignmentScore = computeAlignmentScore(imageData, strip.x, strip.y, strip.w, strip.h);
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

    const rawMatches = padRois.map((roi) => {
      const raw = samplePadRegion(imageData, strip.x, strip.y, strip.w, strip.h, roi);
      const useNorm = shouldUseNormalization(roi.padId);
      const { rgb, calibrationConfidence } = useNorm
        ? calibratePadSample(calState, raw)
        : { rgb: raw, calibrationConfidence: calState.confidence || 0.5 };
      return matchPadColorFull(roi.padId, rgb, calibrationConfidence);
    });

    const padMatches = applyGeometryConfidenceToMatches(
      rawMatches,
      geometry.geometrySource,
      geometry.geometryConfidence,
      geometry.requiresCorrection
    );

    const cloned = cloneImageData(imageData);

    return {
      result: {
        padMatches,
        quality,
        calibrationConfidence: calState.confidence,
        calibrationApplied: calState.referenceRgb !== null,
        timestamp: Date.now(),
        stripDetected: strip.detected,
        sampledPadRegions: padRois,
        geometryConfidence: geometry.geometryConfidence,
        geometrySource: geometry.geometrySource,
        requiresCorrection: geometry.requiresCorrection,
      },
      imageData: cloned,
      geometry,
      detectedStripBox: { ...strip },
      updatedCalibration: calState,
      phase: stripType,
    };
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Process one temporary video frame: detect strip, sample pads, match colors, discard image data.
 * No frames, blobs, or base64 are stored.
 */
export function processScanFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  stripType: 'six_way' | 'salt',
  sessionCal: SessionCalibrationState,
  previousLums: number[]
): { result: ScanProcessResult; updatedCalibration: SessionCalibrationState } | null {
  const pkg = captureScanFrame(video, canvas, stripType, sessionCal, previousLums);
  if (!pkg) return null;
  return { result: pkg.result, updatedCalibration: pkg.updatedCalibration };
}

/** Build a preview session from a capture package (stores cloned image in memory) */
export function previewSessionFromCapture(pkg: ScanCapturePackage) {
  return createPreviewSession(
    pkg.imageData,
    pkg.phase,
    pkg.detectedStripBox,
    pkg.geometry.guideRect,
    pkg.updatedCalibration
  );
}

/** Analyze live frame quality without full pad matching (lighter loop) */
export function analyzeLiveQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: ScanTargetConfig,
  previousLums: number[]
): {
  quality: ScanProcessResult['quality'];
  lum: number;
  stripDetected: boolean;
} | null {
  const imageData = captureFrameToImageData(video, canvas);
  if (!imageData) return null;

  try {
    const guide = computeGuideRect(imageData.width, imageData.height, config.aspectRatio);
    const strip = detectStripInGuide(imageData, guide.x, guide.y, guide.w, guide.h);
    const lum = meanLuminance(imageData.data);
    return {
      quality: {
        focusScore: computeFocusScore(imageData, strip.x, strip.y, strip.w, strip.h),
        lightingScore: computeLightingScore(imageData),
        alignmentScore: computeAlignmentScore(imageData, strip.x, strip.y, strip.w, strip.h),
        stabilityScore: computeStabilityScore(lum, previousLums),
      },
      lum,
      stripDetected: strip.detected || strip.confidence >= 0.35,
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
