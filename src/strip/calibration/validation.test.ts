import { describe, expect, it } from 'vitest';
import { validateCalibrationImport } from './validation';
import { CALIBRATION_SCHEMA_VERSION } from './types';
import { CLOROX_COLOR_ANCHORS } from '../scanner/cloroxCalibration';
import { rgbToLab } from '../scanner/colorScience';
import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';

function buildValidCalibration() {
  return {
    version: CALIBRATION_SCHEMA_VERSION,
    brandId: 'clorox_salt_pool',
    createdAt: new Date().toISOString(),
    calibrationVersion: 'test-v1',
    sourceDescription: 'Test calibration',
    pads: CLOROX_SALT_POOL_STRIP.pads.map((pad) => ({
      padId: pad.id,
      anchors: (CLOROX_COLOR_ANCHORS[pad.id] ?? []).map((a) => ({
        value: a.value,
        referenceRgb: a.rgb,
        referenceLab: rgbToLab(a.rgb),
        sampleCount: 5,
        source: 'test',
        reliability: 'measured',
      })),
    })),
  };
}

describe('calibration validation', () => {
  it('accepts valid calibration JSON', () => {
    const result = validateCalibrationImport(buildValidCalibration());
    expect(result.valid).toBe(true);
    expect(result.data?.calibrationVersion).toBe('test-v1');
  });

  it('rejects unsupported version', () => {
    const data = { ...buildValidCalibration(), version: 99 };
    const result = validateCalibrationImport(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'version')).toBe(true);
  });

  it('rejects missing pads', () => {
    const data = buildValidCalibration();
    data.pads = data.pads.slice(0, 3);
    const result = validateCalibrationImport(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Missing pad'))).toBe(true);
  });

  it('rejects invalid RGB values', () => {
    const data = buildValidCalibration();
    data.pads[0].anchors[0].referenceRgb = [300, 0, 0];
    const result = validateCalibrationImport(data);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid chart values', () => {
    const data = buildValidCalibration();
    data.pads[0].anchors[0].value = 999;
    const result = validateCalibrationImport(data);
    expect(result.valid).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(validateCalibrationImport(null).valid).toBe(false);
    expect(validateCalibrationImport('string').valid).toBe(false);
  });
});

describe('anchor fallback', () => {
  it('uses built-in anchors when no import exists', async () => {
    const { invalidateAnchorCache, getActiveAnchorInfo, getActiveColorAnchors } = await import(
      './anchorProvider'
    );
    invalidateAnchorCache();
    expect(getActiveAnchorInfo().source).toBe('builtin_approximate');
    const anchors = getActiveColorAnchors('freeChlorine');
    expect(anchors.length).toBe(5);
    expect(anchors[0].reliability).toBe('approximate');
  });
});
