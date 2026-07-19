import { describe, expect, it } from 'vitest';
import { DEFAULT_POOL_INFO } from '../models/defaults';
import type { PoolInfo } from '../models/types';
import { defaultTaylorInputs, type TaylorTestInputs } from '../models/taylorKit';
import { buildReadingsFromTaylorInputs } from '../chemistry/taylorKit';
import { analyzeTest } from '../chemistry/recommendations';
import { DEFAULT_SETTINGS } from '../models/defaults';
import { validateTaylorStep } from './taylorValidation';
import {
  getAcidBaseDemandExplanation,
  getAcidBaseDemandOffer,
  getCombinedChlorineClearMessage,
  getStepSuccessMessage,
  guideHasTroubleshooting,
  isCombinedChlorineStepComplete,
  shouldShowAcidDemand,
  shouldShowBaseDemand,
} from './taylorGuidance';
import { TAYLOR_STEP_GUIDES } from '../constants/taylorStepGuides';

const pool: PoolInfo = { ...DEFAULT_POOL_INFO };

function inputs(overrides: Partial<TaylorTestInputs> = {}): TaylorTestInputs {
  return { ...defaultTaylorInputs(DEFAULT_SETTINGS), ...overrides };
}

describe('Acid/Base Demand selection', () => {
  it('offers base demand when pH is below ideal range', () => {
    expect(getAcidBaseDemandOffer(7.0, pool)).toBe('base');
    expect(shouldShowBaseDemand('base')).toBe(true);
    expect(shouldShowAcidDemand('base')).toBe(false);
  });

  it('offers acid demand when pH is above ideal range', () => {
    expect(getAcidBaseDemandOffer(7.8, pool)).toBe('acid');
    expect(shouldShowAcidDemand('acid')).toBe(true);
    expect(shouldShowBaseDemand('acid')).toBe(false);
  });

  it('hides both when pH is within ideal range', () => {
    expect(getAcidBaseDemandOffer(7.4, pool)).toBe('in_range');
    expect(shouldShowAcidDemand('in_range')).toBe(false);
    expect(shouldShowBaseDemand('in_range')).toBe(false);
    expect(getAcidBaseDemandExplanation('in_range')).toContain('skip');
  });
});

describe('combined chlorine clear sample', () => {
  it('marks step complete when sample stayed clear', () => {
    const state = inputs({ ccSampleStayedClear: true, ccDropCount: 0 });
    expect(isCombinedChlorineStepComplete(state)).toBe(true);
    expect(validateTaylorStep('combinedChlorine', state, pool)).toEqual({});
  });

  it('shows ideal zero message', () => {
    expect(getCombinedChlorineClearMessage()).toContain('0.0 ppm');
    expect(getCombinedChlorineClearMessage()).toContain('ideal');
  });
});

describe('beginner help visibility', () => {
  it('includes troubleshooting for every chemistry step', () => {
    const steps = [
      'freeChlorine',
      'combinedChlorine',
      'ph',
      'totalAlkalinity',
      'calciumHardness',
      'cyanuricAcid',
      'salt',
    ] as const;
    for (const step of steps) {
      expect(guideHasTroubleshooting(step)).toBe(true);
      expect(TAYLOR_STEP_GUIDES[step]?.troubleshooting.length).toBeGreaterThan(0);
      expect(TAYLOR_STEP_GUIDES[step]?.purpose.length).toBeGreaterThan(10);
    }
  });

  it('explains reagent roles for FAS-DPD', () => {
    const guide = TAYLOR_STEP_GUIDES.freeChlorine!;
    expect(guide.reagents?.some((r) => r.name.includes('R-0870'))).toBe(true);
    expect(guide.steps.some((s) => s.toLowerCase().includes('swirl'))).toBe(true);
  });
});

describe('conditional troubleshooting messages', () => {
  it('returns FC success message with ideal context', () => {
    const state = inputs({ fcDropCount: 8, sampleSizeMl: 25 });
    const readings = buildReadingsFromTaylorInputs(state);
    const preview = analyzeTest(readings, pool, DEFAULT_SETTINGS.chemicalStrengths);
    const message = getStepSuccessMessage(
      'freeChlorine',
      state,
      pool,
      readings,
      preview.parameters
    );
    expect(message).toContain('Free Chlorine');
    expect(message).toContain('ppm');
  });

  it('returns CC zero success when sample stayed clear', () => {
    const state = inputs({ ccSampleStayedClear: true, ccDropCount: 0 });
    const readings = buildReadingsFromTaylorInputs(state);
    const preview = analyzeTest(readings, pool, DEFAULT_SETTINGS.chemicalStrengths);
    const message = getStepSuccessMessage(
      'combinedChlorine',
      state,
      pool,
      readings,
      preview.parameters
    );
    expect(message).toContain('0.0 ppm');
    expect(message).toContain('ideal');
  });
});
