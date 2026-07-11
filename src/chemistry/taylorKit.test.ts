import { describe, expect, it } from 'vitest';
import type { TaylorTestInputs } from '../models/taylorKit';
import {
  applySaltReading,
  buildReadingsFromTaylorInputs,
  calculateCombinedChlorine,
  calculateCalciumHardnessFromDrops,
  calculateFreeChlorine,
  calculateTotalAlkalinityFromDrops,
  getFasDpdMultiplier,
} from './taylorKit';

const baseInputs: TaylorTestInputs = {
  sampleSizeMl: 25,
  fcDropCount: 10,
  ccDropCount: 2,
  ph: 7.4,
  totalAlkalinityMode: 'drops',
  totalAlkalinityDrops: 10,
  totalAlkalinityPpm: 100,
  calciumHardnessMode: 'drops',
  calciumHardnessDrops: 10,
  calciumHardnessPpm: 250,
  cyanuricAcid: 40,
  salt: 3200,
  saltSkipped: false,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};

describe('Taylor K-2006 FAS-DPD calculations', () => {
  describe('getFasDpdMultiplier', () => {
    it('returns 0.5 for 10 mL sample', () => {
      expect(getFasDpdMultiplier(10)).toBe(0.5);
    });

    it('returns 0.2 for 25 mL sample', () => {
      expect(getFasDpdMultiplier(25)).toBe(0.2);
    });
  });

  describe('calculateFreeChlorine', () => {
    it('calculates FC as drops × 0.5 for 10 mL sample', () => {
      expect(calculateFreeChlorine(4, 10)).toBe(2);
      expect(calculateFreeChlorine(6, 10)).toBe(3);
    });

    it('calculates FC as drops × 0.2 for 25 mL sample', () => {
      expect(calculateFreeChlorine(10, 25)).toBe(2);
      expect(calculateFreeChlorine(15, 25)).toBe(3);
    });

    it('returns 0 ppm for zero drops', () => {
      expect(calculateFreeChlorine(0, 10)).toBe(0);
      expect(calculateFreeChlorine(0, 25)).toBe(0);
    });
  });

  describe('calculateCombinedChlorine', () => {
    it('uses the same multiplier as FC for 10 mL sample', () => {
      expect(calculateCombinedChlorine(2, 10)).toBe(1);
    });

    it('uses the same multiplier as FC for 25 mL sample', () => {
      expect(calculateCombinedChlorine(5, 25)).toBe(1);
    });
  });

  describe('calculateTotalAlkalinityFromDrops', () => {
    it('calculates TA as drops × 10', () => {
      expect(calculateTotalAlkalinityFromDrops(8)).toBe(80);
      expect(calculateTotalAlkalinityFromDrops(12)).toBe(120);
    });
  });

  describe('calculateCalciumHardnessFromDrops', () => {
    it('calculates CH as drops × 25', () => {
      expect(calculateCalciumHardnessFromDrops(8)).toBe(200);
      expect(calculateCalciumHardnessFromDrops(16)).toBe(400);
    });
  });
});

describe('buildReadingsFromTaylorInputs', () => {
  it('returns 0 salt when saltSkipped is true', () => {
    const readings = buildReadingsFromTaylorInputs({
      ...baseInputs,
      salt: 3200,
      saltSkipped: true,
    });
    expect(readings.salt).toBe(0);
  });

  it('retains salt value when not skipped', () => {
    const readings = buildReadingsFromTaylorInputs({
      ...baseInputs,
      salt: 3100,
      saltSkipped: false,
    });
    expect(readings.salt).toBe(3100);
  });

  it('maps other calculated fields correctly', () => {
    const readings = buildReadingsFromTaylorInputs(baseInputs);
    expect(readings.freeChlorine).toBe(2);
    expect(readings.combinedChlorine).toBe(0.4);
    expect(readings.totalAlkalinity).toBe(100);
    expect(readings.calciumHardness).toBe(250);
  });
});

describe('applySaltReading', () => {
  it('clears saltSkipped and sets salt ppm', () => {
    const skipped = { ...baseInputs, salt: 0, saltSkipped: true };
    const result = applySaltReading(skipped, 2800);
    expect(result.saltSkipped).toBe(false);
    expect(result.salt).toBe(2800);
  });

  it('produces retained salt in readings after applying', () => {
    const skipped = { ...baseInputs, salt: 0, saltSkipped: true };
    const readings = buildReadingsFromTaylorInputs({
      ...skipped,
      ...applySaltReading(skipped, 2900),
    });
    expect(readings.salt).toBe(2900);
  });
});
