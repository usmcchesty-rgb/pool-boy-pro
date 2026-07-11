import { useMemo } from 'react';
import type { ChartTimeRange, WaterTest } from '../models/types';

export type ChartParameter =
  | 'freeChlorine'
  | 'combinedChlorine'
  | 'ph'
  | 'totalAlkalinity'
  | 'calciumHardness'
  | 'cyanuricAcid'
  | 'salt'
  | 'temperature';

export const CHART_PARAMETERS: { key: ChartParameter; label: string; unit: string; color: string }[] = [
  { key: 'freeChlorine', label: 'Free Chlorine', unit: 'ppm', color: '#2A9D8F' },
  { key: 'combinedChlorine', label: 'Combined Chlorine', unit: 'ppm', color: '#E76F51' },
  { key: 'ph', label: 'pH', unit: '', color: '#457B9D' },
  { key: 'totalAlkalinity', label: 'Total Alkalinity', unit: 'ppm', color: '#6A994E' },
  { key: 'calciumHardness', label: 'Calcium Hardness', unit: 'ppm', color: '#BC6C25' },
  { key: 'cyanuricAcid', label: 'Cyanuric Acid', unit: 'ppm', color: '#7B68EE' },
  { key: 'salt', label: 'Salt', unit: 'ppm', color: '#48CAE4' },
  { key: 'temperature', label: 'Temperature', unit: '°F', color: '#F4A261' },
];

function getRangeCutoff(range: ChartTimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 86400000);
    case '30d':
      return new Date(now.getTime() - 30 * 86400000);
    case '90d':
      return new Date(now.getTime() - 90 * 86400000);
    case '1y':
      return new Date(now.getTime() - 365 * 86400000);
    case 'all':
      return null;
  }
}

export interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

export function useChartData(
  tests: WaterTest[],
  parameter: ChartParameter,
  range: ChartTimeRange
): ChartDataPoint[] {
  return useMemo(() => {
    const cutoff = getRangeCutoff(range);
    const sorted = [...tests]
      .filter((t) => !cutoff || new Date(t.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map((t) => {
      let value: number;
      if (parameter === 'temperature') {
        value =
          t.readings.temperatureUnit === 'celsius'
            ? (t.readings.temperature * 9) / 5 + 32
            : t.readings.temperature;
      } else {
        value = t.readings[parameter];
      }
      return {
        date: t.date,
        label: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value,
      };
    });
  }, [tests, parameter, range]);
}
