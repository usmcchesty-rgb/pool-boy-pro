import type { OverallRating, ParameterLevel, WaterTest } from '../models/types';
import { formatRating } from './format';

export type CompareTrend = 'baseline' | 'improved' | 'worsened' | 'similar';

export interface CompareValue {
  testId: string;
  display: string;
  trend: CompareTrend;
  deltaLabel?: string;
}

export interface CompareRow {
  key: string;
  label: string;
  unit: string;
  values: CompareValue[];
}

export interface CompareSummary {
  testId: string;
  dateLabel: string;
  score: number | null;
  rating: OverallRating | null;
  ratingLabel: string;
  scoreTrend: CompareTrend;
  scoreDelta?: string;
  ratingTrend: CompareTrend;
}

const LEVEL_DISTANCE: Record<ParameterLevel, number> = {
  critical_low: 2,
  low: 1,
  ideal: 0,
  high: 1,
  critical_high: 2,
};

const RATING_RANK: Record<OverallRating, number> = {
  critical: 0,
  poor: 1,
  fair: 2,
  good: 3,
  excellent: 4,
};

const READING_ROWS: Array<{
  key: string;
  label: string;
  unit: string;
  parameter?: string;
  getValue: (test: WaterTest) => number;
  format: (value: number, test: WaterTest) => string;
}> = [
  {
    key: 'freeChlorine',
    label: 'Free Chlorine',
    unit: 'ppm',
    parameter: 'freeChlorine',
    getValue: (t) => t.readings.freeChlorine,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'combinedChlorine',
    label: 'Combined Chlorine',
    unit: 'ppm',
    parameter: 'combinedChlorine',
    getValue: (t) => t.readings.combinedChlorine,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'ph',
    label: 'pH',
    unit: '',
    parameter: 'ph',
    getValue: (t) => t.readings.ph,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'totalAlkalinity',
    label: 'Total Alkalinity',
    unit: 'ppm',
    parameter: 'totalAlkalinity',
    getValue: (t) => t.readings.totalAlkalinity,
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'calciumHardness',
    label: 'Calcium Hardness',
    unit: 'ppm',
    parameter: 'calciumHardness',
    getValue: (t) => t.readings.calciumHardness,
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'cyanuricAcid',
    label: 'Cyanuric Acid',
    unit: 'ppm',
    parameter: 'cyanuricAcid',
    getValue: (t) => t.readings.cyanuricAcid,
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'salt',
    label: 'Salt',
    unit: 'ppm',
    parameter: 'salt',
    getValue: (t) => t.readings.salt,
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '',
    parameter: 'temperature',
    getValue: (t) => t.readings.temperature,
    format: (v, t) => `${Math.round(v)}°${t.readings.temperatureUnit === 'celsius' ? 'C' : 'F'}`,
  },
];

function getParameterLevel(test: WaterTest, parameter: string): ParameterLevel | null {
  return test.analysis?.parameters.find((p) => p.parameter === parameter)?.level ?? null;
}

function levelTrend(baseline: ParameterLevel | null, current: ParameterLevel | null): CompareTrend {
  if (!baseline || !current) return 'similar';
  const baseDist = LEVEL_DISTANCE[baseline];
  const curDist = LEVEL_DISTANCE[current];
  if (curDist < baseDist) return 'improved';
  if (curDist > baseDist) return 'worsened';
  return 'similar';
}

function scoreTrend(baseline: number | null, current: number | null): CompareTrend {
  if (baseline == null || current == null) return 'similar';
  if (current > baseline + 2) return 'improved';
  if (current < baseline - 2) return 'worsened';
  return 'similar';
}

function ratingTrend(baseline: OverallRating | null, current: OverallRating | null): CompareTrend {
  if (!baseline || !current) return 'similar';
  const diff = RATING_RANK[current] - RATING_RANK[baseline];
  if (diff > 0) return 'improved';
  if (diff < 0) return 'worsened';
  return 'similar';
}

