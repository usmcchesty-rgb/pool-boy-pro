import { describe, expect, it } from 'vitest';
import { createStripWaterTest } from './quickCheckService';
import { CLOROX_SALT_POOL_STRIP } from '../strip/brands/cloroxSaltPool';
import { DEFAULT_POOL_INFO, DEFAULT_SETTINGS } from '../models/defaults';
import { matchPadColorFull } from '../strip/scanner/colorMatcher';
import { getCloroxColorAnchors } from '../strip/scanner/cloroxCalibration';

const selections = {
  totalHardness: 250,
  totalChlorine: 3,
  freeChlorine: 3,
  ph: 7.5,
  totalAlkalinity: 120,
  cyanuricAcid: 50,
  salt: 3000,
};

describe('createStripWaterTest', () => {
  it('saves with test_strip source and strip metadata', () => {
    const test = createStripWaterTest(
      CLOROX_SALT_POOL_STRIP,
      selections,
      DEFAULT_POOL_INFO,
      DEFAULT_SETTINGS
    );

    expect(test.testSource).toBe('test_strip');
    expect(test.stripMetadata?.brandId).toBe('clorox_salt_pool');
    expect(test.stripMetadata?.captureMethod).toBe('manual');
    expect(test.stripMetadata?.accuracyLevel).toBe('medium');
    expect(test.analysis).toBeDefined();
    expect(test.analysis?.overallScore).toBeGreaterThan(0);
  });

  it('runs the shared chemistry engine for analysis', () => {
    const test = createStripWaterTest(
      CLOROX_SALT_POOL_STRIP,
      selections,
      DEFAULT_POOL_INFO,
      DEFAULT_SETTINGS
    );
    expect(test.analysis?.parameters.length).toBeGreaterThan(0);
    expect(test.analysis?.recommendations).toBeDefined();
  });

  it('saves camera_verified tests with per-pad confidence', () => {
    const anchors = getCloroxColorAnchors('freeChlorine');
    const match = matchPadColorFull('freeChlorine', anchors[2].rgb, 0.9);
    const test = createStripWaterTest(
      CLOROX_SALT_POOL_STRIP,
      { ...selections, freeChlorine: match.proposedValue },
      DEFAULT_POOL_INFO,
      DEFAULT_SETTINGS,
      {
        captureMethod: 'camera_verified',
        scanMatches: [match],
        overallConfidence: match.confidence,
      }
    );

    expect(test.stripMetadata?.captureMethod).toBe('camera_verified');
    expect(test.stripMetadata?.padReadings[0].confidence).toBeGreaterThan(0);
  });
});
