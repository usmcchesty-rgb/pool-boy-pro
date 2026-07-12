import { describe, expect, it, beforeAll } from 'vitest';
import {
  cloneImageData,
  createPreviewSession,
  getPreviewSession,
  hasPreviewSession,
  releasePreviewSession,
  resamplePadsFromPreview,
  resetStripBoxToOriginal,
  storePreviewSession,
  updateSessionStripBox,
} from './temporaryPreview';
import { createSessionCalibration } from './sessionCalibration';
import type { StripBoundingBox } from './stripDetector';

function syntheticImageData(w = 40, h = 120): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const band = Math.floor((y / h) * 6);
      data[i] = 80 + band * 25;
      data[i + 1] = 100 + band * 15;
      data[i + 2] = 120 + band * 10;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

const strip: StripBoundingBox = {
  x: 4,
  y: 8,
  w: 32,
  h: 100,
  rotation: 0,
  detected: false,
  confidence: 0.32,
};

const guide = { x: 2, y: 4, w: 36, h: 110 };

beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class MockImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      colorSpace = 'srgb' as PredefinedColorSpace;
      constructor(data: Uint8ClampedArray, w: number, h: number) {
        this.data = data;
        this.width = w;
        this.height = h;
      }
    } as unknown as typeof ImageData;
  }
});

describe('temporaryPreview', () => {
  it('stores and releases preview session', () => {
    const imageData = syntheticImageData();
    const session = createPreviewSession(imageData, 'six_way', strip, guide, createSessionCalibration());
    storePreviewSession(session);
    expect(hasPreviewSession()).toBe(true);
    expect(getPreviewSession()?.phase).toBe('six_way');
    releasePreviewSession();
    expect(hasPreviewSession()).toBe(false);
    expect(getPreviewSession()).toBeNull();
  });

  it('clones image data independently', () => {
    const original = syntheticImageData(10, 10);
    const copy = cloneImageData(original);
    copy.data[0] = 0;
    expect(original.data[0]).not.toBe(0);
  });

  it('resamples pads after bbox adjustment', () => {
    const imageData = syntheticImageData();
    storePreviewSession(
      createPreviewSession(imageData, 'six_way', strip, guide, createSessionCalibration())
    );
    updateSessionStripBox({ ...strip, x: 6, w: 30, confidence: 0.5 });
    const result = resamplePadsFromPreview({ geometrySource: 'adjusted_strip_box' });
    expect(result).not.toBeNull();
    expect(result!.padMatches.length).toBe(6);
    expect(result!.geometrySource).toBe('adjusted_strip_box');
    expect(result!.sampledPadRegions?.length).toBe(6);
    releasePreviewSession();
  });

  it('resamples salt strip from adjusted geometry', () => {
    const imageData = syntheticImageData(30, 80);
    storePreviewSession(
      createPreviewSession(imageData, 'salt', strip, guide, createSessionCalibration())
    );
    const result = resamplePadsFromPreview({ geometrySource: 'adjusted_strip_box' });
    expect(result!.padMatches).toHaveLength(1);
    expect(result!.padMatches[0].padId).toBe('salt');
    releasePreviewSession();
  });

  it('resets strip box to original detected area', () => {
    const imageData = syntheticImageData();
    storePreviewSession(
      createPreviewSession(imageData, 'six_way', strip, guide, createSessionCalibration())
    );
    updateSessionStripBox({ ...strip, x: 10, w: 28 });
    const reset = resetStripBoxToOriginal();
    expect(reset?.x).toBe(strip.x);
    expect(getPreviewSession()?.geometry.stripBox.x).toBe(strip.x);
    releasePreviewSession();
  });

  it('applies low-geometry continue-anyway penalty', () => {
    const imageData = syntheticImageData();
    storePreviewSession(
      createPreviewSession(imageData, 'six_way', strip, guide, createSessionCalibration())
    );
    const normal = resamplePadsFromPreview({ geometrySource: 'automatic_detection' });
    storePreviewSession(
      createPreviewSession(imageData, 'six_way', strip, guide, createSessionCalibration())
    );
    const forced = resamplePadsFromPreview({ forceContinueAnyway: true });
    expect(forced!.padMatches[0].lowGeometryConfidence).toBe(true);
    expect(forced!.padMatches[0].confidence).toBeLessThanOrEqual(normal!.padMatches[0].confidence);
    releasePreviewSession();
  });
});
