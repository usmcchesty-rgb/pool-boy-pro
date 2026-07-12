import { confidenceToLevel } from './colorMatcher';
import type { StripBoundingBox } from './stripDetector';
import { padRoisOnStrip } from './stripDetector';
import type { GeometrySource, PadMatchResult, PadRoi, ScanTargetConfig } from './types';

/** Confidence at or above which whole-strip detection is considered reliable */
export const STRIP_DETECTION_RELIABLE_THRESHOLD = 0.4;

export interface GuideRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaptureGeometry {
  stripBox: StripBoundingBox;
  originalStripBox: StripBoundingBox;
  guideRect: GuideRect;
  geometrySource: GeometrySource;
  geometryConfidence: number;
  requiresCorrection: boolean;
  frameWidth: number;
  frameHeight: number;
}

/** User-facing pad labels for overlay and verification */
export const PAD_DISPLAY_LABELS: Record<string, string> = {
  freeChlorine: 'Free Chlorine',
  totalChlorine: 'Total Chlorine',
  ph: 'pH',
  totalAlkalinity: 'Total Alkalinity',
  totalHardness: 'Hardness',
  cyanuricAcid: 'CYA',
  salt: 'Salt',
};

export function classifyGeometrySource(strip: StripBoundingBox): GeometrySource {
  if (!strip.detected) return 'guide_fallback';
  return 'automatic_detection';
}

export function requiresStripCorrection(strip: StripBoundingBox): boolean {
  return !strip.detected || strip.confidence < STRIP_DETECTION_RELIABLE_THRESHOLD;
}

export function buildCaptureGeometry(
  strip: StripBoundingBox,
  guideRect: GuideRect,
  frameWidth: number,
  frameHeight: number
): CaptureGeometry {
  const geometrySource = classifyGeometrySource(strip);
  return {
    stripBox: { ...strip },
    originalStripBox: { ...strip },
    guideRect: { ...guideRect },
    geometrySource,
    geometryConfidence: strip.confidence,
    requiresCorrection: requiresStripCorrection(strip),
    frameWidth,
    frameHeight,
  };
}

/** Recalculate inner-trimmed pad ROIs from a strip bounding box */
export function computePadRoisFromStrip(
  strip: StripBoundingBox,
  config: ScanTargetConfig
): PadRoi[] {
  return padRoisOnStrip(strip, config.padRois);
}

/** Absolute pixel pad sample regions for preview overlay */
export function absolutePadSampleRegions(
  strip: StripBoundingBox,
  config: ScanTargetConfig
): Array<PadRoi & { absX: number; absY: number; absW: number; absH: number }> {
  const inner = computePadRoisFromStrip(strip, config);
  return inner.map((roi) => ({
    ...roi,
    absX: strip.x + roi.x * strip.w,
    absY: strip.y + roi.y * strip.h,
    absW: roi.w * strip.w,
    absH: roi.h * strip.h,
  }));
}

const MIN_STRIP_FRACTION = 0.25;

/** Clamp and validate a user-adjusted strip box within the frame */
export function normalizeStripBox(
  box: StripBoundingBox,
  frameWidth: number,
  frameHeight: number,
  guideRect: GuideRect
): StripBoundingBox {
  const minW = guideRect.w * MIN_STRIP_FRACTION;
  const minH = guideRect.h * MIN_STRIP_FRACTION;

  let { x, y, w, h, rotation } = box;
  w = Math.max(minW, Math.min(w, frameWidth));
  h = Math.max(minH, Math.min(h, frameHeight));
  x = Math.max(0, Math.min(x, frameWidth - w));
  y = Math.max(0, Math.min(y, frameHeight - h));

  return {
    x,
    y,
    w,
    h,
    rotation: rotation ?? 0,
    detected: box.detected,
    confidence: box.confidence,
  };
}

export function geometryPenalty(confidence: number): number {
  if (confidence >= STRIP_DETECTION_RELIABLE_THRESHOLD) return 12;
  if (confidence >= 0.35) return 22;
  return 32;
}

export function shouldForceLowGeometry(
  geometry: CaptureGeometry,
  geometrySource: GeometrySource,
  forceContinueAnyway: boolean
): boolean {
  return (
    forceContinueAnyway ||
    geometry.requiresCorrection ||
    geometrySource === 'guide_fallback'
  );
}

/** Apply geometry uncertainty penalty and metadata to pad matches */
export function applyGeometryConfidenceToMatches(
  matches: PadMatchResult[],
  geometrySource: GeometrySource,
  geometryConfidence: number,
  forceLowGeometry: boolean
): PadMatchResult[] {
  const penalty =
    forceLowGeometry || geometrySource === 'guide_fallback'
      ? geometryPenalty(geometryConfidence)
      : geometrySource === 'adjusted_strip_box'
        ? Math.round(geometryPenalty(geometryConfidence) * 0.5)
        : 0;

  const lowGeometry =
    forceLowGeometry ||
    geometrySource === 'guide_fallback' ||
    geometryConfidence < STRIP_DETECTION_RELIABLE_THRESHOLD;

  return matches.map((match) => {
    const confidence = Math.max(5, match.confidence - penalty);
    return {
      ...match,
      confidence,
      confidenceLevel: confidenceToLevel(confidence),
      geometrySource,
      lowGeometryConfidence: lowGeometry,
    };
  });
}

export function geometrySourceLabel(source: GeometrySource | undefined): string {
  switch (source) {
    case 'automatic_detection':
      return 'Automatic detection';
    case 'adjusted_strip_box':
      return 'Adjusted strip box';
    case 'guide_fallback':
      return 'Guide fallback';
    default:
      return 'Unknown';
  }
}

export function updateGeometryForSource(
  geometry: CaptureGeometry,
  stripBox: StripBoundingBox,
  geometrySource: GeometrySource
): CaptureGeometry {
  return {
    ...geometry,
    stripBox: { ...stripBox },
    geometrySource,
    geometryConfidence: stripBox.confidence,
    requiresCorrection:
      geometrySource === 'guide_fallback' ||
      requiresStripCorrection(stripBox),
  };
}
