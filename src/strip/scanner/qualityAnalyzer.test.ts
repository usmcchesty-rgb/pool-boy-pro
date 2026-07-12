import { describe, expect, it } from 'vitest';
import {
  assessQuality,
  getQualityThresholds,
  RELAXED_THRESHOLDS,
  STRICT_THRESHOLDS,
} from './qualityAnalyzer';

describe('relaxed threshold behavior', () => {
  const indoorScores = {
    focusScore: 0.22,
    lightingScore: 0.42,
    alignmentScore: 0.25,
    stabilityScore: 0.48,
  };

  it('relaxed mode allows ready when strip is detected with handheld movement', () => {
    const result = assessQuality(indoorScores, true, { relaxQuality: true });
    expect(result.ready).toBe(true);
    expect(result.hasUsableFrame).toBe(true);
    expect(result.message).toBe('Ready');
  });

  it('strict mode may not be ready for the same indoor scores', () => {
    const result = assessQuality(indoorScores, true, { relaxQuality: false });
    expect(result.ready).toBe(false);
  });

  it('uses lower relaxed thresholds than strict', () => {
    const relaxed = getQualityThresholds(true);
    const strict = getQualityThresholds(false);
    expect(relaxed.minFocus).toBeLessThan(strict.minFocus);
    expect(relaxed.minLighting).toBeLessThan(strict.minLighting);
    expect(relaxed.minStability).toBeLessThan(strict.minStability);
  });

  it('blocks genuinely dark frames', () => {
    const result = assessQuality(
      { focusScore: 0.3, lightingScore: 0.05, alignmentScore: 0.4, stabilityScore: 0.8 },
      true,
      { relaxQuality: true }
    );
    expect(result.ready).toBe(false);
    expect(result.hasUsableFrame).toBe(false);
    expect(result.message).toBe('More light needed');
  });

  it('blocks heavily blurred frames', () => {
    const result = assessQuality(
      { focusScore: 0.03, lightingScore: 0.5, alignmentScore: 0.4, stabilityScore: 0.8 },
      true,
      { relaxQuality: true }
    );
    expect(result.hasUsableFrame).toBe(false);
  });
});

describe('simplified quality messaging', () => {
  it('shows Looking good instead of lighting warnings for acceptable indoor light', () => {
    const result = assessQuality(
      { focusScore: 0.2, lightingScore: 0.35, alignmentScore: 0.2, stabilityScore: 0.4 },
      true,
      { relaxQuality: true }
    );
    expect(result.message).not.toBe('More light needed');
    expect(['Looking good', 'Hold steady', 'Ready']).toContain(result.message);
  });

  it('shows Hold steady for minor motion when strip detected', () => {
    const result = assessQuality(
      { focusScore: 0.25, lightingScore: 0.4, alignmentScore: 0.3, stabilityScore: 0.22 },
      true,
      { relaxQuality: true }
    );
    expect(result.message).toBe('Hold steady');
    expect(result.ready).toBe(false);
  });

  it('shows Lighting OK when light is acceptable but strip not yet found', () => {
    const result = assessQuality(
      { focusScore: 0.2, lightingScore: 0.22, alignmentScore: 0.08, stabilityScore: 0.5 },
      false,
      { relaxQuality: true }
    );
    expect(result.message).toBe('Looking for strip');
  });

  it('defaults to relaxed mode when option omitted', () => {
    const relaxed = assessQuality(
      { focusScore: 0.2, lightingScore: 0.4, alignmentScore: 0.2, stabilityScore: 0.45 },
      true
    );
    expect(relaxed.ready).toBe(true);
  });
});

describe('threshold constants', () => {
  it('exports relaxed and strict threshold sets', () => {
    expect(RELAXED_THRESHOLDS.minStability).toBe(0.3);
    expect(STRICT_THRESHOLDS.minStability).toBe(0.55);
  });
});
