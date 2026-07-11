import { describe, expect, it } from 'vitest';
import type { PoolInfo, WaterAnalysisResult, WaterReadings, WaterTest } from '../models/types';
import {
  filterHistoryTests,
  getTestProfileKey,
  getTestSource,
  sortHistoryTests,
} from './historyFilters';

const pool: PoolInfo = {
  volume: 20000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'salt',
  profile: { surface: 'plaster', sanitizer: 'salt', environment: 'outdoor', spaMode: false },
};

const readings: WaterReadings = {
  freeChlorine: 2,
  combinedChlorine: 0.2,
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};

function makeTest(
  id: string,
  date: string,
  analysis?: Partial<WaterAnalysisResult>,
  extras?: Partial<WaterTest>
): WaterTest {
  return {
    id,
    date,
    readings,
    pool,
    analysis: {
      overallScore: 90,
      overallRating: 'excellent',
      overallStatus: 'ideal',
      summary: 'Excellent',
      parameters: [],
      recommendations: [],
      ...analysis,
    },
    ...extras,
  };
}

describe('historyFilters', () => {
  const tests = [
    makeTest('1', '2026-01-01T10:00:00Z', { overallRating: 'excellent' }),
    makeTest('2', '2026-02-01T10:00:00Z', { overallRating: 'fair', overallScore: 55 }),
    makeTest('3', '2026-03-01T10:00:00Z', { overallRating: 'good', overallScore: 78 }, {
      testSource: 'test_strip',
    }),
  ];

  it('defaults missing test source to Taylor', () => {
    expect(getTestSource(tests[0])).toBe('taylor_k2006_salt');
  });

  it('filters by date range', () => {
    const result = filterHistoryTests(tests, {
      search: '',
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by rating', () => {
    const result = filterHistoryTests(tests, { search: '', rating: 'fair' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by test source when available', () => {
    const result = filterHistoryTests(tests, { search: '', testSource: 'test_strip' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filters by pool profile key', () => {
    const vinylTest = makeTest('4', '2026-04-01T10:00:00Z', undefined, {
      pool: { ...pool, profile: { surface: 'vinyl', sanitizer: 'salt', environment: 'outdoor', spaMode: false } },
    });
    const result = filterHistoryTests([...tests, vinylTest], {
      search: '',
      profileKey: getTestProfileKey(vinylTest),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('keeps search working alongside other filters', () => {
    const noted = makeTest('5', '2026-05-01T10:00:00Z', { overallRating: 'fair' }, { notes: 'after rain' });
    const result = filterHistoryTests([...tests, noted], {
      search: 'rain',
      rating: 'fair',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
    expect(result[0].analysis?.overallRating).toBe('fair');
  });

  it('sorts by overall score', () => {
    const sorted = sortHistoryTests(tests, 'overallScore', 'desc');
    expect(sorted[0].id).toBe('1');
    expect(sorted.at(-1)?.id).toBe('2');
  });
});
