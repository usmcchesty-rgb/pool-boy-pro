import { matchPadColorFull, shouldUseNormalization } from './colorMatcher';
import { sampleNeutralReference, samplePadRegion } from './frameSampler';
import { getCloroxScanTarget } from './cloroxCalibration';
import {
  calibratePadSample,
  updateSessionReference,
  type SessionCalibrationState,
} from './sessionCalibration';
import {
  applyGeometryConfidenceToMatches,
  buildCaptureGeometry,
  computePadRoisFromStrip,
  normalizeStripBox,
  shouldForceLowGeometry,
  updateGeometryForSource,
  type CaptureGeometry,
} from './stripGeometry';
import type { StripBoundingBox } from './stripDetector';
import type { GeometrySource, ScanProcessResult, ScanTargetConfig } from './types';

export interface TemporaryPreviewSession {
  imageData: ImageData;
  phase: 'six_way' | 'salt';
  geometry: CaptureGeometry;
  config: ScanTargetConfig;
  sessionCal: SessionCalibrationState;
}

let activeSession: TemporaryPreviewSession | null = null;

/** Deep-copy ImageData so the capture canvas can be released */
export function cloneImageData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

export function storePreviewSession(session: TemporaryPreviewSession): void {
  releasePreviewSession();
  activeSession = session;
}

export function getPreviewSession(): TemporaryPreviewSession | null {
  return activeSession;
}

export function hasPreviewSession(): boolean {
  return activeSession !== null;
}

/** Release in-memory preview — no image data retained */
export function releasePreviewSession(): void {
  activeSession = null;
}

export function resetStripBoxToOriginal(): StripBoundingBox | null {
  if (!activeSession) return null;
  const original = { ...activeSession.geometry.originalStripBox };
  activeSession.geometry = updateGeometryForSource(
    activeSession.geometry,
    original,
    activeSession.geometry.geometrySource
  );
  return original;
}

export function updateSessionStripBox(box: StripBoundingBox): void {
  if (!activeSession) return;
  const normalized = normalizeStripBox(
    box,
    activeSession.geometry.frameWidth,
    activeSession.geometry.frameHeight,
    activeSession.geometry.guideRect
  );
  activeSession.geometry = {
    ...activeSession.geometry,
    stripBox: normalized,
  };
}

export function getCurrentStripBox(): StripBoundingBox | null {
  return activeSession?.geometry.stripBox ?? null;
}

export interface ResampleOptions {
  stripBox?: StripBoundingBox;
  geometrySource?: GeometrySource;
  forceContinueAnyway?: boolean;
}

/** Resample pad colors from the temporary frame using the given strip geometry */
export function resamplePadsFromPreview(options: ResampleOptions = {}): ScanProcessResult | null {
  if (!activeSession) return null;

  const { imageData, config, sessionCal } = activeSession;
  const geometrySource = options.geometrySource ?? activeSession.geometry.geometrySource;
  const stripBox = normalizeStripBox(
    options.stripBox ?? activeSession.geometry.stripBox,
    activeSession.geometry.frameWidth,
    activeSession.geometry.frameHeight,
    activeSession.geometry.guideRect
  );

  const padRois = computePadRoisFromStrip(stripBox, config);
  let calState = sessionCal;

  const neutralSample = sampleNeutralReference(
    imageData,
    activeSession.geometry.guideRect.x,
    activeSession.geometry.guideRect.y,
    activeSession.geometry.guideRect.w,
    activeSession.geometry.guideRect.h,
    config.neutralRoi
  );
  calState = updateSessionReference(calState, neutralSample);

  const rawMatches = padRois.map((roi) => {
    const raw = samplePadRegion(imageData, stripBox.x, stripBox.y, stripBox.w, stripBox.h, roi);
    const useNorm = shouldUseNormalization(roi.padId);
    const { rgb, calibrationConfidence } = useNorm
      ? calibratePadSample(calState, raw)
      : { rgb: raw, calibrationConfidence: calState.confidence || 0.5 };
    return matchPadColorFull(roi.padId, rgb, calibrationConfidence);
  });

  const forceLow = shouldForceLowGeometry(
    activeSession.geometry,
    geometrySource,
    options.forceContinueAnyway ?? false
  );

  const padMatches = applyGeometryConfidenceToMatches(
    rawMatches,
    geometrySource,
    stripBox.confidence,
    forceLow
  );

  activeSession.sessionCal = calState;
  activeSession.geometry = updateGeometryForSource(activeSession.geometry, stripBox, geometrySource);

  return {
    padMatches,
    quality: {
      focusScore: 0,
      lightingScore: 0,
      alignmentScore: stripBox.confidence,
      stabilityScore: 1,
    },
    calibrationConfidence: calState.confidence,
    calibrationApplied: calState.referenceRgb !== null,
    timestamp: Date.now(),
    stripDetected: stripBox.detected,
    sampledPadRegions: padRois,
    geometryConfidence: stripBox.confidence,
    geometrySource,
    requiresCorrection: activeSession.geometry.requiresCorrection,
  };
}

export function createPreviewSession(
  imageData: ImageData,
  phase: 'six_way' | 'salt',
  strip: StripBoundingBox,
  guideRect: { x: number; y: number; w: number; h: number },
  sessionCal: SessionCalibrationState
): TemporaryPreviewSession {
  const config = getCloroxScanTarget(phase);
  const geometry = buildCaptureGeometry(
    strip,
    guideRect,
    imageData.width,
    imageData.height
  );
  return {
    imageData: cloneImageData(imageData),
    phase,
    geometry,
    config,
    sessionCal,
  };
}
