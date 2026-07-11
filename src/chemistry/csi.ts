import type {
  CSIClassification,
  CSIExplanation,
  CSIFactors,
  PoolInfo,
  PoolProfileConfig,
  PriorityLevel,
  TemperatureUnit,
  WaterBalanceAnalysis,
  WaterReadings,
} from '../models/types';
import { resolveProfileFromPool } from './poolProfiles';
import { toFahrenheit } from '../utilities/units';

/**
 * Langelier Saturation Index constant for pool water (Calcite Saturation Index / LSI).
 * Standard form: LSI = pH + TF + CF + AF - LSI_CONSTANT
 * Reference: Langelier (1936); widely adopted in pool industry (Orenda, Taylor, APSP).
 */
export const LSI_CONSTANT = 12.1;

/**
 * Cyanurate alkalinity correction factor.
 * Adjusted (carbonate) alkalinity ≈ TA - (CYA × factor).
 * Reference: Orenda Technologies / industry practice for stabilized outdoor pools.
 */
export const CYA_ALKALINITY_FACTOR = 0.33;

/** Calcium factor offset: CF = log10(Ca hardness ppm as CaCO₃) - CALCIUM_FACTOR_OFFSET */
export const CALCIUM_FACTOR_OFFSET = 0.4;

/** CSI influence on Water Health Score (0–1). Parameter bands retain 92% weight. */
export const CSI_SCORE_WEIGHT = 0.08;

/** Langelier temperature factor (°F) — linear interpolation between standard table points */
const TEMPERATURE_FACTOR_TABLE: Array<{ f: number; tf: number }> = [
  { f: 32, tf: 0.0 },
  { f: 37, tf: 0.1 },
  { f: 46, tf: 0.2 },
  { f: 53, tf: 0.3 },
  { f: 60, tf: 0.4 },
  { f: 66, tf: 0.5 },
  { f: 76, tf: 0.6 },
  { f: 84, tf: 0.7 },
  { f: 94, tf: 0.8 },
  { f: 105, tf: 0.9 },
  { f: 113, tf: 1.0 },
];

export interface CSICalculation {
  value: number;
  adjustedAlkalinity: number;
  factors: CSIFactors;
}

export interface CSIClassificationResult {
  classification: CSIClassification;
  label: string;
  summary: string;
  recommendedAction: string;
  priority: PriorityLevel;
}

export interface CSIInput {
  ph: number;
  totalAlkalinity: number;
  calciumHardness: number;
  cyanuricAcid: number;
  temperature: number;
  temperatureUnit: TemperatureUnit;
}

/** Minimum ppm used before log10 to avoid undefined math at zero */
const LOG_FLOOR = 1;

/**
 * Calculate carbonate (CYA-adjusted) alkalinity for LSI.
 * Assumes cyanuric acid binds a portion of total alkalinity in stabilized pools.
 */
export function calculateAdjustedAlkalinity(totalAlkalinity: number, cyanuricAcid: number): number {
  const corrected = totalAlkalinity - cyanuricAcid * CYA_ALKALINITY_FACTOR;
  return Math.max(0, corrected);
}

/** Temperature factor from Langelier index table (input in °F) */
export function calculateTemperatureFactor(temperatureF: number): number {
  if (temperatureF <= TEMPERATURE_FACTOR_TABLE[0].f) {
    return TEMPERATURE_FACTOR_TABLE[0].tf;
  }
  const last = TEMPERATURE_FACTOR_TABLE[TEMPERATURE_FACTOR_TABLE.length - 1];
  if (temperatureF >= last.f) {
    return last.tf;
  }

  for (let i = 0; i < TEMPERATURE_FACTOR_TABLE.length - 1; i++) {
    const lower = TEMPERATURE_FACTOR_TABLE[i];
    const upper = TEMPERATURE_FACTOR_TABLE[i + 1];
    if (temperatureF >= lower.f && temperatureF <= upper.f) {
      const ratio = (temperatureF - lower.f) / (upper.f - lower.f);
      return lower.tf + ratio * (upper.tf - lower.tf);
    }
  }
  return last.tf;
}

