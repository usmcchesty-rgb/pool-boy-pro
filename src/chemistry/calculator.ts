import type { ChemicalStrengths } from '../models/types';
import { toGallons } from '../utilities/units';

export interface ChemicalDose {
  chemical: string;
  amount: number;
  unit: 'fl oz' | 'lb' | 'oz' | 'qt' | 'gal';
  displayAmount: string;
}

/** Reference strengths used in industry-standard dose formulas (see each function). */
export const FORMULA_REFERENCE = {
  sodiumHypochlorite: 12.5,
  muriaticAcid: 31.45,
  dryAcid: 93.5,
  pureProduct: 100,
} as const;

function invalidStrength(strengthPercent: number): boolean {
  return !strengthPercent || strengthPercent <= 0 || Number.isNaN(strengthPercent);
}

/**
 * Raise free chlorine using liquid sodium hypochlorite.
 *
 * Assumptions:
 * - Standard industry factor: 0.000127 fl oz per ppm per gallon at 12.5% NaOCl.
 * - Strength scales inversely: lower % product requires more volume.
 * - Does not account for CYA buffering or overnight FC loss.
 */
export function calcLiquidChlorine(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const oz =
    delta *
    volumeGallons *
    0.000127 *
    (FORMULA_REFERENCE.sodiumHypochlorite / strengthPercent);
  return formatDose('Liquid Chlorine', oz, 'fl oz');
}

/**
 * Raise free chlorine using household bleach.
 * Same hypochlorite formula as liquid chlorine; only the configured strength differs.
 */
export function calcHouseholdBleach(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const oz =
    delta *
    volumeGallons *
    0.000127 *
    (FORMULA_REFERENCE.sodiumHypochlorite / strengthPercent);
  return formatDose('Household Bleach', oz, 'fl oz');
}

/**
 * Raise total alkalinity with baking soda (sodium bicarbonate).
 * Assumes ~1.5 lb raises 10 ppm TA in 10,000 gallons (pure product).
 */
export function calcBakingSoda(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const lb =
    (delta / 10) * (volumeGallons / 10000) * 1.5 * (FORMULA_REFERENCE.pureProduct / strengthPercent);
  return formatDose('Baking Soda', lb, 'lb');
}

/**
 * Raise pH with soda ash (sodium carbonate).
 * Assumes ~6 oz raises pH 0.2 in 10,000 gallons at 100% purity.
 */
export function calcSodaAsh(
  currentPh: number,
  targetPh: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPh - currentPh;
  if (delta <= 0) return null;
  const oz =
    (delta / 0.2) * (volumeGallons / 10000) * 6 * (FORMULA_REFERENCE.pureProduct / strengthPercent);
  return formatDose('Soda Ash', oz, 'oz');
}

/**
 * Lower pH with muriatic acid (dilute hydrochloric acid).
 * Assumes ~12 fl oz lowers pH 0.2 in 10,000 gallons at 31.45% HCl.
 */
export function calcMuriaticAcidPh(
  currentPh: number,
  targetPh: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = currentPh - targetPh;
  if (delta <= 0) return null;
  const flOz =
    (delta / 0.2) *
    (volumeGallons / 10000) *
    12 *
    (FORMULA_REFERENCE.muriaticAcid / strengthPercent);
  return formatDose('Muriatic Acid', flOz, 'fl oz');
}

/**
 * Lower total alkalinity with muriatic acid.
 * Assumes ~26 fl oz lowers ~10 ppm TA in 10,000 gallons at 31.45% HCl.
 */
export function calcMuriaticAcidTa(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = currentPpm - targetPpm;
  if (delta <= 0) return null;
  const flOz =
    (delta / 10) *
    (volumeGallons / 10000) *
    26 *
    (FORMULA_REFERENCE.muriaticAcid / strengthPercent);
  return formatDose('Muriatic Acid', flOz, 'fl oz');
}

/**
 * Lower pH with dry acid (sodium bisulfate).
 * Assumes ~6 oz lowers pH 0.2 in 10,000 gallons at 93.5% active ingredient.
 */
export function calcDryAcid(
  currentPh: number,
  targetPh: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = currentPh - targetPh;
  if (delta <= 0) return null;
  const oz =
    (delta / 0.2) *
    (volumeGallons / 10000) *
    6 *
    (FORMULA_REFERENCE.dryAcid / strengthPercent);
  return formatDose('Dry Acid', oz, 'oz');
}

/**
 * Raise calcium hardness with calcium chloride dihydrate.
 * Assumes ~1 lb raises 10 ppm CH in 10,000 gallons at 100% purity.
 */
export function calcCalciumChloride(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const lb =
    (delta / 10) * (volumeGallons / 10000) * (FORMULA_REFERENCE.pureProduct / strengthPercent);
  return formatDose('Calcium Chloride', lb, 'lb');
}

/**
 * Raise cyanuric acid stabilizer.
 * Assumes ~1 lb raises ~10 ppm CYA in 10,000 gallons at 100% purity.
 */
export function calcCyanuricAcid(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const lb =
    (delta / 10) * (volumeGallons / 10000) * (FORMULA_REFERENCE.pureProduct / strengthPercent);
  return formatDose('Cyanuric Acid / Stabilizer', lb, 'lb');
}

/**
 * Raise salt level.
 * Assumes ~40 lb raises ~480 ppm in 10,000 gallons at 100% NaCl purity.
 */
export function calcSalt(
  currentPpm: number,
  targetPpm: number,
  volumeGallons: number,
  strengthPercent: number
): ChemicalDose | null {
  if (invalidStrength(strengthPercent)) return null;
  const delta = targetPpm - currentPpm;
  if (delta <= 0) return null;
  const lb =
    (delta / 480) * (volumeGallons / 10000) * 40 * (FORMULA_REFERENCE.pureProduct / strengthPercent);
  return formatDose('Pool Salt', lb, 'lb');
}

function formatDose(chemical: string, amount: number, unit: ChemicalDose['unit']): ChemicalDose {
  let displayAmount: string;
  if (unit === 'fl oz' && amount >= 128) {
    const gal = amount / 128;
    displayAmount = `${gal.toFixed(2)} gal (${amount.toFixed(0)} fl oz)`;
  } else if (unit === 'fl oz' && amount >= 32) {
    const qt = amount / 32;
    displayAmount = `${qt.toFixed(2)} qt (${amount.toFixed(0)} fl oz)`;
  } else if (unit === 'lb' && amount >= 1) {
    displayAmount = `${amount.toFixed(2)} lb`;
  } else if (unit === 'oz') {
    displayAmount = `${amount.toFixed(1)} oz`;
  } else {
    displayAmount = `${amount.toFixed(1)} ${unit}`;
  }
  return { chemical, amount, unit, displayAmount };
}

export interface CalculatorInput {
  volume: number;
  volumeUnit: 'gallons' | 'liters';
  strengths: ChemicalStrengths;
}

export function getVolumeGallons(input: CalculatorInput): number {
  return toGallons(input.volume, input.volumeUnit);
}