function formatDelta(baseline: number, current: number, unit: string): string | undefined {
  const delta = current - baseline;
  if (Math.abs(delta) < 0.05) return undefined;
  const sign = delta > 0 ? '+' : '';
  const formatted = Number.isInteger(delta) ? `${sign}${delta}` : `${sign}${delta.toFixed(1)}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Sort selected tests oldest-first for baseline comparison */
export function sortTestsForCompare(tests: WaterTest[]): WaterTest[] {
  return [...tests].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function buildCompareSummaries(tests: WaterTest[], dateLabel: (iso: string) => string): CompareSummary[] {
  const ordered = sortTestsForCompare(tests);
  const baseline = ordered[0];

  return ordered.map((test, index) => {
    const score = test.analysis?.overallScore ?? null;
    const rating = test.analysis?.overallRating ?? null;
    const baseScore = baseline.analysis?.overallScore ?? null;
    const baseRating = baseline.analysis?.overallRating ?? null;
    const isBaseline = index === 0;

    return {
      testId: test.id,
      dateLabel: dateLabel(test.date),
      score,
      rating,
      ratingLabel: rating ? formatRating(rating) : '—',
      scoreTrend: isBaseline ? 'baseline' : scoreTrend(baseScore, score),
      scoreDelta:
        !isBaseline && score != null && baseScore != null
          ? formatDelta(baseScore, score, 'pts')
          : undefined,
      ratingTrend: isBaseline ? 'baseline' : ratingTrend(baseRating, rating),
    };
  });
}

export function buildCompareRows(tests: WaterTest[]): CompareRow[] {
  const ordered = sortTestsForCompare(tests);
  const baseline = ordered[0];

  const scoreRow: CompareRow = {
    key: 'overallScore',
    label: 'Water Health Score',
    unit: '/100',
    values: ordered.map((test, index) => {
      const score = test.analysis?.overallScore ?? null;
      const baseScore = baseline.analysis?.overallScore ?? null;
      const isBaseline = index === 0;
      return {
        testId: test.id,
        display: score != null ? `${score}/100` : '—',
        trend: isBaseline ? 'baseline' : scoreTrend(baseScore, score),
        deltaLabel:
          !isBaseline && score != null && baseScore != null
            ? formatDelta(baseScore, score, 'pts')
            : undefined,
      };
    }),
  };

  const ratingRow: CompareRow = {
    key: 'overallRating',
    label: 'Overall Rating',
    unit: '',
    values: ordered.map((test, index) => {
      const rating = test.analysis?.overallRating ?? null;
      const baseRating = baseline.analysis?.overallRating ?? null;
      const isBaseline = index === 0;
      return {
        testId: test.id,
        display: rating ? formatRating(rating) : '—',
        trend: isBaseline ? 'baseline' : ratingTrend(baseRating, rating),
      };
    }),
  };

  const readingRows = READING_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    unit: row.unit,
    values: ordered.map((test, index) => {
      const value = row.getValue(test);
      const baseValue = row.getValue(baseline);
      const isBaseline = index === 0;
      const baseLevel = row.parameter ? getParameterLevel(baseline, row.parameter) : null;
      const curLevel = row.parameter ? getParameterLevel(test, row.parameter) : null;

      return {
        testId: test.id,
        display: row.format(value, test),
        trend: isBaseline ? 'baseline' : levelTrend(baseLevel, curLevel),
        deltaLabel: !isBaseline ? formatDelta(baseValue, value, row.unit) : undefined,
      };
    }),
  }));

  return [scoreRow, ratingRow, ...readingRows];
}

export function compareTrendLabel(trend: CompareTrend): string {
  switch (trend) {
    case 'improved':
      return 'Improved';
    case 'worsened':
      return 'Worsened';
    case 'similar':
      return 'Similar';
    case 'baseline':
      return 'Baseline';
  }
}
