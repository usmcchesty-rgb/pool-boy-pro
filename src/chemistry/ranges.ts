import type { PoolInfo } from '../models/types';
import type { AnalysisParameterKey, ParameterThresholds, PoolProfileConfig } from './poolProfiles';
import { getParameterThresholdsForProfile } from './poolProfiles';

export type { PoolProfileConfig, ChemistryProfile, DosingTargets, ParameterThresholds, AnalysisParameterKey } from './poolProfiles';
export type { PoolSurface, PoolEnvironment } from '../models/types';
export {
  DEFAULT_POOL_PROFILE,
  POOL_SURFACE_OPTIONS,
  POOL_ENVIRONMENT_OPTIONS,
  POOL_SANITIZER_OPTIONS,
  resolvePoolProfile,
  resolveProfileFromPool,
  buildChemistryProfile,
  getChemistryProfileFromPool,
  getParameterThresholdsForProfile,
  getDosingTargets,
  getActiveTargetRanges,
  formatIdealRange,
} from './poolProfiles';

/** Internal analysis context — resolved profile for threshold lookup */
export interface PoolAnalysisContext {
  profile: PoolProfileConfig;
}

/** Resolve effective thresholds for a parameter given pool or profile context */
export function getParameterThresholds(
  parameter: AnalysisParameterKey,
  context: PoolInfo | PoolProfileConfig | PoolAnalysisContext
): ParameterThresholds {
  if ('profile' in context && context.profile) {
    return getParameterThresholdsForProfile(parameter, context.profile);
  }
  if ('volume' in context) {
    return getParameterThresholdsForProfile(parameter, context as PoolInfo);
  }
  return getParameterThresholdsForProfile(parameter, context as PoolProfileConfig);
}

/** All parameter keys analyzed for every test */
export const ANALYSIS_PARAMETER_KEYS: AnalysisParameterKey[] = [
  'freeChlorine',
  'combinedChlorine',
  'ph',
  'totalAlkalinity',
  'calciumHardness',
  'cyanuricAcid',
  'salt',
  'temperature',
];

/** Scoring weights per parameter (must sum to 100 for clarity) */
export const PARAMETER_WEIGHTS: Record<AnalysisParameterKey, number> = {
  freeChlorine: 20,
  combinedChlorine: 15,
  ph: 20,
  totalAlkalinity: 15,
  calciumHardness: 10,
  cyanuricAcid: 10,
  salt: 5,
  temperature: 5,
};

/** Treatment priority base scores for recommendation ordering (higher = more urgent) */
export const RECOMMENDATION_PRIORITY: Record<string, number> = {
  combinedChlorine_shock: 100,
  freeChlorine_critical: 95,
  combinedChlorine_high: 90,
  ph_critical: 88,
  freeChlorine_low: 85,
  ph_low: 80,
  ph_high: 78,
  totalAlkalinity_critical: 75,
  totalAlkalinity_low: 70,
  totalAlkalinity_high: 68,
  freeChlorine_high: 65,
  calciumHardness_low: 55,
  calciumHardness_high: 50,
  cyanuricAcid_low: 45,
  cyanuricAcid_high: 40,
  salt_low: 35,
  salt_high: 30,
};
