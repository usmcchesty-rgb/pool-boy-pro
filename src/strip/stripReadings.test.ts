import { describe, expect, it } from 'vitest';
import { CLOROX_SALT_POOL_STRIP } from './brands/cloroxSaltPool';
import {
  stripSelectionsToWaterReadings,
  validateStripSelections,
} from './stripReadings';
import { DEFAULT_SETTINGS } from '../models/defaults';

const fullSelections = {
  totalHardness: 250,
  totalChlorine: 3,
  freeChlorine: 3,
  ph: 7.5,
  totalAlkalinity: 120,
  cyanuricAcid: 50,
  salt: 3000,
};

describe('stripSelectionsToWaterReadings', () => {
  it('maps Clorox pad selections to WaterReadings', () => {
    const readings = stripSelectionsToWaterReadings(
      CLOROX_SALT_POOL_STRIP,
      fullSelections,
      DEFAULT_SETTINGS
    );

    expect(readings.freeChlorine).toBe(3);
    expect(readings.combinedChlorine).toBe(0);
    expect(readings.ph).toBe(7.5);
    expect(readings.totalAlkalinity).toBe(120);
    expect(readings.calciumHardness).toBe(250);
    expect(readings.cyanuricAcid).toBe(50);
    expect(readings.salt).toBe(3000);
    expect(readings.temperatureUnit).toBe('fahrenheit');
  });

  it('derives combined chlorine from total and free chlorine pads', () => {
    const readings = stripSelectionsToWaterReadings(
      CLOROX_SALT_POOL_STRIP,
      { ...fullSelections, totalChlorine: 5, freeChlorine: 3 },
      DEFAULT_SETTINGS
    );
    expect(readings.combinedChlorine).toBe(2);
  });
});

describe('validateStripSelections', () => {
  it('requires every pad to have a chart selection', () => {
    const errors = validateStripSelections(CLOROX_SALT_POOL_STRIP, { freeChlorine: 1 });
    expect(Object.keys(errors).length).toBe(CLOROX_SALT_POOL_STRIP.pads.length - 1);
    expect(errors.salt).toMatch(/Salt/i);
  });

  it('passes when all pads are selected', () => {
    expect(validateStripSelections(CLOROX_SALT_POOL_STRIP, fullSelections)).toEqual({});
  });
});
