import { describe, expect, it } from 'vitest';
import type { DosingRecommendation, WaterReadings } from '../models/types';
import { DEFAULT_CHEMICAL_STRENGTHS } from '../models/defaults';
import { generateRecommendations } from './recommendations';
import { analyzeWater as analyzeWaterParams } from './analysis';
import {
  applySafetyAndSequencing,
  buildTreatmentPlan,
  inferTreatmentCategory,
  sortRecommendationsBySequence,
} from './treatmentPlan';

const balancedPool = {
  volume: 20000,
  volumeUnit: 'gallons' as const,
  poolType: 'inground' as const,
  sanitizerType: 'salt' as const,
};

const readingsWithIssues: WaterReadings = {
  freeChlorine: 0.5,
  combinedChlorine: 0.1,
  ph: 7.8,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};

describe('generateRecommendations enrichment', () => {
  it('includes unit, expectedResult, and category on each recommendation', () => {
    const params = analyzeWaterParams(readingsWithIssues, balancedPool);
    const recs = generateRecommendations(
      readingsWithIssues,
      balancedPool,
      params,
      DEFAULT_CHEMICAL_STRENGTHS
    );
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.unit).toBeTruthy();
      expect(rec.expectedResult).toBeTruthy();
      expect(rec.category).toBeTruthy();
      expect(rec.pumpRuntime).toBeTruthy();
      expect(rec.waitTime).toBeTruthy();
      expect(rec.retestNote).toBeTruthy();
    }
  });
});

describe('applySafetyAndSequencing', () => {
  it('removes chlorine raise when FC is already high', () => {
    const highFcReadings: WaterReadings = {
      ...readingsWithIssues,
      freeChlorine: 8,
      combinedChlorine: 0.1,
    };
    const recs: DosingRecommendation[] = [
      {
        order: 1,
        chemical: 'Liquid Chlorine',
        amount: '16 fl oz',
        unit: 'fl oz',
        reason: 'Free chlorine low',
        expectedResult: 'Raise FC',
        priority: 'high',
        pumpRuntime: 'Run pump',
        waitTime: 'Wait',
        retestNote: 'Retest',
        category: 'chlorine_raise',
      },
    ];
    const { recommendations, planWarnings } = applySafetyAndSequencing(recs, highFcReadings);
    expect(recommendations).toHaveLength(0);
    expect(planWarnings.some((w) => w.title.includes('high'))).toBe(true);
  });

  it('orders acid before chlorine when both are required', () => {
    const recs: DosingRecommendation[] = [
      {
        order: 1,
        chemical: 'Liquid Chlorine',
        amount: '8 fl oz',
        unit: 'fl oz',
        reason: 'FC low',
        expectedResult: 'Raise FC',
        priority: 'high',
        pumpRuntime: 'Run pump',
        waitTime: 'Wait 30 min',
        retestNote: 'Retest FC',
        category: 'chlorine_raise',
      },
      {
        order: 2,
        chemical: 'Muriatic Acid',
        amount: '12 fl oz',
        unit: 'fl oz',
        reason: 'pH high',
        expectedResult: 'Lower pH',
        priority: 'medium',
        pumpRuntime: 'Run pump',
        waitTime: 'Wait 4 hours',
        retestNote: 'Retest pH',
        category: 'acid_ph',
      },
    ];
    const { recommendations } = applySafetyAndSequencing(recs, readingsWithIssues);
    expect(recommendations[0].category).toBe('acid_ph');
    expect(recommendations[1].category).toBe('chlorine_raise');
  });
});

describe('buildTreatmentPlan', () => {
  it('inserts wait steps between incompatible treatments', () => {
    const recs: DosingRecommendation[] = [
      {
        order: 1,
        chemical: 'Muriatic Acid',
        amount: '12 fl oz',
        unit: 'fl oz',
        reason: 'Lower pH',
        expectedResult: 'Lower pH',
        priority: 'medium',
        pumpRuntime: 'Run pump 2–4 hours',
        waitTime: 'Wait 4 hours',
        retestNote: 'Retest pH',
        category: 'acid_ph',
      },
      {
        order: 2,
        chemical: 'Liquid Chlorine',
        amount: '8 fl oz',
        unit: 'fl oz',
        reason: 'Raise FC',
        expectedResult: 'Raise FC',
        priority: 'high',
        pumpRuntime: 'Run pump 2–4 hours',
        waitTime: 'Wait 30 minutes',
        retestNote: 'Retest FC',
        category: 'chlorine_raise',
      },
    ];
    const plan = buildTreatmentPlan(recs, readingsWithIssues);
    const waitSteps = plan.filter((s) => s.kind === 'wait');
    expect(waitSteps.length).toBeGreaterThan(0);
    expect(plan.some((s) => s.kind === 'retest')).toBe(true);
    expect(plan.some((s) => s.kind === 'treatment')).toBe(true);
  });
});

describe('inferTreatmentCategory', () => {
  it('classifies shock treatments', () => {
    expect(inferTreatmentCategory('Liquid Chlorine', 'Breakpoint shock for combined chlorine')).toBe('shock');
  });
});

describe('sortRecommendationsBySequence', () => {
  it('places alkalinity adjustments before chlorine raises', () => {
    const sorted = sortRecommendationsBySequence([
      {
        order: 2,
        chemical: 'Liquid Chlorine',
        amount: '8 fl oz',
        unit: 'fl oz',
        reason: 'FC',
        expectedResult: 'Raise FC',
        priority: 'high',
        pumpRuntime: 'Run',
        waitTime: 'Wait',
        retestNote: 'Retest',
        category: 'chlorine_raise',
      },
      {
        order: 1,
        chemical: 'Baking Soda',
        amount: '2 lb',
        unit: 'lb',
        reason: 'TA low',
        expectedResult: 'Raise TA',
        priority: 'medium',
        pumpRuntime: 'Run',
        waitTime: 'Wait',
        retestNote: 'Retest',
        category: 'alkalinity_up',
      },
    ]);
    expect(sorted[0].category).toBe('alkalinity_up');
  });
});
