import { describe, expect, it } from 'vitest';
import { getTestSourceDisplayLabel, getTestAccuracyLabel } from './testSourceDisplay';
import type { WaterTest } from '../models/types';

const taylorTest = {
  id: '1',
  date: '2026-01-01',
  readings: {} as WaterTest['readings'],
  pool: {} as WaterTest['pool'],
  testSource: 'taylor_k2006_salt' as const,
};

const stripTest = {
  ...taylorTest,
  id: '2',
  testSource: 'test_strip' as const,
  stripMetadata: {
    brandId: 'clorox_salt_pool',
    manufacturer: 'Clorox',
    productName: 'Clorox Salt Pool Test Strips',
    testSource: 'test_strip' as const,
    captureMethod: 'manual' as const,
    overallConfidence: 65,
    accuracyLevel: 'medium' as const,
    padReadings: [],
    limitationsAcknowledged: true,
  },
};

describe('testSourceDisplay', () => {
  it('labels Taylor tests', () => {
    expect(getTestSourceDisplayLabel(taylorTest)).toBe('Taylor Test');
    expect(getTestAccuracyLabel(taylorTest)).toBe('High');
  });

  it('labels strip tests as Clorox Strip with medium accuracy', () => {
    expect(getTestSourceDisplayLabel(stripTest)).toBe('Clorox Strip');
    expect(getTestAccuracyLabel(stripTest)).toBe('Medium');
  });
});
