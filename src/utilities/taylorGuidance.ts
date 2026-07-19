import type { PoolInfo, WaterReadings } from '../models/types';
import type { TaylorTestInputs, TaylorTestStep } from '../models/taylorKit';
import { isSaltSanitizer } from '../models/taylorKit';
import {
  calculateCombinedChlorine,
  calculateFreeChlorine,
  calculateCalciumHardnessFromDrops,
  calculateTotalAlkalinityFromDrops,
} from '../chemistry/taylorKit';
import { buildChemistryProfile, resolveProfileFromPool } from '../chemistry/poolProfiles';
import type { ParameterAnalysis } from '../models/types';

export type AcidBaseDemandOffer = 'acid' | 'base' | 'in_range' | 'unknown';

export function getPhIdealRange(pool: PoolInfo): { min: number; max: number } {
  const selection = resolveProfileFromPool(pool);
  const profile = buildChemistryProfile(selection);
  return {
    min: profile.thresholds.ph.idealMin,
    max: profile.thresholds.ph.idealMax,
  };
}

/** Which optional demand test to offer based on measured pH */
export function getAcidBaseDemandOffer(
  ph: number | undefined,
  pool: PoolInfo
): AcidBaseDemandOffer {
  if (ph === undefined || Number.isNaN(ph)) return 'unknown';
  const { min, max } = getPhIdealRange(pool);
  if (ph < min) return 'base';
  if (ph > max) return 'acid';
  return 'in_range';
}

export function getAcidBaseDemandExplanation(offer: AcidBaseDemandOffer): string {
  switch (offer) {
    case 'base':
      return 'Your pH is below the recommended range. The optional Base Demand test (R-0016) estimates how much soda ash may be needed to raise pH. You can skip it if you already know your adjustment plan.';
    case 'acid':
      return 'Your pH is above the recommended range. The optional Acid Demand test (R-0015) estimates how much muriatic acid may be needed to lower pH. You can skip it if you already know your adjustment plan.';
    case 'in_range':
      return 'Your pH is already within the recommended range.\n\nYou can skip the optional Acid/Base Demand test.';
    default:
      return 'Enter your measured pH first. The app will suggest the correct optional demand test, if any.';
  }
}

export function shouldShowAcidDemand(offer: AcidBaseDemandOffer): boolean {
  return offer === 'acid';
}

export function shouldShowBaseDemand(offer: AcidBaseDemandOffer): boolean {
  return offer === 'base';
}

export function isCombinedChlorineStepComplete(inputs: TaylorTestInputs): boolean {
  if (inputs.ccSampleStayedClear) return true;
  return inputs.ccDropCount !== undefined;
}

export function getCombinedChlorineClearMessage(): string {
  return (
    'The sample stayed clear.\n\n' +
    'This means Combined Chlorine is 0.0 ppm.\n\n' +
    'That is ideal.\n\n' +
    'No additional titration is needed.'
  );
}

function levelPhrase(level: ParameterAnalysis['level'] | undefined): string {
  switch (level) {
    case 'ideal':
      return 'This is within the ideal range for your pool.';
    case 'low':
      return 'This is below the ideal range — see recommendations on Review for next steps.';
    case 'high':
      return 'This is above the ideal range — see recommendations on Review for next steps.';
    case 'critical_low':
      return 'This is critically low — address it soon using the recommendations on Review.';
    case 'critical_high':
      return 'This is critically high — address it soon using the recommendations on Review.';
    default:
      return 'Review your results and recommendations before making chemical changes.';
  }
}

function findParam(
  parameters: ParameterAnalysis[],
  key: ParameterAnalysis['parameter']
): ParameterAnalysis | undefined {
  return parameters.find((p) => p.parameter === key);
}

/** Beginner-friendly success message after a step has a usable result */
export function getStepSuccessMessage(
  step: TaylorTestStep,
  inputs: TaylorTestInputs,
  pool: PoolInfo,
  _readings: WaterReadings,
  parameters: ParameterAnalysis[]
): string | null {
  switch (step) {
    case 'freeChlorine': {
      if (inputs.fcDropCount === undefined) return null;
      const ppm = calculateFreeChlorine(inputs.fcDropCount, inputs.sampleSizeMl);
      const param = findParam(parameters, 'freeChlorine');
      return `Your Free Chlorine is ${ppm.toFixed(ppm % 1 === 0 ? 0 : 1)} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    case 'combinedChlorine': {
      if (inputs.ccSampleStayedClear) {
        return 'Your Combined Chlorine is 0.0 ppm.\n\nThat is ideal — no chloramines detected.';
      }
      if (inputs.ccDropCount === undefined) return null;
      const ppm = calculateCombinedChlorine(inputs.ccDropCount, inputs.sampleSizeMl);
      const param = findParam(parameters, 'combinedChlorine');
      return `Your Combined Chlorine is ${ppm.toFixed(ppm % 1 === 0 ? 0 : 1)} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    case 'ph': {
      if (inputs.ph === undefined || Number.isNaN(inputs.ph)) return null;
      const param = findParam(parameters, 'ph');
      return `Your pH is ${inputs.ph.toFixed(1)}.\n\n${levelPhrase(param?.level)}`;
    }
    case 'totalAlkalinity': {
      const ppm =
        inputs.totalAlkalinityMode === 'drops'
          ? inputs.totalAlkalinityDrops !== undefined
            ? calculateTotalAlkalinityFromDrops(inputs.totalAlkalinityDrops)
            : null
          : inputs.totalAlkalinityPpm ?? null;
      if (ppm === null) return null;
      const param = findParam(parameters, 'totalAlkalinity');
      return `Your Total Alkalinity is ${ppm} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    case 'calciumHardness': {
      const ppm =
        inputs.calciumHardnessMode === 'drops'
          ? inputs.calciumHardnessDrops !== undefined
            ? calculateCalciumHardnessFromDrops(inputs.calciumHardnessDrops)
            : null
          : inputs.calciumHardnessPpm ?? null;
      if (ppm === null) return null;
      const param = findParam(parameters, 'calciumHardness');
      return `Your Calcium Hardness is ${ppm} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    case 'cyanuricAcid': {
      if (inputs.cyanuricAcid === undefined) return null;
      const param = findParam(parameters, 'cyanuricAcid');
      return `Your CYA (Stabilizer) is ${inputs.cyanuricAcid} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    case 'salt': {
      if (inputs.saltSkipped && !isSaltSanitizer(pool.sanitizerType)) {
        return 'Salt test skipped — optional for this pool type.';
      }
      if (inputs.salt === undefined) return null;
      const param = findParam(parameters, 'salt');
      return `Your Salt level is ${inputs.salt.toLocaleString()} ppm.\n\n${levelPhrase(param?.level)}`;
    }
    default:
      return null;
  }
}

export function getFcNoPinkHelpItems(): string[] {
  return [
    'Possible zero chlorine in the pool.',
    'R-0870 powder may be old, damp, or under-dosed — try a fresh scoop.',
    'Sample tested in direct sunlight — UV can bleach pink before you finish.',
    'Not enough powder — use two level scoops and swirl until dissolved.',
  ];
}

export function guideHasTroubleshooting(step: TaylorTestStep): boolean {
  return step !== 'review' && step !== 'pool';
}
