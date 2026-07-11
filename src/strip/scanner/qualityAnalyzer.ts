import type { StripCaptureQuality } from '../../models/types';
import { meanLuminance } from './colorScience';
import type { QualityAssessment, QualityStatus } from './types';

const THRESHOLDS = {
  minFocus: 0.35,
  minLighting: 0.45,
  minAlignment: 0.4,
  minStability: 0.65,
};

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
  return Math.min(1, variance / 500);
}

/** Lighting score from mean luminance — penalize too dark or clipped */
export function computeLightingScore(imageData: ImageData): number {
  const lum = meanLuminance(imageData.data);
  if (lum < 0.15) return lum / 0.15 * 0.4;
  if (lum > 0.85) return Math.max(0, 1 - (lum - 0.85) * 4);
  if (lum >= 0.25 && lum <= 0.75) return 1;
  if (lum < 0.25) return 0.4 + (lum - 0.15) / 0.1 * 0.6;
  return 1 - (lum - 0.75) / 0.1 * 0.4;
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

  const spreadScore = Math.min(1, colorSpread / 40);
  const varScore = Math.min(1, lumVar / 800);
  return spreadScore * 0.5 + varScore * 0.5;
}

/** Frame-to-frame stability from mean luminance delta */
export function computeStabilityScore(currentLum: number, previousLums: number[]): number {
  if (previousLums.length === 0) return 0.5;
  const recent = previousLums.slice(-8);
  const avgDelta =
    recent.reduce((sum, prev) => sum + Math.abs(currentLum - prev), 0) / recent.length;
  if (avgDelta < 0.005) return 1;
  if (avgDelta < 0.015) return 0.85;
  if (avgDelta < 0.03) return 0.65;
  if (avgDelta < 0.06) return 0.4;
  return 0.2;
}

export function assessQuality(scores: StripCaptureQuality): QualityAssessment {
  const ready =
    scores.alignmentScore >= THRESHOLDS.minAlignment &&
    scores.lightingScore >= THRESHOLDS.minLighting &&
    scores.focusScore >= THRESHOLDS.minFocus &&
    scores.stabilityScore >= THRESHOLDS.minStability;

  let status: QualityStatus;
  let message: string;

  if (ready) {
    status = 'ready';
    message = 'Ready — Hold Still';
  } else if (scores.alignmentScore < THRESHOLDS.minAlignment) {
    status = 'align';
    message = 'Move strip into guide';
  } else if (scores.lightingScore < THRESHOLDS.minLighting) {
    status = 'lighting';
    message = 'More light needed';
  } else {
    status = 'steady';
    message = 'Hold steady';
  }

  return { scores, status, message, ready };
}

export function getDefaultThresholds() {
  return { ...THRESHOLDS, stableFrameCount: 8 };
}

export { THRESHOLDS };
