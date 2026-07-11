import type { PoolInfo, PoolProfileConfig, PoolSurface, PoolEnvironment, SanitizerType } from '../models/types';

/**
 * Five-band thresholds for a water parameter.
 * Bands: critical_low → low → ideal → high → critical_high
 */
export interface ParameterThresholds {
  criticalLowMax: number;
  idealMin: number;
  idealMax: number;
  criticalHighMin: number;
}

export type AnalysisParameterKey =
  | 'freeChlorine'
  | 'combinedChlorine'
  | 'ph'
  | 'totalAlkalinity'
  | 'calciumHardness'
  | 'cyanuricAcid'
  | 'salt'
  | 'temperature';

/** Re-export app profile types for chemistry module consumers */
export type { PoolProfileConfig, PoolSurface, PoolEnvironment };

/** Resolved chemistry configuration used by analysis and recommendations */
export interface ChemistryProfile {
  /** Stable key for built-in combinations; custom profiles use their own id later */
  profileKey: string;
  selection: PoolProfileConfig;
  thresholds: Record<AnalysisParameterKey, ParameterThresholds>;
  /** Dosing midpoints derived from ideal bands (or explicit overrides) */
  targets: DosingTargets;
}

export interface DosingTargets {
  freeChlorine: number;
  combinedChlorine: number;
  ph: number;
  totalAlkalinity: number;
  calciumHardness: number;
  cyanuricAcid: number;
  salt: number;
}

export const DEFAULT_POOL_PROFILE: PoolProfileConfig = {
  surface: 'plaster',
  sanitizer: 'salt',
  environment: 'outdoor',
  spaMode: false,
};

export const POOL_SURFACE_OPTIONS: { value: PoolSurface; label: string }[] = [
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'plaster', label: 'Plaster' },
  { value: 'pebble', label: 'Pebble' },
];

export const POOL_ENVIRONMENT_OPTIONS: { value: PoolEnvironment; label: string }[] = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
];

export const POOL_SANITIZER_OPTIONS: { value: SanitizerType; label: string }[] = [
  { value: 'salt', label: 'Saltwater Generator (SWG)' },
  { value: 'chlorine', label: 'Traditional Chlorine' },
  { value: 'bromine', label: 'Bromine' },
];

/** Base thresholds for outdoor plaster pool — all profile layers merge onto this */
const BASE_THRESHOLDS: Record<AnalysisParameterKey, ParameterThresholds> = {
  freeChlorine: {
    criticalLowMax: 0,
    idealMin: 1,
    idealMax: 3,
    criticalHighMin: 5,
  },
  combinedChlorine: {
    criticalLowMax: -1,
    idealMin: 0,
    idealMax: 0.5,
    criticalHighMin: 1,
  },
  ph: {
    criticalLowMax: 7.0,
    idealMin: 7.2,
    idealMax: 7.6,
    criticalHighMin: 7.8,
  },
  totalAlkalinity: {
    criticalLowMax: 60,
    idealMin: 80,
    idealMax: 120,
    criticalHighMin: 150,
  },
  calciumHardness: {
    criticalLowMax: 100,
    idealMin: 200,
    idealMax: 400,
    criticalHighMin: 500,
  },
  cyanuricAcid: {
    criticalLowMax: 20,
    idealMin: 30,
    idealMax: 50,
    criticalHighMin: 80,
  },
  salt: {
    criticalLowMax: 2500,
    idealMin: 2700,
    idealMax: 3400,
    criticalHighMin: 4000,
  },
  temperature: {
    criticalLowMax: 60,
    idealMin: 78,
    idealMax: 86,
    criticalHighMin: 92,
  },
};

const NON_SALT_SALT_THRESHOLDS: ParameterThresholds = {
  criticalLowMax: -1,
  idealMin: 0,
  idealMax: 500,
  criticalHighMin: 1000,
};

type ThresholdOverrides = Partial<Record<AnalysisParameterKey, Partial<ParameterThresholds>>>;