/** Calcium factor: CF = log10(ppm CaCO₃ hardness) - 0.4 */
export function calculateCalciumFactor(calciumHardness: number): number {
  return Math.log10(Math.max(LOG_FLOOR, calciumHardness)) - CALCIUM_FACTOR_OFFSET;
}

/** Alkalinity factor: AF = log10(ppm adjusted alkalinity as CaCO₃) */
export function calculateAlkalinityFactor(adjustedAlkalinity: number): number {
  return Math.log10(Math.max(LOG_FLOOR, adjustedAlkalinity));
}

/** Core LSI / CSI calculation from water chemistry inputs */
export function calculateCSI(input: CSIInput): CSICalculation {
  const temperatureF = toFahrenheit(input.temperature, input.temperatureUnit);
  const adjustedAlkalinity = calculateAdjustedAlkalinity(input.totalAlkalinity, input.cyanuricAcid);
  const temperatureFactor = calculateTemperatureFactor(temperatureF);
  const calciumFactor = calculateCalciumFactor(input.calciumHardness);
  const alkalinityFactor = calculateAlkalinityFactor(adjustedAlkalinity);

  const value =
    input.ph + temperatureFactor + calciumFactor + alkalinityFactor - LSI_CONSTANT;

  return {
    value: Math.round(value * 100) / 100,
    adjustedAlkalinity: Math.round(adjustedAlkalinity * 10) / 10,
    factors: {
      ph: input.ph,
      temperatureF,
      temperatureFactor: Math.round(temperatureFactor * 1000) / 1000,
      calciumHardness: input.calciumHardness,
      calciumFactor: Math.round(calciumFactor * 1000) / 1000,
      totalAlkalinity: input.totalAlkalinity,
      cyanuricAcid: input.cyanuricAcid,
      adjustedAlkalinity: Math.round(adjustedAlkalinity * 10) / 10,
      alkalinityFactor: Math.round(alkalinityFactor * 1000) / 1000,
      constant: LSI_CONSTANT,
    },
  };
}

export function calculateCSIFromReadings(readings: WaterReadings): CSICalculation {
  return calculateCSI({
    ph: readings.ph,
    totalAlkalinity: readings.totalAlkalinity,
    calciumHardness: readings.calciumHardness,
    cyanuricAcid: readings.cyanuricAcid,
    temperature: readings.temperature,
    temperatureUnit: readings.temperatureUnit,
  });
}

/** Classify numeric CSI / LSI into five industry bands */
export function classifyCSI(value: number): CSIClassificationResult {
  let classification: CSIClassification;
  if (value <= -0.5) classification = 'aggressively_corrosive';
  else if (value < -0.3) classification = 'corrosive';
  else if (value < 0.3) classification = 'balanced';
  else if (value < 0.5) classification = 'slight_scaling';
  else classification = 'scaling';

  const labels: Record<CSIClassification, string> = {
    aggressively_corrosive: 'Aggressively Corrosive',
    corrosive: 'Corrosive',
    balanced: 'Balanced',
    slight_scaling: 'Slight Scaling',
    scaling: 'Scaling',
  };

  const summaries: Record<CSIClassification, string> = {
    aggressively_corrosive:
      'Water is strongly undersaturated — aggressive etching and equipment corrosion are likely.',
    corrosive:
      'Water tends toward undersaturation — surfaces and metal may slowly corrode or etch.',
    balanced:
      'Water is balanced with minimal scaling or corrosion risk.',
    slight_scaling:
      'Water is slightly oversaturated — light scale formation may occur over time.',
    scaling:
      'Water is oversaturated — calcium scale on surfaces and equipment is likely.',
  };

  const actions: Record<CSIClassification, string> = {
    aggressively_corrosive:
      'Raise pH, calcium hardness, and/or alkalinity gradually. Retest CSI after adjustments.',
    corrosive:
      'Increase pH, calcium hardness, or alkalinity as needed. Monitor plaster and heater surfaces.',
    balanced: 'Maintain current balance. Continue routine testing.',
    slight_scaling:
      'Lower pH slightly or reduce alkalinity/calcium if trend continues. Brush surfaces regularly.',
    scaling:
      'Lower pH and/or alkalinity. Consider partial drain if calcium is very high. Descale equipment as needed.',
  };

  const priorities: Record<CSIClassification, PriorityLevel> = {
    aggressively_corrosive: 'high',
    corrosive: 'medium',
    balanced: 'low',
    slight_scaling: 'medium',
    scaling: 'high',
  };

  return {
    classification,
    label: labels[classification],
    summary: summaries[classification],
    recommendedAction: actions[classification],
    priority: priorities[classification],
  };
}

