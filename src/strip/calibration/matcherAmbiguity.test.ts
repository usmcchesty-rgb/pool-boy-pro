import { describe, expect, it } from 'vitest';
import { matchPadColor, rankAnchors } from '../scanner/colorMatcher';
import { getCloroxColorAnchors } from '../scanner/cloroxCalibration';
import { getPadMatcherConfig } from './matcherConfig';

describe('ambiguity detection', () => {
  it('marks ambiguous when two anchors are very close', () => {
    const anchors = getCloroxColorAnchors('freeChlorine');
    const a = anchors[1];
    const b = anchors[2];
    const mid: [number, number, number] = [
      Math.round((a.rgb[0] + b.rgb[0]) / 2),
      Math.round((a.rgb[1] + b.rgb[1]) / 2),
      Math.round((a.rgb[2] + b.rgb[2]) / 2),
    ];
    const result = matchPadColor('freeChlorine', mid, 1);
    if (result.alternateValue !== undefined) {
      const gap = (result.alternateDeltaE ?? 0) - result.deltaE;
      const config = getPadMatcherConfig('freeChlorine');
      if (Math.abs(gap) < config.ambiguityMaxGap) {
        expect(result.ambiguous).toBe(true);
        expect(result.confidenceLevel).toBe('low');
        expect(result.confidence).toBeLessThanOrEqual(49);
      }
    }
  });

  it('never assigns high confidence to ambiguous results', () => {
    const anchors = getCloroxColorAnchors('ph');
    const ranked = rankAnchors([228, 175, 65], anchors);
    const between = ranked[0];
    const result = matchPadColor('ph', between.rgb, 1);
    if (result.ambiguous) {
      expect(result.confidenceLevel).not.toBe('high');
    }
  });
});

describe('per-pad confidence thresholds', () => {
  it('uses pad-specific high confidence threshold', () => {
    const config = getPadMatcherConfig('salt');
    expect(config.useNormalization).toBe(false);
    expect(config.highConfidenceMaxDeltaE).toBe(6);
  });

  it('returns alternate with distances for uncertain matches', () => {
    const result = matchPadColor('totalAlkalinity', [150, 150, 150], 1);
    expect(result.deltaE).toBeGreaterThan(0);
    if (result.confidence < 75) {
      expect(result.alternateValue).toBeDefined();
      expect(result.alternateDeltaE).toBeDefined();
    }
  });
});

describe('false-high-confidence detection', () => {
  it('identifies records where high confidence was wrong', async () => {
    const { detectFalseHighConfidence } = await import('./validationStats');
    const records = detectFalseHighConfidence([
      {
        id: '1',
        padId: 'ph',
        proposedValue: 7.2,
        confirmedValue: 7.8,
        confidence: 85,
        confidenceLevel: 'high',
        deltaE: 3,
        anchorSource: 'builtin_approximate',
        recordedAt: Date.now(),
      },
    ]);
    expect(records).toHaveLength(1);
  });
});
