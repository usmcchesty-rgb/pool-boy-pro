import type { TaylorSampleSize, TaylorTestInputs } from '../models/taylorKit';
import type { WaterReadings } from '../models/types';

/**
 * FAS-DPD ppm multiplier by sample size (Taylor K-2006-SALT).
 * 10 mL: each R-0871 drop = 0.5 ppm
 * 25 mL: each R-0871 drop = 0.2 ppm
 */
export function getFasDpdMultiplier(sampleSizeMl: TaylorSampleSize): number {
  return sampleSizeMl === 10 ? 0.5 : 0.2;
}

/** Calculate free chlorine (ppm) from FAS-DPD R-0871 drop count. */
export function calculateFreeChlorine(drops: number, sampleSizeMl: TaylorSampleSize): number {
  if (drops < 0) return 0;
  return drops * getFasDpdMultiplier(sampleSizeMl);
}

/**
 * Calculate combined chlorine (ppm) from CC titration drops.
 * Uses the same sample size and multiplier as the preceding FC test.
 */
export function calculateCombinedChlorine(drops: number, sampleSizeMl: TaylorSampleSize): number {
  if (drops < 0) return 0;
  return drops * getFasDpdMultiplier(sampleSizeMl);
}

/**
 * Total alkalinity from R-0009 drops (Taylor K-2006, 25 mL sample).
 * Each drop = 10 ppm as CaCO₃.
 */
export function calculateTotalAlkalinityFromDrops(drops: number): number {
  if (drops < 0) return 0;
  return drops * 10;
}

/**
 * Calcium hardness from R-0012 drops (Taylor K-2006, 25 mL sample).
 * Each drop = 25 ppm as CaCO₃.
 */
export function calculateCalciumHardnessFromDrops(drops: number): number {
  if (drops < 0) return 0;
  return drops * 25;
}

/** Resolve TA ppm from either direct entry or drop count. */
export function resolveTotalAlkalinity(inputs: TaylorTestInputs): number {
  if (inputs.totalAlkalinityMode === 'ppm') {
    return inputs.totalAlkalinityPpm ?? 0;
  }
  return calculateTotalAlkalinityFromDrops(inputs.totalAlkalinityDrops ?? 0);
}

/** Resolve CH ppm from either direct entry or drop count. */
export function resolveCalciumHardness(inputs: TaylorTestInputs): number {
  if (inputs.calciumHardnessMode === 'ppm') {
    return inputs.calciumHardnessPpm ?? 0;
  }
  return calculateCalciumHardnessFromDrops(inputs.calciumHardnessDrops ?? 0);
}

/** Convert Taylor kit workflow inputs into normalized WaterReadings for storage and analysis. */
export function buildReadingsFromTaylorInputs(inputs: TaylorTestInputs): WaterReadings {
  const readings: WaterReadings = {
    freeChlorine: calculateFreeChlorine(inputs.fcDropCount ?? 0, inputs.sampleSizeMl),
    combinedChlorine: calculateCombinedChlorine(inputs.ccDropCount ?? 0, inputs.sampleSizeMl),
    ph: inputs.ph ?? NaN,
    totalAlkalinity: resolveTotalAlkalinity(inputs),
    calciumHardness: resolveCalciumHardness(inputs),
    cyanuricAcid: inputs.cyanuricAcid ?? NaN,
    salt: inputs.saltSkipped ? 0 : (inputs.salt ?? NaN),
    temperature: inputs.temperature ?? NaN,
    temperatureUnit: inputs.temperatureUnit,
  };

  if (inputs.acidDemand !== undefined && inputs.acidDemand > 0) {
    readings.acidDemand = inputs.acidDemand;
  }
  if (inputs.baseDemand !== undefined && inputs.baseDemand > 0) {
    readings.baseDemand = inputs.baseDemand;
  }

  return readings;
}

/** Human-readable formula text for the UI. */
export function formatFasDpdFormula(sampleSizeMl: TaylorSampleSize): string {
  const mult = getFasDpdMultiplier(sampleSizeMl);
  return `${sampleSizeMl} mL sample: drops × ${mult} = ppm`;
}

/** Apply a salt reading and clear the skipped flag. */
export function applySaltReading(
  _inputs: TaylorTestInputs,
  saltPpm: number
): Pick<TaylorTestInputs, 'salt' | 'saltSkipped'> {
  return {
    salt: saltPpm,
    saltSkipped: false,
  };
}
