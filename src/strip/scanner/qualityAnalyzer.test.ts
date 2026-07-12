import { describe, expect, it } from 'vitest';
import { assessQuality } from './qualityAnalyzer';

describe('manual capture enabled state', () => {
  it('allows manual capture when strip is detected', () => {
    const result = assessQuality(
      { focusScore: 0.3, lightingScore: 0.4, alignmentScore: 0.2, stabilityScore: 0.3 },
      true
    );
    expect(result.hasUsableFrame).toBe(true);
    expect(result.ready).toBe(false);
  });

  it('allows manual capture with moderate alignment', () => {
    const result = assessQuality(
      { focusScore: 0.4, lightingScore: 0.5, alignmentScore: 0.3, stabilityScore: 0.4 },
      false
    );
    expect(result.hasUsableFrame).toBe(true);
  });

  it('shows Ready status when all thresholds met', () => {
    const result = assessQuality(
      { focusScore: 0.8, lightingScore: 0.8, alignmentScore: 0.7, stabilityScore: 0.9 },
      true
    );
    expect(result.ready).toBe(true);
    expect(result.message).toBe('Ready');
  });
});