const SURFACE_OVERRIDES: Record<PoolSurface, ThresholdOverrides> = {
  vinyl: {
    calciumHardness: { criticalLowMax: 80, idealMin: 150, idealMax: 250, criticalHighMin: 350 },
  },
  fiberglass: {
    calciumHardness: { criticalLowMax: 80, idealMin: 150, idealMax: 250, criticalHighMin: 350 },
  },
  plaster: {},
  pebble: {
    calciumHardness: { idealMin: 200, idealMax: 350, criticalHighMin: 450 },
  },
};

const ENVIRONMENT_OVERRIDES: Record<PoolEnvironment, ThresholdOverrides> = {
  outdoor: {},
  indoor: {
    cyanuricAcid: { criticalLowMax: 0, idealMin: 0, idealMax: 30, criticalHighMin: 50 },
    freeChlorine: { idealMin: 1, idealMax: 2.5, criticalHighMin: 4 },
  },
};

const SANITIZER_OVERRIDES: Record<SanitizerType, ThresholdOverrides> = {
  salt: {
    freeChlorine: { idealMin: 1, idealMax: 3, criticalHighMin: 5 },
  },
  chlorine: {},
  bromine: {
    freeChlorine: { criticalLowMax: 1, idealMin: 3, idealMax: 5, criticalHighMin: 8 },
    cyanuricAcid: { criticalLowMax: 0, idealMin: 0, idealMax: 20, criticalHighMin: 40 },
  },
};

const SPA_OVERRIDES: ThresholdOverrides = {
  cyanuricAcid: { idealMin: 0, idealMax: 30, criticalHighMin: 50 },
  temperature: { idealMin: 98, idealMax: 104, criticalHighMin: 106 },
  freeChlorine: { idealMin: 1, idealMax: 3, criticalHighMin: 5 },
};

/** Explicit dosing targets when midpoint of ideal band is not preferred */
const TARGET_OVERRIDES: Partial<Record<AnalysisParameterKey, number>> = {
  freeChlorine: 2.5,
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
};

function mergeThresholds(
  base: ParameterThresholds,
  ...layers: (Partial<ParameterThresholds> | undefined)[]
): ParameterThresholds {
  return layers.reduce<ParameterThresholds>(
    (acc, layer) => (layer ? { ...acc, ...layer } : acc),
    { ...base }
  );
}

function midpoint(thresholds: ParameterThresholds): number {
  return (thresholds.idealMin + thresholds.idealMax) / 2;
}

function buildProfileKey(selection: PoolProfileConfig): string {
  return [
    selection.surface,
    selection.sanitizer,
    selection.environment,
    selection.spaMode ? 'spa' : 'pool',
  ].join('_');
}

export function getProfileKey(selection: PoolProfileConfig): string {
  return buildProfileKey(selection);
}

/** Resolve a complete profile from partial input and legacy pool metadata */
export function resolvePoolProfile(
  selection: Partial<PoolProfileConfig>,
  legacy?: Pick<PoolInfo, 'poolType' | 'sanitizerType'>
): PoolProfileConfig {
  const spaFromLegacy = legacy?.poolType === 'spa';
  return {
    surface: selection.surface ?? DEFAULT_POOL_PROFILE.surface,
    sanitizer: selection.sanitizer ?? legacy?.sanitizerType ?? DEFAULT_POOL_PROFILE.sanitizer,
    environment: selection.environment ?? DEFAULT_POOL_PROFILE.environment,
    spaMode: selection.spaMode ?? spaFromLegacy ?? DEFAULT_POOL_PROFILE.spaMode,
  };
}

/** Derive profile from a test pool snapshot (supports legacy tests without profile field) */
export function resolveProfileFromPool(pool: PoolInfo): PoolProfileConfig {
  if (pool.profile) {
    return resolvePoolProfile(pool.profile, pool);
  }
  return resolvePoolProfile({}, pool);
}

