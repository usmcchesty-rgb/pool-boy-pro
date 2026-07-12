import type { StripCaptureQuality } from '../../models/types';
import { meanLuminance } from './colorScience';
import type { QualityAssessment, QualityStatus } from './types';

export interface QualityThresholds {
  minFocus: number;
  minLighting: number;
  minAlignment: number;
  minStability: number;
  /** Below these values the frame is genuinely unusable */
  blockLighting: number;
  blockFocus: number;
  blockAlignment: number;
  usableAlignment: number;
  usableFocus: number;
  usableLighting: number;
}

/** Stricter checks when relaxed mode is off */
export const STRICT_THRESHOLDS: QualityThresholds = {
  minFocus: 0.28,
  minLighting: 0.35,
  minAlignment: 0.32,
  minStability: 0.55,
  blockLighting: 0.1,
  blockFocus: 0.06,
  blockAlignment: 0.08,
  usableAlignment: 0.22,
  usableFocus: 0.2,
  usableLighting: 0.28,
};

/** Recommended — favors usability; every scan is manually verified */
export const RELAXED_THRESHOLDS: QualityThresholds = {
  minFocus: 0.12,
  minLighting: 0.18,
  minAlignment: 0.15,
  minStability: 0.3,
  blockLighting: 0.08,
  blockFocus: 0.05,
  blockAlignment: 0.06,
  usableAlignment: 0.12,
  usableFocus: 0.1,
  usableLighting: 0.15,
};

export function getQualityThresholds(relaxed = true): QualityThresholds {
  return relaxed ? RELAXED_THRESHOLDS : STRICT_THRESHOLDS;
}

/** Laplacian variance on grayscale guide region — proxy for focus/sharpness */
export function computeFocusScore(imageData: ImageData, gx: number, gy: number, gw: number, gh: number): number {
  const { data, width } = imageData;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.floor(gx + gw);
  const y1 = Math.floor(gy + gh);

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = y0 + 1; y < y1 - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = (y * width + x) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const iu = ((y - 1) * width + x) * 4;
      const id = ((y + 1) * width + x) * 4;
      const il = (y * width + (x - 1)) * 4;
      const ir = (y * width + (x + 1)) * 4;
      const lap =
        -4 * gray +
        0.299 * data[iu] + 0.587 * data[iu + 1] + 0.114 * data[iu + 2] +
        0.299 * data[id] + 0.587 * data[id + 1] + 0.114 * data[id + 2] +
        0.299 * data[il] + 0.587 * data[il + 1] + 0.114 * data[il + 2] +
        0.299 * data[ir] + 0.587 * data[ir + 1] + 0.114 * data[ir + 2];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  // Softer normalization — indoor / slight blur still scores reasonably
  return Math.min(1, variance / 320);
}

/** Lighting score from mean luminance — penalize too dark or clipped */
export function computeLightingScore(imageData: ImageData): number {
  const lum = meanLuminance(imageData.data);
  if (lum < 0.1) return lum / 0.1 * 0.35;
  if (lum > 0.9) return Math.max(0, 1 - (lum - 0.9) * 5);
  if (lum >= 0.18 && lum <= 0.82) return 1;
  if (lum < 0.18) return 0.45 + (lum - 0.1) / 0.08 * 0.55;
  return 1 - (lum - 0.82) / 0.08 * 0.35;
}

/** Color variance in guide — proxy for strip alignment */
export function computeAlignmentScore(
  imageData: ImageData,
  gx: number,
  gy: number,
  gw: number,
  gh: number
): number {
  const { data, width } = imageData;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.floor(gx + gw);
  const y1 = Math.floor(gy + gh);

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const samples: number[] = [];

  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue;
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      samples.push(lum);
      count++;
    }
  }

  if (count < 10) return 0;

  const rMean = rSum / count;
  const gMean = gSum / count;
  const bMean = bSum / count;
  const colorSpread = Math.max(
    Math.abs(rMean - gMean),
    Math.abs(gMean - bMean),
    Math.abs(rMean - bMean)
  );

  let lumVar = 0;
  const lumMean = samples.reduce((a, b) => a + b, 0) / samples.length;
  for (const l of samples) lumVar += (l - lumMean) ** 2;
  lumVar /= samples.length;

  const spreadScore = Math.min(1, colorSpread / 32);
  const varScore = Math.min(1, lumVar / 600);
  return spreadScore * 0.5 + varScore * 0.5;
}

