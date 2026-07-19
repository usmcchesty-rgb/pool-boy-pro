import type { PoolInfo } from '../models/types';
import { isSaltSanitizer, type TaylorTestInputs, type TaylorTestStep } from '../models/taylorKit';
import { buildReadingsFromTaylorInputs } from '../chemistry/taylorKit';
import { validateReadings } from './validation';
import { getTaylorStepOrder } from './taylorSteps';

export function validateTaylorStep(
  step: TaylorTestStep,
  inputs: TaylorTestInputs,
  pool: PoolInfo
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (step) {
    case 'pool':
      if (Number.isNaN(pool.volume) || pool.volume <= 0) {
        errors.volume = 'Pool volume must be greater than 0.';
      }
      if (inputs.temperature === undefined || Number.isNaN(inputs.temperature)) {
        errors.temperature = 'Water temperature must be a number.';
      } else {
        const min = inputs.temperatureUnit === 'celsius' ? 0 : 32;
        const max = inputs.temperatureUnit === 'celsius' ? 43 : 110;
        if (inputs.temperature < min || inputs.temperature > max) {
          errors.temperature = `Temperature must be between ${min} and ${max}.`;
        }
      }
      break;

    case 'freeChlorine':
      if (inputs.fcDropCount === undefined) {
        errors.fcDropCount = 'Enter R-0871 drop count.';
      } else if (inputs.fcDropCount < 0) {
        errors.fcDropCount = 'Drop count cannot be negative.';
      } else if (inputs.fcDropCount > 200) {
        errors.fcDropCount = 'Drop count seems too high — recheck your titration.';
      }
      break;

    case 'combinedChlorine':
      if (inputs.ccSampleStayedClear) {
        break;
      }
      if (inputs.ccDropCount === undefined) {
        errors.ccDropCount = 'Enter additional drop count.';
      } else if (inputs.ccDropCount < 0) {
        errors.ccDropCount = 'Drop count cannot be negative.';
      } else if (inputs.ccDropCount > 50) {
        errors.ccDropCount = 'Drop count seems too high — recheck your titration.';
      }
      break;

    case 'ph':
      if (inputs.ph === undefined || Number.isNaN(inputs.ph) || inputs.ph < 6.8 || inputs.ph > 8.4) {
        errors.ph = 'pH must be between 6.8 and 8.4.';
      }
      if (inputs.acidDemand !== undefined && (inputs.acidDemand < 0 || inputs.acidDemand > 50)) {
        errors.acidDemand = 'Acid demand must be between 0 and 50 drops.';
      }
      if (inputs.baseDemand !== undefined && (inputs.baseDemand < 0 || inputs.baseDemand > 50)) {
        errors.baseDemand = 'Base demand must be between 0 and 50 drops.';
      }
      break;

    case 'totalAlkalinity':
      if (inputs.totalAlkalinityMode === 'drops') {
        if (inputs.totalAlkalinityDrops === undefined) {
          errors.totalAlkalinityDrops = 'Enter R-0009 drop count.';
        } else if (inputs.totalAlkalinityDrops <= 0) {
          errors.totalAlkalinityDrops = 'Enter R-0009 drop count (must be at least 1).';
        } else if (inputs.totalAlkalinityDrops > 30) {
          errors.totalAlkalinityDrops = 'Drop count seems too high — recheck your titration.';
        }
      } else if (
        inputs.totalAlkalinityPpm === undefined ||
        Number.isNaN(inputs.totalAlkalinityPpm) ||
        inputs.totalAlkalinityPpm < 0 ||
        inputs.totalAlkalinityPpm > 300
      ) {
        errors.totalAlkalinityPpm = 'Alkalinity must be between 0 and 300 ppm.';
      }
      break;

    case 'calciumHardness':
      if (inputs.calciumHardnessMode === 'drops') {
        if (inputs.calciumHardnessDrops === undefined) {
          errors.calciumHardnessDrops = 'Enter R-0012 drop count.';
        } else if (inputs.calciumHardnessDrops <= 0) {
          errors.calciumHardnessDrops = 'Enter R-0012 drop count (must be at least 1).';
        } else if (inputs.calciumHardnessDrops > 40) {
          errors.calciumHardnessDrops = 'Drop count seems too high — recheck your titration.';
        }
      } else if (
        inputs.calciumHardnessPpm === undefined ||
        Number.isNaN(inputs.calciumHardnessPpm) ||
        inputs.calciumHardnessPpm < 0 ||
        inputs.calciumHardnessPpm > 1000
      ) {
        errors.calciumHardnessPpm = 'Hardness must be between 0 and 1000 ppm.';
      }
      break;

    case 'cyanuricAcid':
      if (
        inputs.cyanuricAcid === undefined ||
        Number.isNaN(inputs.cyanuricAcid) ||
        inputs.cyanuricAcid < 0 ||
        inputs.cyanuricAcid > 150
      ) {
        errors.cyanuricAcid = 'CYA must be between 0 and 150 ppm.';
      }
      break;

    case 'salt':
      if (inputs.saltSkipped && !isSaltSanitizer(pool.sanitizerType)) {
        break;
      }
      if (
        inputs.salt === undefined ||
        Number.isNaN(inputs.salt) ||
        inputs.salt < 0 ||
        inputs.salt > 6000
      ) {
        errors.salt = 'Salt must be between 0 and 6000 ppm.';
      }
      break;

    case 'review':
      break;
  }

  return errors;
}

