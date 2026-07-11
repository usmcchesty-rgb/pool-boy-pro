import { describe, expect, it } from 'vitest';
import { DEFAULT_POOL_PROFILE } from './poolProfiles';
import {
  formatProfileSummary,
  getProfileFactorLabel,
  getTargetRangeDetails,
} from './profileRangeDisplay';

describe('profileRangeDisplay', () => {
  it('summarizes the active profile selection', () => {
    const summary = formatProfileSummary({
      ...DEFAULT_POOL_PROFILE,
      surface: 'vinyl',
      environment: 'indoor',
    });
    expect(summary).toContain('Indoor');
    expect(summary).toContain('Vinyl');
  });

  it('flags calcium hardness as surface-adjusted for vinyl', () => {
    const details = getTargetRangeDetails({ ...DEFAULT_POOL_PROFILE, surface: 'vinyl' });
    const ch = details.find((d) => d.parameter === 'calciumHardness');
    expect(ch?.changedBy).toContain('surface');
    expect(ch?.profileNote).toContain('Vinyl');
  });

  it('flags cyanuric acid for indoor environment', () => {
    const details = getTargetRangeDetails({ ...DEFAULT_POOL_PROFILE, environment: 'indoor' });
    const cya = details.find((d) => d.parameter === 'cyanuricAcid');
    expect(cya?.changedBy).toContain('environment');
    expect(cya?.whatItMeans.length).toBeGreaterThan(10);
  });

  it('includes beginner explanations for every parameter', () => {
    const details = getTargetRangeDetails(DEFAULT_POOL_PROFILE);
    expect(details).toHaveLength(8);
    expect(details.every((d) => d.whatItMeans && d.whyItMatters)).toBe(true);
  });

  it('labels profile factors for display', () => {
    expect(getProfileFactorLabel('spa')).toBe('Spa mode');
  });
});
