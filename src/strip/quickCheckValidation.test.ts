import { describe, expect, it } from 'vitest';
import { saltScaleToPpm } from './brands/saltScaleMapping';
import { validateManualStripEntry } from './quickCheckValidation';
import { CLOROX_SALT_POOL_STRIP } from './brands/cloroxSaltPool';
import type { PoolInfo } from '../models/types';

const saltPool: PoolInfo = {
  volume: 20000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'salt',
  profile: { surface: 'plaster', sanitizer: 'salt', environment: 'outdoor', spaMode: false },
};

const chlorinePool: PoolInfo = {
  ...saltPool,
  sanitizerType: 'chlorine',
  profile: { surface: 'plaster', sanitizer: 'chlorine', environment: 'outdoor', spaMode: false },
};

describe('salt scale mapping', () => {
  it('converts scale 6.4 to 3200 ppm', () => {
    expect(saltScaleToPpm(6.4)).toBe(3200);
  });

  it('maps bottle-verified anchor values', () => {
    expect(saltScaleToPpm(6)).toBe(3000);
    expect(saltScaleToPpm(8)).toBe(4000);
  });
});

describe('manual entry validation', () => {
  it('allows continue when all six-way pads and salt are entered', () => {
    const selections = Object.fromEntries(
      CLOROX_SALT_POOL_STRIP.pads.map((p) => [p.id, p.scaleValues[2]])
    );
    const result = validateManualStripEntry(CLOROX_SALT_POOL_STRIP, selections, saltPool, false);
    expect(result.canContinue).toBe(true);
  });

  it('reports missing required fields', () => {
    const result = validateManualStripEntry(CLOROX_SALT_POOL_STRIP, {}, saltPool, false);
    expect(result.canContinue).toBe(false);
    expect(result.missingLabels.length).toBeGreaterThan(0);
  });

  it('allows non-salt pool to skip salt', () => {
    const selections = Object.fromEntries(
      CLOROX_SALT_POOL_STRIP.pads
        .filter((p) => p.stripType === 'six_way')
        .map((p) => [p.id, p.scaleValues[1]])
    );
    const result = validateManualStripEntry(
      CLOROX_SALT_POOL_STRIP,
      selections,
      chlorinePool,
      true
    );
    expect(result.canContinue).toBe(true);
    expect(result.errors.salt).toBeUndefined();
  });

  it('does not require camera metadata', () => {
    const selections = Object.fromEntries(
      CLOROX_SALT_POOL_STRIP.pads
        .filter((p) => p.stripType === 'six_way')
        .map((p) => [p.id, p.scaleValues[0]])
    );
    const result = validateManualStripEntry(
      CLOROX_SALT_POOL_STRIP,
      selections,
      chlorinePool,
      true
    );
    expect(result.canContinue).toBe(true);
  });
});