export function validateTaylorTest(
  inputs: TaylorTestInputs,
  pool: PoolInfo
): Record<string, string> {
  const errors: Record<string, string> = {};
  const steps = getTaylorStepOrder(pool, inputs.saltSkipped).filter((s) => s !== 'review');

  for (const step of steps) {
    Object.assign(errors, validateTaylorStep(step, inputs, pool));
  }

  const readings = buildReadingsFromTaylorInputs(inputs);
  Object.assign(errors, validateReadings(readings));

  return errors;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

/** Non-blocking warnings based on calculated readings (ideal range hints). */
export function getTaylorWarnings(inputs: TaylorTestInputs, pool: PoolInfo): ValidationWarning[] {
  const readings = buildReadingsFromTaylorInputs(inputs);
  const warnings: ValidationWarning[] = [];

  if (!Number.isNaN(readings.freeChlorine)) {
    if (readings.freeChlorine < 1) {
      warnings.push({ field: 'freeChlorine', message: 'Free chlorine is below the 1–3 ppm ideal range.' });
    } else if (readings.freeChlorine > 5) {
      warnings.push({ field: 'freeChlorine', message: 'Free chlorine exceeds typical ideal levels.' });
    }
  }

  if (!Number.isNaN(readings.combinedChlorine) && readings.combinedChlorine >= 0.5) {
    warnings.push({ field: 'combinedChlorine', message: 'Combined chlorine ≥ 0.5 ppm — shock treatment may be needed.' });
  }

  if (!Number.isNaN(readings.ph) && (readings.ph < 7.2 || readings.ph > 7.6)) {
    warnings.push({ field: 'ph', message: 'pH is outside the 7.2–7.6 ideal range.' });
  }

  if (!Number.isNaN(readings.totalAlkalinity) && (readings.totalAlkalinity < 80 || readings.totalAlkalinity > 120)) {
    warnings.push({ field: 'totalAlkalinity', message: 'Total alkalinity is outside the 80–120 ppm ideal range.' });
  }

  if (!Number.isNaN(readings.calciumHardness) && (readings.calciumHardness < 200 || readings.calciumHardness > 400)) {
    warnings.push({ field: 'calciumHardness', message: 'Calcium hardness is outside the 200–400 ppm ideal range.' });
  }

  if (!Number.isNaN(readings.cyanuricAcid) && (readings.cyanuricAcid < 30 || readings.cyanuricAcid > 50)) {
    warnings.push({ field: 'cyanuricAcid', message: 'CYA is outside the 30–50 ppm outdoor ideal range.' });
  }

  const showSaltWarnings =
    isSaltSanitizer(pool.sanitizerType) && !inputs.saltSkipped;

  if (showSaltWarnings) {
    if (readings.salt > 0 && readings.salt < 2700) {
      warnings.push({ field: 'salt', message: 'Salt is below the 2700–3400 ppm ideal range for salt pools.' });
    } else if (readings.salt > 3400) {
      warnings.push({ field: 'salt', message: 'Salt exceeds the 2700–3400 ppm ideal range.' });
    }
  }

  return warnings;
}
