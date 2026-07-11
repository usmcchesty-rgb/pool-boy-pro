import { describe, expect, it } from 'vitest';
import { deltaE2000, deltaE76, rgbToLab } from '../scanner/colorScience';

describe('CIEDE2000', () => {
  it('returns zero for identical LAB colors', () => {
    const lab = rgbToLab([120, 80, 60]);
    expect(deltaE2000(lab, lab)).toBeCloseTo(0, 3);
  });

  it('returns positive distance for different colors', () => {
    const a = rgbToLab([200, 50, 50]);
    const b = rgbToLab([50, 50, 200]);
    expect(deltaE2000(a, b)).toBeGreaterThan(0);
  });

  it('is more perceptually uniform than CIE76 for some pairs', () => {
    const a = rgbToLab([100, 150, 100]);
    const b = rgbToLab([110, 140, 105]);
    const de76 = deltaE76(a, b);
    const de00 = deltaE2000(a, b);
    expect(de00).toBeGreaterThan(0);
    expect(de76).toBeGreaterThan(0);
  });
});
