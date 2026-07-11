import type { ChemicalStrengths } from '../models/types';
import type { CalcGuidanceType } from './calcGuidance';

export interface StrengthFieldMeta {
  key: keyof ChemicalStrengths;
  label: string;
  hint: string;
  typicalMin: number;
  typicalMax: number;
  formulaReference: number;
}

export const STRENGTH_FIELD_META: StrengthFieldMeta[] = [
  {
    key: 'liquidChlorine',
    label: 'Liquid Chlorine (%)',
    hint: 'Sodium hypochlorite on product label. Common: 10–12.5%.',
    typicalMin: 5,
    typicalMax: 15,
    formulaReference: 12.5,
  },
  {
    key: 'householdBleach',
    label: 'Household Bleach (%)',
    hint: 'Unscented bleach sodium hypochlorite. Common: 6–8%.',
    typicalMin: 3,
    typicalMax: 10,
    formulaReference: 12.5,
  },
  {
    key: 'muriaticAcid',
    label: 'Muriatic Acid (%)',
    hint: 'Hydrochloric acid concentration. Common: 31.45%.',
    typicalMin: 20,
    typicalMax: 35,
    formulaReference: 31.45,
  },
  {
    key: 'dryAcid',
    label: 'Dry Acid (%)',
    hint: 'Sodium bisulfate active ingredient. Common: 93–95%.',
    typicalMin: 80,
    typicalMax: 100,
    formulaReference: 93.5,
  },
  {
    key: 'calciumChloride',
    label: 'Calcium Chloride Purity (%)',
    hint: 'Dihydrate product purity. Common: 77–83%.',
    typicalMin: 60,
    typicalMax: 100,
    formulaReference: 100,
  },
  {
    key: 'salt',
    label: 'Pool Salt Purity (%)',
    hint: 'Sodium chloride purity. Common: 99–100%.',
    typicalMin: 95,
    typicalMax: 100,
    formulaReference: 100,
  },
  {
    key: 'bakingSoda',
    label: 'Baking Soda (%)',
    hint: 'Sodium bicarbonate purity. Usually 100%.',
    typicalMin: 95,
    typicalMax: 100,
    formulaReference: 100,
  },
  {
    key: 'sodaAsh',
    label: 'Soda Ash (%)',
    hint: 'Sodium carbonate purity. Usually 100%.',
    typicalMin: 95,
    typicalMax: 100,
    formulaReference: 100,
  },
  {
    key: 'cyanuricAcid',
    label: 'CYA / Stabilizer (%)',
    hint: 'Cyanuric acid product purity. Usually 100%.',
    typicalMin: 95,
    typicalMax: 100,
    formulaReference: 100,
  },
];

const META_BY_KEY = Object.fromEntries(
  STRENGTH_FIELD_META.map((m) => [m.key, m])
) as Record<keyof ChemicalStrengths, StrengthFieldMeta>;

export function getStrengthKeyForCalcType(
  calcType: CalcGuidanceType
): keyof ChemicalStrengths | null {
  const map: Record<CalcGuidanceType, keyof ChemicalStrengths | null> = {
    liquidChlorine: 'liquidChlorine',
    householdBleach: 'householdBleach',
    bakingSoda: 'bakingSoda',
    sodaAsh: 'sodaAsh',
    muriaticAcidPh: 'muriaticAcid',
    muriaticAcidTa: 'muriaticAcid',
    dryAcid: 'dryAcid',
    calciumChloride: 'calciumChloride',
    cyanuricAcid: 'cyanuricAcid',
    salt: 'salt',
  };
  return map[calcType];
}

export interface StrengthValidation {
  level: 'ok' | 'missing' | 'unusual';
  message: string | null;
}

export function validateChemicalStrength(
  key: keyof ChemicalStrengths,
  value: number
): StrengthValidation {
  const meta = META_BY_KEY[key];
  if (!value || value <= 0 || Number.isNaN(value)) {
    return {
      level: 'missing',
      message: `${meta.label} is missing or zero — set your product strength in Settings for accurate dosing.`,
    };
  }
  if (value < meta.typicalMin || value > meta.typicalMax) {
    return {
      level: 'unusual',
      message: `${value}% is outside the typical range (${meta.typicalMin}–${meta.typicalMax}%). Verify your product label.`,
    };
  }
  return { level: 'ok', message: null };
}

export function getCalcStrengthInfo(
  calcType: CalcGuidanceType,
  strengths: ChemicalStrengths
): {
  key: keyof ChemicalStrengths;
  label: string;
  value: number;
  formulaReference: number;
  validation: StrengthValidation;
} | null {
  const key = getStrengthKeyForCalcType(calcType);
  if (!key) return null;
  const meta = META_BY_KEY[key];
  const value = strengths[key];
  return {
    key,
    label: meta.label.replace(' (%)', '').replace(' Purity', ''),
    value,
    formulaReference: meta.formulaReference,
    validation: validateChemicalStrength(key, value),
  };
}

export function resolveStrengths(
  strengths: Partial<ChemicalStrengths> | ChemicalStrengths
): ChemicalStrengths {
  return {
    liquidChlorine: strengths.liquidChlorine ?? 12.5,
    householdBleach: strengths.householdBleach ?? 6,
    calciumChloride: strengths.calciumChloride ?? 77,
    bakingSoda: strengths.bakingSoda ?? 100,
    sodaAsh: strengths.sodaAsh ?? 100,
    muriaticAcid: strengths.muriaticAcid ?? 31.45,
    dryAcid: strengths.dryAcid ?? 93.5,
    cyanuricAcid: strengths.cyanuricAcid ?? 100,
    salt: strengths.salt ?? 100,
  };
}
