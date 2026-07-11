import { describe, expect, it } from 'vitest';
import {
  calibratePadSample,
  createSessionCalibration,
  updateSessionReference,
} from './sessionCalibration';

describe('sessionCalibration', () => {
  it('builds reference from first neutral sample', () => {
    const state = updateSessionReference(createSessionCalibration(), [180, 180, 175]);
    expect(state.referenceRgb).toEqual([180, 180, 175]);
    expect(state.confidence).toBeGreaterThan(0);
  });

  it('blends subsequent reference samples', () => {
    let state = updateSessionReference(createSessionCalibration(), [180, 180, 180]);
    state = updateSessionReference(state, [200, 200, 200]);
    expect(state.referenceRgb![0]).toBeGreaterThan(180);
    expect(state.referenceRgb![0]).toBeLessThan(200);
  });

  it('calibrates pad samples using session reference', () => {
    let state = updateSessionReference(createSessionCalibration(), [160, 160, 160]);
    const { rgb, calibrationConfidence } = calibratePadSample(state, [200, 100, 100]);
    expect(rgb).not.toEqual([200, 100, 100]);
    expect(calibrationConfidence).toBeGreaterThan(0);
  });

  it('returns reduced confidence without reference', () => {
    const { calibrationConfidence } = calibratePadSample(createSessionCalibration(), [100, 100, 100]);
    expect(calibrationConfidence).toBe(0.5);
  });
});
