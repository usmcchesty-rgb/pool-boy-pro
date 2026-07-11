import { describe, expect, it } from 'vitest';
import {
  deltaEToConfidence,
  matchPadColor,
  rankAnchors,
  confidenceToLevel,
} from './colorMatcher';
import { getCloroxColorAnchors } from './cloroxCalibration';

describe('colorMatcher', () => {
  it('matches exact anchor RGB with high confidence', () => {
    const anchors = getCloroxColorAnchors('freeChlorine');
    const exact = anchors.find((a) => a.value === 3)!;
    const result = matchPadColor('freeChlorine', exact.rgb, 1);
    expect(result.value).toBe(3);
    expect(result.confidence).toBeGreaterThanOrEqual(85);
    expect(result.confidenceLevel).toBe('high');
  });

  it('returns alternate match when confidence is low', () => {
    const result = matchPadColor('ph', [100, 100, 100], 1);
    expect(result.alternateValue).toBeDefined();
    expect(result.confidence).toBeLessThan(75);
  });

  it('maps deltaE to decreasing confidence', () => {
    expect(deltaEToConfidence(2, 'freeChlorine')).toBeGreaterThan(deltaEToConfidence(12, 'freeChlorine'));
    expect(deltaEToConfidence(30, 'freeChlorine')).toBeLessThan(20);
  });

  it('ranks anchors by perceptual distance', () => {
    const anchors = getCloroxColorAnchors('ph');
    const ranked = rankAnchors([230, 180, 60], anchors);
    expect(ranked[0].value).toBe(7.5);
    expect(ranked[0].deltaE).toBeLessThan(ranked[1].deltaE);
  });

  it('lowers effective confidence when calibration is weak', () => {
    const anchors = getCloroxColorAnchors('freeChlorine');
    const near = anchors.find((a) => a.value === 3)!;
    const good = matchPadColor('freeChlorine', near.rgb, 1);
    const weak = matchPadColor('freeChlorine', near.rgb, 0.4);
    expect(weak.confidence).toBeLessThanOrEqual(good.confidence);
  });

  it('assigns confidence levels from scores', () => {
    expect(confidenceToLevel(80)).toBe('high');
    expect(confidenceToLevel(60)).toBe('medium');
    expect(confidenceToLevel(30)).toBe('low');
  });
});
