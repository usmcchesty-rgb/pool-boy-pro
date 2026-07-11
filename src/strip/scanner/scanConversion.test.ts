import { describe, expect, it } from 'vitest';
import { matchPadColorFull } from './colorMatcher';
import { getCloroxColorAnchors } from './cloroxCalibration';
import { matchesToSelections } from '../../components/strip/StripScanVerification';

describe('scan result conversion', () => {
  it('converts multiple pad matches to strip selections', () => {
    const anchors = getCloroxColorAnchors('freeChlorine');
    const fc = matchPadColorFull('freeChlorine', anchors[2].rgb, 0.9);
    const ph = matchPadColorFull('ph', getCloroxColorAnchors('ph')[2].rgb, 0.9);

    const selections = matchesToSelections([fc, ph]);
    expect(selections.freeChlorine).toBe(fc.proposedValue);
    expect(selections.ph).toBe(ph.proposedValue);
  });

  it('includes confidence level per pad match', () => {
    const anchor = getCloroxColorAnchors('totalAlkalinity')[2];
    const match = matchPadColorFull('totalAlkalinity', anchor.rgb, 0.85);
    expect(match.confidence).toBeGreaterThan(50);
    expect(['high', 'medium', 'low']).toContain(match.confidenceLevel);
  });
});