/** Frame-to-frame stability from mean luminance delta */
export function computeStabilityScore(currentLum: number, previousLums: number[]): number {
  if (previousLums.length === 0) return 0.65;
  const recent = previousLums.slice(-8);
  const avgDelta =
    recent.reduce((sum, prev) => sum + Math.abs(currentLum - prev), 0) / recent.length;
  if (avgDelta < 0.006) return 1;
  if (avgDelta < 0.018) return 0.88;
  if (avgDelta < 0.035) return 0.72;
  if (avgDelta < 0.07) return 0.52;
  if (avgDelta < 0.12) return 0.35;
  return 0.18;
}

export interface AssessQualityOptions {
  /** Use relaxed thresholds (recommended for real-world phone scanning) */
  relaxQuality?: boolean;
}

function isBlockingQuality(scores: StripCaptureQuality, t: QualityThresholds): boolean {
  return (
    scores.lightingScore < t.blockLighting ||
    scores.focusScore < t.blockFocus ||
    scores.alignmentScore < t.blockAlignment
  );
}

function isStripInsideGuide(scores: StripCaptureQuality, t: QualityThresholds): boolean {
  return scores.alignmentScore >= t.minAlignment;
}

export function assessQuality(
  scores: StripCaptureQuality,
  stripDetected = false,
  options: AssessQualityOptions = {}
): QualityAssessment {
  const relaxed = options.relaxQuality !== false;
  const t = getQualityThresholds(relaxed);
  const blocking = isBlockingQuality(scores, t);

  const hasUsableFrame =
    !blocking &&
    (stripDetected ||
      scores.alignmentScore >= t.usableAlignment ||
      (scores.focusScore >= t.usableFocus && scores.lightingScore >= t.usableLighting));

  const ready = (() => {
    if (blocking || !hasUsableFrame) return false;

    if (stripDetected) {
      return (
        scores.stabilityScore >= t.minStability &&
        scores.lightingScore >= t.blockLighting &&
        scores.focusScore >= t.blockFocus
      );
    }

    return (
      isStripInsideGuide(scores, t) &&
      scores.lightingScore >= t.minLighting &&
      scores.focusScore >= t.minFocus &&
      scores.stabilityScore >= t.minStability
    );
  })();

  let status: QualityStatus;
  let message: string;

  if (ready) {
    status = 'ready';
    message = 'Ready';
  } else if (blocking && scores.lightingScore < t.blockLighting) {
    status = 'lighting';
    message = 'More light needed';
  } else if (!stripDetected && scores.alignmentScore < t.usableAlignment) {
    status = 'searching';
    message = 'Looking for strip';
  } else if (!stripDetected && scores.alignmentScore < t.minAlignment) {
    status = 'closer';
    message = 'Move closer';
  } else if (stripDetected && scores.stabilityScore < t.minStability) {
    status = 'steady';
    message = 'Hold steady';
  } else if (stripDetected || scores.lightingScore >= t.minLighting) {
    status = 'steady';
    message = relaxed ? 'Looking good' : 'Hold steady';
  } else if (scores.lightingScore >= t.usableLighting) {
    status = 'steady';
    message = 'Lighting OK';
  } else {
    status = 'align';
    message = relaxed ? 'Looking good' : 'Center strip in guide';
  }

  return { scores, status, message, ready, hasUsableFrame, stripDetected };
}

export function getDefaultThresholds(relaxed = true) {
  const t = getQualityThresholds(relaxed);
  return { ...t, stableFrameCount: 8 };
}

/** @deprecated Use getQualityThresholds */
export const THRESHOLDS = STRICT_THRESHOLDS;
