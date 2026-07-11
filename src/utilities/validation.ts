import type { WaterReadings } from '../models/types';

export interface FieldValidation {
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
  label: string;
}

export const READING_VALIDATION: Record<keyof WaterReadings, FieldValidation | null> = {
  freeChlorine: {
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'ppm',
    hint: 'FAS-DPD titration result. Typical ideal: 1–3 ppm.',
    label: 'Free Chlorine',
  },
  combinedChlorine: {
    min: 0,
    max: 5,
    step: 0.1,
    unit: 'ppm',
    hint: 'Total minus Free chlorine. Ideal: ≤ 0.5 ppm.',
    label: 'Combined Chlorine',
  },
  ph: {
    min: 6.8,
    max: 8.4,
    step: 0.1,
    unit: '',
    hint: 'Phenol red comparison. Ideal: 7.2–7.6.',
    label: 'pH',
  },
  acidDemand: {
    min: 0,
    max: 50,
    step: 1,
    unit: 'drops',
    hint: 'Optional. Drops to reach pH 7.4 from current reading.',
    label: 'Acid Demand',
  },
  baseDemand: {
    min: 0,
    max: 50,
    step: 1,
    unit: 'drops',
    hint: 'Optional. Drops to reach pH 7.4 from current reading.',
    label: 'Base Demand',
  },
  totalAlkalinity: {
    min: 0,
    max: 300,
    step: 10,
    unit: 'ppm',
    hint: 'Titration to yellow endpoint. Ideal: 80–120 ppm.',
    label: 'Total Alkalinity',
  },
  calciumHardness: {
    min: 0,
    max: 1000,
    step: 10,
    unit: 'ppm',
    hint: 'Titration result. Ideal: 200–400 ppm.',
    label: 'Calcium Hardness',
  },
  cyanuricAcid: {
    min: 0,
    max: 150,
    step: 5,
    unit: 'ppm',
    hint: 'Turbidity test. Ideal: 30–50 ppm outdoors.',
    label: 'Cyanuric Acid',
  },
  salt: {
    min: 0,
    max: 6000,
    step: 100,
    unit: 'ppm',
    hint: 'Salt titration. Ideal: 2700–3400 ppm for salt pools.',
    label: 'Salt',
  },
  temperature: {
    min: 32,
    max: 110,
    step: 0.5,
    unit: '°',
    hint: 'Water temperature at time of test.',
    label: 'Water Temperature',
  },
  temperatureUnit: null,
};

export function validateReading(
  field: keyof WaterReadings,
  value: number,
  temperatureUnit?: 'fahrenheit' | 'celsius'
): string | null {
  const rules = READING_VALIDATION[field];
  if (!rules) return null;

  if (Number.isNaN(value)) return `${rules.label} must be a number.`;

  let min = rules.min;
  let max = rules.max;
  if (field === 'temperature' && temperatureUnit === 'celsius') {
    min = 0;
    max = 43;
  }

  if (value < min || value > max) {
    return `${rules.label} must be between ${min} and ${max}${rules.unit ? ' ' + rules.unit : ''}.`;
  }
  return null;
}

export function validateReadings(readings: WaterReadings): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(READING_VALIDATION) as (keyof WaterReadings)[]) {
    if (key === 'temperatureUnit') continue;
    const val = readings[key];
    if (typeof val === 'number') {
      const err = validateReading(key, val, readings.temperatureUnit);
      if (err) errors[key] = err;
    }
  }
  return errors;
}
