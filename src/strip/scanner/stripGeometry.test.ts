import { describe, expect, it } from 'vitest';
import {
  STRIP_DETECTION_RELIABLE_THRESHOLD,
  absolutePadSampleRegions,
  applyGeometryConfidenceToMatches,
  buildCaptureGeometry,
  classifyGeometrySource,
  computePadRoisFromStrip,
  normalizeStripBox,
  requiresStripCorrection,
  updateGeometryForSource,
} from './stripGeometry';
import type { StripBoundingBox } from './stripDetector';
import { getCloroxScanTarget } from './cloroxCalibration';
import type { PadMatchResult } from './types';

const guide = { x: 50, y: 100, w: 200, h: 600 };

function makeStrip(overrides: Partial<StripBoundingBox> = {}): StripBoundingBox {
  return {
    x: 80,
    y: 120,
    w: 140,
    h: 520,
    rotation: 0,
    detected: true,
    confidence: 0.55,
    ...overrides,
  };
}

const baseMatch: PadMatchResult = {
  padId: 'ph',
  proposedValue: 7.5,
  confidence: 80,
  confidenceLevel: 'high',
  deltaE: 3,
  sampledRgb: [200, 180, 60],
  matchedAnchorRgb: [240, 180, 60],
};

describe('stripGeometry', () => {
  it('classifies guide fallback when strip not detected', () => {
    const strip = makeStrip({ detected: false, confidence: 0.35 });
    expect(classifyGeometrySource(strip)).toBe('guide_fallback');
    expect(requiresStripCorrection(strip)).toBe(true);
  });

  it('requires correction below reliable threshold', () => {
    const strip = makeStrip({ confidence: 0.32 });
    expect(requiresStripCorrection(strip)).toBe(true);
    const geometry = buildCaptureGeometry(strip, guide, 400, 800);
    expect(geometry.requiresCorrection).toBe(true);
  });

  it('recalculates pad ROIs from adjusted bbox', () => {
    const sixWay = getCloroxScanTarget('six_way');
    const strip = makeStrip({ x: 60, y: 110, w: 160, h: 500 });
    const rois = computePadRoisFromStrip(strip, sixWay);
    expect(rois).toHaveLength(6);
    expect(rois[0].padId).toBe('totalHardness');
    expect(rois[0].w).toBeLessThan(sixWay.padRois[0].w);

    const abs = absolutePadSampleRegions(strip, sixWay);
    expect(abs[0].absX).toBeGreaterThan(strip.x);
    expect(abs[0].absW).toBeGreaterThan(0);
  });

  it('recalculates salt strip ROI from adjusted bbox', () => {
    const salt = getCloroxScanTarget('salt');
    const strip = makeStrip({ w: 120, h: 400 });
    const rois = computePadRoisFromStrip(strip, salt);
    expect(rois).toHaveLength(1);
    expect(rois[0].padId).toBe('salt');
  });

  it('lowers pad confidence when geometry is uncertain', () => {
    const matches = applyGeometryConfidenceToMatches(
      [baseMatch],
      'guide_fallback',
      0.3,
      true
    );
    expect(matches[0].confidence).toBeLessThan(baseMatch.confidence);
    expect(matches[0].lowGeometryConfidence).toBe(true);
    expect(matches[0].geometrySource).toBe('guide_fallback');
  });

  it('marks adjusted geometry source metadata', () => {
    const geometry = buildCaptureGeometry(makeStrip(), guide, 400, 800);
    const adjusted = normalizeStripBox(makeStrip({ x: 70, w: 150 }), 400, 800, guide);
    const updated = updateGeometryForSource(geometry, adjusted, 'adjusted_strip_box');
    expect(updated.geometrySource).toBe('adjusted_strip_box');
    expect(updated.stripBox.x).toBe(70);
  });

  it('resets to original detected box via geometry clone', () => {
    const original = makeStrip({ confidence: 0.38 });
    const geometry = buildCaptureGeometry(original, guide, 400, 800);
    const adjusted = { ...original, x: 90, confidence: 0.5 };
    const updated = updateGeometryForSource(geometry, adjusted, 'adjusted_strip_box');
    expect(updated.stripBox.x).toBe(90);
    expect(geometry.originalStripBox.x).toBe(original.x);
    expect(geometry.originalStripBox.confidence).toBe(0.38);
  });

  it('uses reliable threshold constant', () => {
    expect(STRIP_DETECTION_RELIABLE_THRESHOLD).toBe(0.4);
    const ok = makeStrip({ confidence: 0.41 });
    expect(requiresStripCorrection(ok)).toBe(false);
  });
});