/** Build full chemistry profile from user selection — entry point for analysis engine */
export function buildChemistryProfile(selection: PoolProfileConfig): ChemistryProfile {
  const layers: ThresholdOverrides[] = [
    SURFACE_OVERRIDES[selection.surface],
    ENVIRONMENT_OVERRIDES[selection.environment],
    SANITIZER_OVERRIDES[selection.sanitizer],
  ];
  if (selection.spaMode) {
    layers.push(SPA_OVERRIDES);
  }

  const thresholds = {} as Record<AnalysisParameterKey, ParameterThresholds>;
  for (const key of Object.keys(BASE_THRESHOLDS) as AnalysisParameterKey[]) {
    let base = BASE_THRESHOLDS[key];
    if (key === 'salt' && selection.sanitizer !== 'salt') {
      thresholds[key] = { ...NON_SALT_SALT_THRESHOLDS };
      continue;
    }
    const paramLayers = layers.map((layer) => layer[key]);
    thresholds[key] = mergeThresholds(base, ...paramLayers);
  }

  const targets: DosingTargets = {
    freeChlorine: TARGET_OVERRIDES.freeChlorine ?? midpoint(thresholds.freeChlorine),
    combinedChlorine: 0,
    ph: TARGET_OVERRIDES.ph ?? midpoint(thresholds.ph),
    totalAlkalinity: TARGET_OVERRIDES.totalAlkalinity ?? midpoint(thresholds.totalAlkalinity),
    calciumHardness: TARGET_OVERRIDES.calciumHardness ?? midpoint(thresholds.calciumHardness),
    cyanuricAcid: TARGET_OVERRIDES.cyanuricAcid ?? midpoint(thresholds.cyanuricAcid),
    salt: TARGET_OVERRIDES.salt ?? midpoint(thresholds.salt),
  };

  return {
    profileKey: buildProfileKey(selection),
    selection,
    thresholds,
    targets,
  };
}

export function getChemistryProfileFromPool(pool: PoolInfo): ChemistryProfile {
  return buildChemistryProfile(resolveProfileFromPool(pool));
}

export function getParameterThresholdsForProfile(
  parameter: AnalysisParameterKey,
  profile: PoolProfileConfig | ChemistryProfile | PoolInfo
): ParameterThresholds {
  if ('profileKey' in profile && profile.thresholds) {
    return profile.thresholds[parameter];
  }
  if ('volume' in profile) {
    return getChemistryProfileFromPool(profile).thresholds[parameter];
  }
  return buildChemistryProfile(profile as PoolProfileConfig).thresholds[parameter];
}

export function getDosingTargets(
  profile: PoolProfileConfig | ChemistryProfile | PoolInfo
): DosingTargets {
  if ('profileKey' in profile && profile.targets) {
    return profile.targets;
  }
  if ('volume' in profile) {
    return getChemistryProfileFromPool(profile).targets;
  }
  return buildChemistryProfile(profile as PoolProfileConfig).targets;
}

export interface TargetRangeDisplay {
  parameter: AnalysisParameterKey;
  label: string;
  unit: string;
  thresholds: ParameterThresholds;
  target: number;
}

const DISPLAY_LABELS: Record<AnalysisParameterKey, { label: string; unit: string }> = {
  freeChlorine: { label: 'Free Chlorine', unit: 'ppm' },
  combinedChlorine: { label: 'Combined Chlorine', unit: 'ppm' },
  ph: { label: 'pH', unit: '' },
  totalAlkalinity: { label: 'Total Alkalinity', unit: 'ppm' },
  calciumHardness: { label: 'Calcium Hardness', unit: 'ppm' },
  cyanuricAcid: { label: 'Cyanuric Acid', unit: 'ppm' },
  salt: { label: 'Salt', unit: 'ppm' },
  temperature: { label: 'Water Temperature', unit: '°F' },
};

/** Human-readable active ranges for Settings display */
export function getActiveTargetRanges(profile: PoolProfileConfig): TargetRangeDisplay[] {
  const chemistry = buildChemistryProfile(profile);
  return (Object.keys(DISPLAY_LABELS) as AnalysisParameterKey[]).map((parameter) => ({
    parameter,
    label: DISPLAY_LABELS[parameter].label,
    unit: DISPLAY_LABELS[parameter].unit,
    thresholds: chemistry.thresholds[parameter],
    target: chemistry.targets[parameter as keyof DosingTargets] ?? midpoint(chemistry.thresholds[parameter]),
  }));
}

export function formatIdealRange(thresholds: ParameterThresholds, unit: string): string {
  const suffix = unit ? ` ${unit}` : '';
  return `${thresholds.idealMin}–${thresholds.idealMax}${suffix}`;
}
