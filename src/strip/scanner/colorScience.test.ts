import { describe, expect, it } from 'vitest';
import {
  deltaE76,
  normalizeBrightness,
  rgbToLab,
  whiteBalanceFromReference,
} from './colorScience';

describe('colorScience', () => {
  it('converts identical RGB to zero deltaE', () => {
    const lab = rgbToLab([200, 100, 50]);
    expect(deltaE76(lab, lab)).toBe(0);
  });

  it('reports larger deltaE for dissimilar colors', () => {
    const a = rgbToLab([255, 0, 0]);
    const b = rgbToLab([0, 0, 255]);
    expect(deltaE76(a, b)).toBeGreaterThan(50);
  });

  it('normalizes brightness by factor', () => {
    expect(normalizeBrightness([100, 100, 100], 1.5)).toEqual([150, 150, 150]);
  });

  it('white-balance lowers confidence for extreme reference', () => {
    const result = whiteBalanceFromReference([100, 80, 60], [10, 10, 10]);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('white-balance adjusts neutral reference toward mid-gray', () => {
    const result = whiteBalanceFromReference([200, 180, 160], [180, 180, 180]);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.normalized[0]).toBeLessThan(200);
  });
});
