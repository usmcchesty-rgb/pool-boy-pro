import type { PoolProfileConfig } from '../models/types';
import {
  DEFAULT_POOL_PROFILE,
  POOL_ENVIRONMENT_OPTIONS,
  POOL_SANITIZER_OPTIONS,
  POOL_SURFACE_OPTIONS,
  buildChemistryProfile,
  formatIdealRange,
  type AnalysisParameterKey,
  type ParameterThresholds,
  type TargetRangeDisplay,
} from './poolProfiles';

export type ProfileFactor = 'surface' | 'sanitizer' | 'environment' | 'spa';

export interface ParameterExplanation {
  whatItMeans: string;
  whyItMatters: string;
}

export interface TargetRangeDetail extends TargetRangeDisplay {
  whatItMeans: string;
  whyItMatters: string;
  profileNote: string | null;
  changedBy: ProfileFactor[];
}

const FACTOR_LABELS: Record<ProfileFactor, string> = {
  surface: 'Surface',
  sanitizer: 'Sanitizer',
  environment: 'Environment',
  spa: 'Spa mode',
};

const PARAMETER_EXPLANATIONS: Record<AnalysisParameterKey, ParameterExplanation> = {
  freeChlorine: {
    whatItMeans: 'The active sanitizer in your water that kills germs and algae.',
    whyItMatters: 'Too little leaves water unsafe; too much can irritate skin and eyes.',
  },
  combinedChlorine: {
    whatItMeans: 'Used-up chlorine bound to contaminants — often called “chloramines.”',
    whyItMatters: 'High levels cause odor, irritation, and mean your sanitizer is less effective.',
  },
  ph: {
    whatItMeans: 'How acidic or basic the water is, on a 0–14 scale.',
    whyItMatters: 'Proper pH keeps swimmers comfortable and helps chlorine work efficiently.',
  },
  totalAlkalinity: {
    whatItMeans: 'The water’s ability to resist pH swings — a stability buffer.',
    whyItMatters: 'Stable alkalinity prevents pH from drifting after rain, bather load, or chemicals.',
  },
  calciumHardness: {
    whatItMeans: 'How much dissolved calcium is in the water.',
    whyItMatters: 'Protects pool surfaces and equipment; too low etches plaster, too high causes scale.',
  },
  cyanuricAcid: {
    whatItMeans: 'Stabilizer (CYA) that shields chlorine from sunlight breakdown.',
    whyItMatters: 'Outdoor pools need some CYA; too much locks up chlorine and slows sanitizing.',
  },
  salt: {
    whatItMeans: 'Dissolved salt level that feeds a salt chlorine generator (SWG).',
    whyItMatters: 'Salt cells only produce chlorine efficiently within the correct salt range.',
  },
  temperature: {
    whatItMeans: 'How warm the water is during your test.',
    whyItMatters: 'Warmer water uses up sanitizer faster and affects swimmer comfort.',
  },
};

const PROFILE_NOTES: Partial<
  Record<AnalysisParameterKey, Partial<Record<ProfileFactor, string>>>
> = {
  calciumHardness: {
    surface:
      'Vinyl and fiberglass surfaces use lower calcium targets to reduce scale on softer finishes.',
  },
  cyanuricAcid: {
    environment: 'Indoor pools see little UV, so less stabilizer is needed than outdoors.',
    sanitizer: 'Bromine pools typically need little to no cyanuric acid.',
    spa: 'Spas use lower stabilizer because high CYA is harder to manage in hot water.',
  },
  freeChlorine: {
    sanitizer: 'Bromine pools run at higher sanitizer levels than chlorine or salt pools.',
    environment: 'Indoor pools often need slightly less chlorine because UV does not burn it off.',
    spa: 'Spa targets balance effective sanitizing with hot-water bather comfort.',
  },
  salt: {
    sanitizer:
      'Salt targets apply to saltwater generator pools. Other sanitizers show salt as informational only.',
  },
  temperature: {
    spa: 'Spa mode uses hot-tub temperature targets (warmer than a swimming pool).',
  },
};

function thresholdsEqual(a: ParameterThresholds, b: ParameterThresholds): boolean {
  return (
    a.criticalLowMax === b.criticalLowMax &&
    a.idealMin === b.idealMin &&
    a.idealMax === b.idealMax &&
    a.criticalHighMin === b.criticalHighMin
  );
}

function factorAffectsParameter(
  parameter: AnalysisParameterKey,
  factor: ProfileFactor,
  selection: PoolProfileConfig
): boolean {
  const baseline = buildChemistryProfile(DEFAULT_POOL_PROFILE);
  const partial = { ...DEFAULT_POOL_PROFILE };
  switch (factor) {
    case 'surface':
      partial.surface = selection.surface;
      break;
    case 'sanitizer':
      partial.sanitizer = selection.sanitizer;
      break;
    case 'environment':
      partial.environment = selection.environment;
      break;
    case 'spa':
      partial.spaMode = selection.spaMode;
      break;
  }
  const withFactor = buildChemistryProfile(partial);
  return !thresholdsEqual(baseline.thresholds[parameter], withFactor.thresholds[parameter]);
}

