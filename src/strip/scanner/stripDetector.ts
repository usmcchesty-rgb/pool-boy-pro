import type { PadRoi } from './types';

export interface StripBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  detected: boolean;
  confidence: number;
}

const INNER_PAD_TRIM = 0.15;

/**
 * Detect test strip within the guide region using color variance heuristics.
 * Falls back to the full guide when confidence is low.
 */
export function detectStripInGuide(
  imageData: ImageData,
  guideX: number,
  guideY: number,
  guideW: number,
  guideH: number
): StripBoundingBox {
  const { data, width } = imageData;
  const x0 = Math.max(0, Math.floor(guideX));
  const y0 = Math.max(0, Math.floor(guideY));
  const x1 = Math.min(imageData.width, Math.floor(guideX + guideW));
  const y1 = Math.min(imageData.height, Math.floor(guideY + guideH));

  const rowVariance: number[] = [];
  const colVariance: number[] = new Array(x1 - x0).fill(0);
  const colCounts: number[] = new Array(x1 - x0).fill(0);

  for (let y = y0; y < y1; y += 2) {
    const lums: number[] = [];
    const colors: number[] = [];
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const spread = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      lums.push(lum);
      colors.push(spread);
      const cx = x - x0;
      colVariance[cx] += spread;
      colCounts[cx] += 1;
    }
    if (lums.length < 3) {
      rowVariance.push(0);
      continue;
    }
    const mean = lums.reduce((a, b) => a + b, 0) / lums.length;
    const colorMean = colors.reduce((a, b) => a + b, 0) / colors.length;
    rowVariance.push(
      lums.reduce((s, l) => s + (l - mean) ** 2, 0) / lums.length + colorMean * 0.5
    );
  }

  if (rowVariance.length < 5) {
    return fallbackBox(guideX, guideY, guideW, guideH, 0.3);
  }

  const rowThreshold = percentile(rowVariance, 0.45);
  let topRow = 0;
  let bottomRow = rowVariance.length - 1;
  for (let i = 0; i < rowVariance.length; i++) {
    if (rowVariance[i] >= rowThreshold) {
      topRow = i;
      break;
    }
  }
  for (let i = rowVariance.length - 1; i >= 0; i--) {
    if (rowVariance[i] >= rowThreshold) {
      bottomRow = i;
      break;
    }
  }

  const colScores = colVariance.map((v, i) => (colCounts[i] ? v / colCounts[i] : 0));
  const colThreshold = percentile(colScores, 0.5);
  let leftCol = 0;
  let rightCol = colScores.length - 1;
  for (let i = 0; i < colScores.length; i++) {
    if (colScores[i] >= colThreshold) {
      leftCol = i;
      break;
    }
  }
  for (let i = colScores.length - 1; i >= 0; i--) {
    if (colScores[i] >= colThreshold) {
      rightCol = i;
      break;
    }
  }

  const stripH = ((bottomRow - topRow + 1) / rowVariance.length) * guideH;
  const stripW = ((rightCol - leftCol + 1) / Math.max(1, colScores.length)) * guideW;

  if (stripH < guideH * 0.35 || stripW < guideW * 0.25) {
    return fallbackBox(guideX, guideY, guideW, guideH, 0.35);
  }

  const padY = 0.08;
  const padX = 0.06;
  const x = guideX + leftCol * 2 + guideW * padX * 0.5;
  const y = guideY + topRow * 2 + guideH * padY * 0.5;
  const w = Math.min(guideW * (1 - padX), stripW * (1 - padX));
  const h = Math.min(guideH * (1 - padY), stripH * (1 - padY));

  const confidence = Math.min(1, (stripH / guideH) * (stripW / guideW) * 2);

  return {
    x,
    y,
    w: Math.max(w, guideW * 0.5),
    h: Math.max(h, guideH * 0.5),
    rotation: 0,
    detected: confidence >= 0.4,
    confidence,
  };
}

function fallbackBox(gx: number, gy: number, gw: number, gh: number, conf: number): StripBoundingBox {
  const insetX = gw * 0.08;
  const insetY = gh * 0.05;
  return {
    x: gx + insetX,
    y: gy + insetY,
    w: gw - insetX * 2,
    h: gh - insetY * 2,
    rotation: 0,
    detected: false,
    confidence: conf,
  };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

/** Map normalized pad ROIs onto detected strip bounding box with inner trim */
export function padRoisOnStrip(_strip: StripBoundingBox, padRois: PadRoi[]): PadRoi[] {
  return padRois.map((roi) => ({
    padId: roi.padId,
    x: roi.x,
    y: roi.y,
    w: roi.w * (1 - INNER_PAD_TRIM * 2),
    h: roi.h * (1 - INNER_PAD_TRIM * 2),
  }));
}

/** Absolute pixel pad regions for verification overlay (no image stored) */
export function absolutePadRegions(
  strip: StripBoundingBox,
  padRois: PadRoi[]
): Array<PadRoi & { absX: number; absY: number; absW: number; absH: number }> {
  const inner = padRoisOnStrip(strip, padRois);
  return inner.map((roi) => ({
    ...roi,
    absX: strip.x + roi.x * strip.w,
    absY: strip.y + roi.y * strip.h,
    absW: roi.w * strip.w,
    absH: roi.h * strip.h,
  }));
}
