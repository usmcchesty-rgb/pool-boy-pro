import { describe, expect, it } from 'vitest';
import {
  CYA_ALKALINITY_FACTOR,
  LSI_CONSTANT,
  analyzeWaterBalance,
  calculateAdjustedAlkalinity,
  calculateCSI,
  classifyCSI,
} from './csi';
import type { WaterReadings } from '../models/types';

const balancedInput = {
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  temperature: 82,
  temperatureUnit: 'fahrenheit' as const,
};

describe('calculateAdjustedAlkalinity', () => {
  it('subtracts cyanurate alkalinity at industry factor', () => {
    expect(calculateAdjustedAlkalinity(100, 40)).toBeCloseTo(100 - 40 * CYA_ALKALINITY_FACTOR, 5);
  });

  it('does not return negative alkalinity', () => {
    expect(calculateAdjustedAlkalinity(20, 100)).toBe(0);
  });
});

describe('calculateCSI', () => {
  it('returns near-balanced CSI for typical pool water', () => {
    const result = calculateCSI(balancedInput);
    expect(result.value).toBeGreaterThan(-0.3);
    expect(result.value).toBeLessThan(0.3);
    expect(result.adjustedAlkalinity).toBeCloseTo(86.8, 1);
  });

  it('documents LSI factors used in calculation', () => {
    const result = calculateCSI(balancedInput);
    expect(result.factors.constant).toBe(LSI_CONSTANT);
    expect(result.factors.ph).toBe(7.4);
    expect(result.factors.calciumFactor).toBeCloseTo(Math.log10(250) - 0.4, 3);
  });
});

describe('classifyCSI', () => {
  it('classifies balanced range', () => {
    expect(classifyCSI(0).classification).toBe('balanced');
    expect(classifyCSI(-0.18).label).toBe('Balanced');
  });

  it('classifies scaling water', () => {
    const scaling = calculateCSI({
      ph: 8.0,
      totalAlkalinity: 150,
      calciumHardness: 450,
      cyanuricAcid: 50,
      temperature: 82,
      temperatureUnit: 'fahrenheit',
    });
    expect(scaling.value).toBeGreaterThanOrEqual(0.5);
    expect(classifyCSI(scaling.value).classification).toBe('scaling');
  });

  it('classifies corrosive water', () => {
    const corrosive = calculateCSI({
      ph: 7.0,
      totalAlkalinity: 60,
      calciumHardness: 100,
      cyanuricAcid: 30,
      temperature: 82,
      temperatureUnit: 'fahrenheit',
    });
    expect(corrosive.value).toBeLessThanOrEqual(-0.5);
    expect(classifyCSI(corrosive.value).classification).toBe('aggressively_corrosive');
  });

  it('uses boundary thresholds correctly', () => {
    expect(classifyCSI(-0.31).classification).toBe('corrosive');
    expect(classifyCSI(-0.3).classification).toBe('balanced');
    expect(classifyCSI(0.29).classification).toBe('balanced');
    expect(classifyCSI(0.3).classification).toBe('slight_scaling');
    expect(classifyCSI(0.49).classification).toBe('slight_scaling');
    expect(classifyCSI(0.5).classification).toBe('scaling');
  });
});

describe('analyzeWaterBalance', () => {
  it('returns full analysis with explanation', () => {
    const readings: WaterReadings = {
      ...balancedInput,
      freeChlorine: 2,
      combinedChlorine: 0.2,
      salt: 3200,
    };
    const result = analyzeWaterBalance(readings);
    expect(result.summary).toContain('balanced');
    expect(result.explanation.scalingRisk.length).toBeGreaterThan(10);
    expect(result.explanation.corrosionRisk.length).toBeGreaterThan(10);
  });
});
