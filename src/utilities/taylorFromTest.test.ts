import { describe, expect, it } from 'vitest';
import { buildReadingsFromTaylorInputs } from '../chemistry/taylorKit';
import { DEFAULT_SETTINGS } from '../models/defaults';
import type { WaterTest } from '../models/types';
import { taylorInputsFromWaterTest } from './taylorFromTest';

const sampleTest: WaterTest = {
  id: 'test-1',
  date: '2026-01-15T10:00:00.000Z',
  readings: {
    freeChlorine: 2,
    combinedChlorine: 0.4,
    ph: 7.4,
    totalAlkalinity: 100,
    calciumHardness: 250,
    cyanuricAcid: 40,
    salt: 3200,
    temperature: 82,
    temperatureUnit: 'fahrenheit',
  },
  pool: {
    volume: 20000,
    volumeUnit: 'gallons',
    poolType: 'inground',
    sanitizerType: 'salt',
  },
  notes: 'Sunny day',
};

describe('taylorInputsFromWaterTest', () => {
  it('reconstructs Taylor inputs from stored readings', () => {
    const inputs = taylorInputsFromWaterTest(sampleTest, DEFAULT_SETTINGS);

    expect(inputs.totalAlkalinityMode).toBe('ppm');
    expect(inputs.totalAlkalinityPpm).toBe(100);
    expect(inputs.calciumHardnessPpm).toBe(250);
    expect(inputs.ph).toBe(7.4);
    expect(inputs.saltSkipped).toBe(false);
  });

  it('round-trips readings through Taylor input conversion', () => {
    const inputs = taylorInputsFromWaterTest(sampleTest, DEFAULT_SETTINGS);
    const rebuilt = buildReadingsFromTaylorInputs(inputs);

    expect(rebuilt.freeChlorine).toBeCloseTo(sampleTest.readings.freeChlorine, 5);
    expect(rebuilt.combinedChlorine).toBeCloseTo(sampleTest.readings.combinedChlorine, 5);
    expect(rebuilt.totalAlkalinity).toBe(sampleTest.readings.totalAlkalinity);
    expect(rebuilt.calciumHardness).toBe(sampleTest.readings.calciumHardness);
    expect(rebuilt.salt).toBe(sampleTest.readings.salt);
  });

  it('marks salt as skipped for non-salt pools with zero salt reading', () => {
    const chlorineTest: WaterTest = {
      ...sampleTest,
      readings: { ...sampleTest.readings, salt: 0 },
      pool: { ...sampleTest.pool, sanitizerType: 'chlorine' },
    };
    const inputs = taylorInputsFromWaterTest(chlorineTest, DEFAULT_SETTINGS);
    expect(inputs.saltSkipped).toBe(true);
  });
});
