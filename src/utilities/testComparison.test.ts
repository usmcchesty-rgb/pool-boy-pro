import { describe, expect, it } from 'vitest';
import type { OverallRating, ParameterAnalysis, PoolInfo, WaterReadings, WaterTest } from '../models/types';
import { buildCompareRows, buildCompareSummaries, sortTestsForCompare } from './testComparison';

const pool: PoolInfo = {
  volume: 20000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'salt',
};

function param(parameter: string, level: ParameterAnalysis['level']): ParameterAnalysis {
  return {
    parameter,
    label: parameter,
    value: 0,
    unit: 'ppm',
    level,
    status: level === 'ideal' ? 'ideal' : 'too_low',
    priority: 'medium',
    idealMin: 0,
    idealMax: 0,
    whyItMatters: '',
    possibleCauses: [],
    possibleEffects: [],
    suggestedCorrection: '',
  };
}

const baseReadings: WaterReadings = {
  freeChlorine: 0.5,
  combinedChlorine: 0.8,
  ph: 7.0,
  totalAlkalinity: 90,
  calciumHardness: 200,
  cyanuricAcid: 30,
  salt: 3000,
  temperature: 80,
  temperatureUnit: 'fahrenheit',
};

function makeTest(
  id: string,
  date: string,
  score: number,
  rating: OverallRating,
  fcLevel: ParameterAnalysis['level']
): WaterTest {
  return {
    id,
    date,
    readings: baseReadings,
    pool,
    analysis: {
      overallScore: score,
      overallRating: rating,
      overallStatus: 'mixed',
      summary: '',
      parameters: [param('freeChlorine', fcLevel), param('ph', 'ideal')],
      recommendations: [],
    },
  };
}

describe('testComparison', () => {
  const older = makeTest('old', '2026-01-01T10:00:00Z', 60, 'fair', 'low');
  const newer = makeTest('new', '2026-02-01T10:00:00Z', 88, 'good', 'ideal');

  it('sorts compare tests oldest first', () => {
    const sorted = sortTestsForCompare([newer, older]);
    expect(sorted[0].id).toBe('old');
    expect(sorted[1].id).toBe('new');
  });

  it('marks score and rating improvements vs baseline', () => {
    const summaries = buildCompareSummaries([older, newer], (d) => d);
    expect(summaries[0].scoreTrend).toBe('baseline');
    expect(summaries[1].scoreTrend).toBe('improved');
    expect(summaries[1].ratingTrend).toBe('improved');
    expect(summaries[1].scoreDelta).toContain('+');
  });

  it('highlights improved and worsened reading levels', () => {
    const rows = buildCompareRows([older, newer]);
    const fc = rows.find((r) => r.key === 'freeChlorine');
    expect(fc?.values[0].trend).toBe('baseline');
    expect(fc?.values[1].trend).toBe('improved');
  });

  it('supports three tests', () => {
    const middle = makeTest('mid', '2026-01-15T10:00:00Z', 72, 'good', 'low');
    const rows = buildCompareRows([older, middle, newer]);
    expect(rows[0].values).toHaveLength(3);
  });
});