function getChangedFactors(
  parameter: AnalysisParameterKey,
  selection: PoolProfileConfig
): ProfileFactor[] {
  const factors: ProfileFactor[] = [];
  if (selection.surface !== DEFAULT_POOL_PROFILE.surface && factorAffectsParameter(parameter, 'surface', selection)) {
    factors.push('surface');
  }
  if (selection.sanitizer !== DEFAULT_POOL_PROFILE.sanitizer && factorAffectsParameter(parameter, 'sanitizer', selection)) {
    factors.push('sanitizer');
  }
  if (selection.environment !== DEFAULT_POOL_PROFILE.environment && factorAffectsParameter(parameter, 'environment', selection)) {
    factors.push('environment');
  }
  if (selection.spaMode !== DEFAULT_POOL_PROFILE.spaMode && factorAffectsParameter(parameter, 'spa', selection)) {
    factors.push('spa');
  }
  return factors;
}

function buildProfileNote(parameter: AnalysisParameterKey, changedBy: ProfileFactor[]): string | null {
  if (changedBy.length === 0) return null;
  const notes = changedBy
    .map((factor) => PROFILE_NOTES[parameter]?.[factor])
    .filter((note): note is string => Boolean(note));
  if (notes.length > 0) return notes.join(' ');
  return `Adjusted for your ${changedBy.map((f) => FACTOR_LABELS[f].toLowerCase()).join(' and ')} settings.`;
}

export function getProfileFactorLabel(factor: ProfileFactor): string {
  return FACTOR_LABELS[factor];
}

export function formatProfileSummary(profile: PoolProfileConfig): string {
  const surface = POOL_SURFACE_OPTIONS.find((o) => o.value === profile.surface)?.label ?? profile.surface;
  const sanitizer = POOL_SANITIZER_OPTIONS.find((o) => o.value === profile.sanitizer)?.label ?? profile.sanitizer;
  const environment = POOL_ENVIRONMENT_OPTIONS.find((o) => o.value === profile.environment)?.label ?? profile.environment;
  const type = profile.spaMode ? 'Spa / Hot Tub' : 'Swimming Pool';
  return `${environment} · ${sanitizer} · ${surface} · ${type}`;
}

export function getProfileSummaryParts(profile: PoolProfileConfig): Array<{ label: string; value: string }> {
  return [
    { label: 'Environment', value: POOL_ENVIRONMENT_OPTIONS.find((o) => o.value === profile.environment)?.label ?? profile.environment },
    { label: 'Sanitizer', value: POOL_SANITIZER_OPTIONS.find((o) => o.value === profile.sanitizer)?.label ?? profile.sanitizer },
    { label: 'Surface', value: POOL_SURFACE_OPTIONS.find((o) => o.value === profile.surface)?.label ?? profile.surface },
    { label: 'Type', value: profile.spaMode ? 'Spa / Hot Tub' : 'Swimming Pool' },
  ];
}

/** Enriched target ranges for Settings display — read-only, no formula changes */
export function getTargetRangeDetails(profile: PoolProfileConfig): TargetRangeDetail[] {
  const chemistry = buildChemistryProfile(profile);
  const labels: Record<AnalysisParameterKey, { label: string; unit: string }> = {
    freeChlorine: { label: 'Free Chlorine', unit: 'ppm' },
    combinedChlorine: { label: 'Combined Chlorine', unit: 'ppm' },
    ph: { label: 'pH', unit: '' },
    totalAlkalinity: { label: 'Total Alkalinity', unit: 'ppm' },
    calciumHardness: { label: 'Calcium Hardness', unit: 'ppm' },
    cyanuricAcid: { label: 'Cyanuric Acid', unit: 'ppm' },
    salt: { label: 'Salt', unit: 'ppm' },
    temperature: { label: 'Water Temperature', unit: '°F' },
  };

  return (Object.keys(labels) as AnalysisParameterKey[]).map((parameter) => {
    const changedBy = getChangedFactors(parameter, profile);
    const explanation = PARAMETER_EXPLANATIONS[parameter];
    const thresholds = chemistry.thresholds[parameter];
    const target =
      chemistry.targets[parameter as keyof typeof chemistry.targets] ??
      (thresholds.idealMin + thresholds.idealMax) / 2;

    return {
      parameter,
      label: labels[parameter].label,
      unit: labels[parameter].unit,
      thresholds,
      target,
      whatItMeans: explanation.whatItMeans,
      whyItMatters: explanation.whyItMatters,
      profileNote: buildProfileNote(parameter, changedBy),
      changedBy,
    };
  });
}

export function formatIdealRangeDisplay(thresholds: ParameterThresholds, unit: string): string {
  return formatIdealRange(thresholds, unit);
}

export function formatDosingTarget(parameter: AnalysisParameterKey, target: number, unit: string): string | null {
  if (parameter === 'combinedChlorine') return '0 ppm (none detected)';
  if (parameter === 'temperature') return null;
  return `${target}${unit ? ` ${unit}` : ''}`;
}
