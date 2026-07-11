import { describe, expect, it } from 'vitest';
import { aggregateCalibrationSamples } from './aggregation';
import type { CalibrationSample } from './types';

function sample(rgb: [number, number, number], accepted = true): CalibrationSample {
  return {
    id: '1',
    padId: 'ph',
    chartValue: 7.5,
    rawRgb: rgb,
    normalizedRgb: rgb,
    lab: [50, 10, 20],
    accepted,
    capturedAt: Date.now(),
  };
}

describe('calibration aggregation', () => {
  it('computes median and average from accepted samples', () => {
    const stats = aggregateCalibrationSamples([
      sample([100, 100, 100]),
      sample([110, 110, 110]),
      sample([120, 120, 120]),
    ]);
    expect(stats?.sampleCount).toBe(3);
    expect(stats?.medianRgb).toEqual([110, 110, 110]);
    expect(stats?.averageRgb).toEqual([110, 110, 110]);
  });

  it('excludes rejected samples', () => {
    const stats = aggregateCalibrationSamples([
      sample([100, 100, 100], true),
      sample([200, 200, 200], false),
    ]);
    expect(stats?.sampleCount).toBe(1);
    expect(stats?.medianRgb).toEqual([100, 100, 100]);
  });

  it('returns null when no accepted samples', () => {
    expect(aggregateCalibrationSamples([sample([100, 100, 100], false)])).toBeNull();
  });
});
