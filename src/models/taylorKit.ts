import type { AppSettings, SanitizerType, TaylorEntryMode, TemperatureUnit } from './types';

/** FAS-DPD sample sizes supported by the Taylor K-2006-SALT kit */
export type TaylorSampleSize = 10 | 25;

export type { TaylorEntryMode };

/** Raw kit inputs collected during the New Test workflow */
export interface TaylorTestInputs {
  sampleSizeMl: TaylorSampleSize;
  fcDropCount?: number;
  ccDropCount?: number;
  ph?: number;
  acidDemand?: number;
  baseDemand?: number;
  totalAlkalinityMode: TaylorEntryMode;
  totalAlkalinityDrops?: number;
  totalAlkalinityPpm?: number;
  calciumHardnessMode: TaylorEntryMode;
  calciumHardnessDrops?: number;
  calciumHardnessPpm?: number;
  cyanuricAcid?: number;
  salt?: number;
  saltSkipped: boolean;
  /** Combined chlorine sample stayed clear after R-0003 — CC is 0 ppm */
  ccSampleStayedClear: boolean;
  temperature?: number;
  temperatureUnit: TemperatureUnit;
}

export function isSaltSanitizer(sanitizerType: SanitizerType): boolean {
  return sanitizerType === 'salt';
}

export function defaultTaylorInputs(settings: AppSettings): TaylorTestInputs {
  return {
    sampleSizeMl: settings.preferredFasDpdSampleSize,
    fcDropCount: 0,
    ccDropCount: 0,
    ph: 7.4,
    totalAlkalinityMode: settings.preferredTaEntryMode,
    totalAlkalinityDrops: 0,
    totalAlkalinityPpm: 100,
    calciumHardnessMode: settings.preferredChEntryMode,
    calciumHardnessDrops: 0,
    calciumHardnessPpm: 250,
    cyanuricAcid: 40,
    salt: 3200,
    saltSkipped: false,
    ccSampleStayedClear: false,
    temperature: 82,
    temperatureUnit: settings.preferredTemperatureUnit,
  };
}

export type TaylorTestStep =
  | 'pool'
  | 'freeChlorine'
  | 'combinedChlorine'
  | 'ph'
  | 'totalAlkalinity'
  | 'calciumHardness'
  | 'cyanuricAcid'
  | 'salt'
  | 'review';

export const TAYLOR_TEST_STEPS: { id: TaylorTestStep; label: string; description: string }[] = [
  {
    id: 'pool',
    label: 'Pool Info',
    description: 'Pool volume, type, sanitizer, and water temperature.',
  },
  {
    id: 'freeChlorine',
    label: 'Free Chlorine',
    description: 'FAS-DPD titration with R-0871 — sample size and drop count.',
  },
  {
    id: 'combinedChlorine',
    label: 'Combined Cl',
    description: 'After FC, add R-0003 and continue titration for combined chlorine.',
  },
  {
    id: 'ph',
    label: 'pH',
    description: 'Phenol red reading plus optional acid or base demand.',
  },
  {
    id: 'totalAlkalinity',
    label: 'Alkalinity',
    description: 'Total alkalinity from R-0009 drops or direct ppm entry.',
  },
  {
    id: 'calciumHardness',
    label: 'Hardness',
    description: 'Calcium hardness from R-0012 drops or direct ppm entry.',
  },
  {
    id: 'cyanuricAcid',
    label: 'CYA',
    description: 'Cyanuric acid turbidity test result.',
  },
  {
    id: 'salt',
    label: 'Salt',
    description: 'Salt titration result from the K-2006-SALT kit.',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Confirm calculated readings and save your test.',
  },
];

export const TAYLOR_STEP_ORDER: TaylorTestStep[] = TAYLOR_TEST_STEPS.map((s) => s.id);
