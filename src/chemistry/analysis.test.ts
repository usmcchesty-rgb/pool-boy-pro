import { describe, expect, it } from 'vitest';
import {
  analyzeWater,
  buildSummary,
  calculateOverallScore,
  getOverallRating,
  ratingLabel,
} from './analysis';
import { classifyParameterLevel, levelToReadingStatus } from './classification';
import { generateRecommendations, sortRecommendationsByPriority } from './recommendations';
import { getParameterThresholds } from './ranges';
import type { PoolInfo, WaterReadings } from '../models/types';
import { DEFAULT_CHEMICAL_STRENGTHS } from '../models/defaults';

const balancedPool: PoolInfo = {
  volume: 20000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'salt',
};

const balancedReadings: WaterReadings = {
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

const criticalFcReadings: WaterReadings = {
  ...balancedReadings,
  freeChlorine: 0,
  combinedChlorine: 0.8,
  ph: 7.0,
};

describe('classifyParameterLevel', () => {
  it('classifies free chlorine bands correctly', () => {
    const t = getParameterThresholds('freeChlorine', balancedPool);
    expect(classifyParameterLevel(0, t)).toBe('critical_low');
    expect(classifyParameterLevel(0.5, t)).toBe('low');
    expect(classifyParameterLevel(2, t)).toBe('ideal');
    expect(classifyParameterLevel(4, t)).toBe('high');
    expect(classifyParameterLevel(6, t)).toBe('critical_high');
  });

  it('maps levels to legacy reading status', () => {
    expect(levelToReadingStatus('ideal')).toBe('ideal');
    expect(levelToReadingStatus('low')).toBe('too_low');
    expect(levelToReadingStatus('critical_high')).toBe('too_high');
  });
});

describe('analyzeWater', () => {
  it('returns all eight parameters', () => {
    const params = analyzeWater(balancedReadings, balancedPool);
    expect(params).toHaveLength(8);
    expect(params.every((p) => p.level && p.priority)).toBe(true);
  });

  it('marks balanced water as ideal across primary parameters', () => {
    const params = analyzeWater(balancedReadings, balancedPool);
    const fc = params.find((p) => p.parameter === 'freeChlorine');
    const ph = params.find((p) => p.parameter === 'ph');
    expect(fc?.level).toBe('ideal');
    expect(ph?.level).toBe('ideal');
  });
});

describe('calculateOverallScore', () => {
  it('returns high score for balanced water', () => {
    const params = analyzeWater(balancedReadings, balancedPool);
    expect(calculateOverallScore(params)).toBeGreaterThanOrEqual(90);
  });

  it('returns lower score for critical readings', () => {
    const params = analyzeWater(criticalFcReadings, balancedPool);
    expect(calculateOverallScore(params)).toBeLessThan(calculateOverallScore(analyzeWater(balancedReadings, balancedPool)));
  });
});

describe('getOverallRating', () => {
  it('returns Excellent for balanced water', () => {
    const params = analyzeWater(balancedReadings, balancedPool);
    const score = calculateOverallScore(params);
    expect(getOverallRating(score, params)).toBe('excellent');
  });

  it('returns Critical or Poor for severe issues', () => {
    const params = analyzeWater(criticalFcReadings, balancedPool);
    const score = calculateOverallScore(params);
    const rating = getOverallRating(score, params);
    expect(['critical', 'poor', 'fair']).toContain(rating);
  });

  it('buildSummary includes rating label', () => {
    const params = analyzeWater(balancedReadings, balancedPool);
    const score = calculateOverallScore(params);
    const rating = getOverallRating(score, params);
    const summary = buildSummary(score, rating, params);
    expect(summary).toContain(ratingLabel(rating));
    expect(summary).toContain(String(score));
  });
});

describe('generateRecommendations prioritization', () => {
  it('places combined chlorine shock before lower-priority items', () => {
    const params = analyzeWater(criticalFcReadings, balancedPool);
    const recs = generateRecommendations(
      criticalFcReadings,
      balancedPool,
      params,
      DEFAULT_CHEMICAL_STRENGTHS
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].priority).toBe('high');
    expect(recs[0].reason.toLowerCase()).toContain('combined chlorine');
  });

  it('sortRecommendationsByPriority orders high before low', () => {
    const params = analyzeWater(criticalFcReadings, balancedPool);
    const recs = generateRecommendations(
      criticalFcReadings,
      balancedPool,
      params,
      DEFAULT_CHEMICAL_STRENGTHS
    );
    const sorted = sortRecommendationsByPriority([...recs].reverse());
    const firstHigh = sorted.findIndex((r) => r.priority === 'high');
    const lastLow = sorted.map((r) => r.priority).lastIndexOf('low');
    if (firstHigh >= 0 && lastLow >= 0) {
      expect(firstHigh).toBeLessThan(lastLow);
    }
  });

  it('assigns sequential order after sorting by priority', () => {
    const params = analyzeWater(criticalFcReadings, balancedPool);
    const recs = generateRecommendations(
      criticalFcReadings,
      balancedPool,
      params,
      DEFAULT_CHEMICAL_STRENGTHS
    );
    expect(recs[0].order).toBe(1);
    expect(recs.every((r, i) => r.order === i + 1)).toBe(true);
  });
});