function surfaceNote(profile: PoolProfileConfig): string {
  if (profile.surface === 'plaster' || profile.surface === 'pebble') {
    return 'Plaster and pebble surfaces are especially sensitive to corrosive water.';
  }
  if (profile.surface === 'vinyl' || profile.surface === 'fiberglass') {
    return 'Vinyl and fiberglass are less prone to etching but metal fittings can still corrode.';
  }
  return '';
}

/** Detailed explanation for analysis views */
export function explainCSI(
  calculation: CSICalculation,
  classification: CSIClassificationResult,
  pool?: PoolInfo
): CSIExplanation {
  const profile = pool ? resolveProfileFromPool(pool) : null;
  const surface = profile ? surfaceNote(profile) : '';
  const cyaNote =
    calculation.factors.cyanuricAcid > 0
      ? ` CYA correction reduced effective alkalinity from ${calculation.factors.totalAlkalinity} to ${calculation.adjustedAlkalinity} ppm.`
      : '';

  const meaning = `CSI (Calcite Saturation Index / LSI) is ${calculation.value.toFixed(2)} — ${classification.label.toLowerCase()} water.${cyaNote}`;

  const whyItMatters =
    'CSI predicts whether water will deposit calcium scale or dissolve it from pool surfaces and equipment. It complements individual parameter tests by showing overall saturation balance.';

  const scalingRisk =
    classification.classification === 'scaling' || classification.classification === 'slight_scaling'
      ? 'Elevated pH, calcium, or alkalinity drive oversaturation — scale can cloud water and clog heaters and salt cells.'
      : classification.classification === 'balanced'
        ? 'Low scaling risk — saturation is near equilibrium.'
        : 'Minimal scaling risk while water remains undersaturated.';

  const corrosionRisk =
    classification.classification === 'aggressively_corrosive' ||
    classification.classification === 'corrosive'
      ? `Undersaturated water seeks calcium — it can etch plaster, stain metal, and damage heat exchangers.${surface ? ` ${surface}` : ''}`
      : classification.classification === 'balanced'
        ? 'Low corrosion risk — water is near calcium equilibrium.'
        : 'Corrosion risk is low; oversaturated water primarily deposits scale instead.';

  return {
    meaning,
    whyItMatters,
    scalingRisk,
    corrosionRisk,
    suggestedCorrection: classification.recommendedAction,
  };
}

/** Full water balance analysis for storage on WaterAnalysisResult */
export function analyzeWaterBalance(readings: WaterReadings, pool?: PoolInfo): WaterBalanceAnalysis {
  const calculation = calculateCSIFromReadings(readings);
  const classification = classifyCSI(calculation.value);
  const explanation = explainCSI(calculation, classification, pool);

  return {
    ...calculation,
    ...classification,
    explanation,
  };
}

/** Map CSI band to a 0–100 score component for health score blending */
export function csiScoreComponent(classification: CSIClassification): number {
  switch (classification) {
    case 'balanced':
      return 100;
    case 'slight_scaling':
    case 'corrosive':
      return 78;
    case 'scaling':
    case 'aggressively_corrosive':
      return 55;
  }
}

/** Blend parameter-based score with CSI — CSI influences but does not dominate */
export function applyWaterBalanceToScore(baseScore: number, waterBalance: WaterBalanceAnalysis): number {
  const csiComponent = csiScoreComponent(waterBalance.classification);
  const blended = baseScore * (1 - CSI_SCORE_WEIGHT) + csiComponent * CSI_SCORE_WEIGHT;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

export function formatCSIValue(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}
