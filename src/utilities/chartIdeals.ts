import { getParameterThresholdsForProfile } from '../chemistry/poolProfiles';
import type { ChartParameter } from '../hooks/useChartData';
import type { PoolProfileConfig } from '../models/types';

const CHART_PARAMETERS: ChartParameter[] = [
  'freeChlorine',
  'combinedChlorine',
  'ph',
  'totalAlkalinity',
  'calciumHardness',
  'cyanuricAcid',
  'salt',
  'temperature',
];

export function getChartIdealRanges(
  profile: PoolProfileConfig
): Record<ChartParameter, { min: number; max: number }> {
  const ranges = {} as Record<ChartParameter, { min: number; max: number }>;
  for (const key of CHART_PARAMETERS) {
    const thresholds = getParameterThresholdsForProfile(key, profile);
    ranges[key] = { min: thresholds.idealMin, max: thresholds.idealMax };
  }
  return ranges;
}
