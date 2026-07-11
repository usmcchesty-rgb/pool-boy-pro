import { describe, expect, it } from 'vitest';
import { getChartIdealRanges } from './chartIdeals';
import { getParameterThresholdsForProfile } from '../chemistry/poolProfiles';
import type { PoolProfileConfig } from '../models/types';

describe('getChartIdealRanges', () => {
  it('uses profile-specific ideal thresholds for each chart parameter', () => {
    const profile: PoolProfileConfig = {
      surface: 'vinyl',
      sanitizer: 'chlorine',
      environment: 'outdoor',
      spaMode: false,
    };
    const ranges = getChartIdealRanges(profile);
    const fcThresholds = getParameterThresholdsForProfile('freeChlorine', profile);

    expect(ranges.freeChlorine).toEqual({
      min: fcThresholds.idealMin,
      max: fcThresholds.idealMax,
    });
    expect(ranges.ph.min).toBeLessThan(ranges.ph.max);
  });

  it('reflects spa profile temperature targets', () => {
    const spaProfile: PoolProfileConfig = {
      surface: 'fiberglass',
      sanitizer: 'bromine',
      environment: 'outdoor',
      spaMode: true,
    };
    const ranges = getChartIdealRanges(spaProfile);
    const spaTemp = getParameterThresholdsForProfile('temperature', spaProfile);

    expect(ranges.temperature).toEqual({
      min: spaTemp.idealMin,
      max: spaTemp.idealMax,
    });
  });
});
