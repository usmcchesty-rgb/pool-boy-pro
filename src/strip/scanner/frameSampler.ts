import type { Rgb } from './colorScience';
import type { PadRoi } from './types';

/**
 * Sample a rectangular region using trimmed-average RGB (excludes top/bottom 10% by luminance).
 * Reduces glare and noise from single-pixel sampling.
 */
export function samplePadRegion(
  imageData: ImageData,
  guideX: number,
  guideY: number,
  guideW: number,
  guideH: number,
  roi: PadRoi
): Rgb {
  const x0 = Math.floor(guideX + roi.x * guideW);
  const y0 = Math.floor(guideY + roi.y * guideH);
  const x1 = Math.floor(guideX + (roi.x + roi.w) * guideW);
  const y1 = Math.floor(guideY + (roi.y + roi.h) * guideH);
  const { data, width } = imageData;

  const pixels: { rgb: Rgb; lum: number }[] = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue;
      const i = (y * width + x) * 4;
      const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
      const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      pixels.push({ rgb, lum });
    }
  }

  if (pixels.length === 0) return [128, 128, 128];

  pixels.sort((a, b) => a.lum - b.lum);
  const trim = Math.floor(pixels.length * 0.1);
  const trimmed = pixels.slice(trim, pixels.length - trim || undefined);
  const use = trimmed.length > 0 ? trimmed : pixels;

  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of use) {
    r += p.rgb[0];
    g += p.rgb[1];
    b += p.rgb[2];
  }
  const n = use.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Sample neutral reference area for session calibration */
export function sampleNeutralReference(
  imageData: ImageData,
  guideX: number,
  guideY: number,
  guideW: number,
  guideH: number,
  neutralRoi: { x: number; y: number; w: number; h: number }
): Rgb {
  const roi: PadRoi = { padId: '_neutral', ...neutralRoi };
  return samplePadRegion(imageData, guideX, guideY, guideW, guideH, roi);
}

/** Compute guide box dimensions centered in the frame */
export function computeGuideRect(
  frameWidth: number,
  frameHeight: number,
  aspectRatio: number
): { x: number; y: number; w: number; h: number } {
  const maxH = frameHeight * 0.75;
  const maxW = frameWidth * 0.55;
  let h = maxH;
  let w = h * aspectRatio;
  if (w > maxW) {
    w = maxW;
    h = w / aspectRatio;
  }
  const x = (frameWidth - w) / 2;
  const y = (frameHeight - h) / 2;
  return { x, y, w, h };
}

/**
 * Draw one video frame to a temporary canvas and return ImageData.
 * Caller must release canvas reference after use.
 */
export function captureFrameToImageData(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ImageData | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Clear temporary canvas buffers — no image data retained */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}
