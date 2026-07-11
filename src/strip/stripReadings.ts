import type { AppSettings, WaterReadings } from '../models/types';
import type { StripBrandDefinition, StripPadSelections, StripReadingEstimate } from './types';
import { getPadConfidence, confidenceToAccuracyLevel } from './stripConfidence';

function defaultTemperature(settings: AppSettings): Pick<WaterReadings, 'temperature' | 'temperatureUnit'> {
  return {
    temperature: settings.preferredTemperatureUnit === 'celsius' ? 28 : 82,
    temperatureUnit: settings.preferredTemperatureUnit,
  };
}

/** Build per-pad reading estimates from user chart selections */
export function buildStripReadingEstimates(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  captureMethod: 'manual' | 'camera' | 'camera_verified' = 'manual'
): StripReadingEstimate[] {
  const confidence = getPadConfidence(captureMethod);
  const confidenceLevel = confidenceToAccuracyLevel(confidence);

  return brand.pads
    .filter((pad) => selections[pad.id] !== undefined)
    .map((pad) => ({
      padId: pad.id,
      parameter: pad.parameter,
      value: selections[pad.id]!,
      confidence,
      confidenceLevel,
    }));
}

/**
 * Convert strip pad selections into normalized WaterReadings for the chemistry engine.
 * Combined chlorine is derived when total and free chlorine pads are both present.
 */
export function stripSelectionsToWaterReadings(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  settings: AppSettings
): WaterReadings {
  const get = (param: string): number | undefined => {
    const pad = brand.pads.find((p) => p.parameter === param);
    const val = pad ? selections[pad.id] : undefined;
    return val;
  };

  const freeChlorine = get('freeChlorine') ?? 0;
  const totalChlorine = get('totalChlorine');
  const combinedChlorine =
    totalChlorine !== undefined ? Math.max(0, totalChlorine - freeChlorine) : 0;

  return {
    freeChlorine,
    combinedChlorine,
    ph: get('ph') ?? NaN,
    totalAlkalinity: get('totalAlkalinity') ?? NaN,
    calciumHardness: get('totalHardness') ?? NaN,
    cyanuricAcid: get('cyanuricAcid') ?? NaN,
    salt: get('salt') ?? NaN,
    ...defaultTemperature(settings),
  };
}

/** Validate all required pads have a chart selection */
export function validateStripSelections(
  brand: StripBrandDefinition,
  selections: StripPadSelections
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const pad of brand.pads) {
    if (selections[pad.id] === undefined) {
      errors[pad.id] = `Select a ${pad.label} value from the color chart.`;
    }
  }
  return errors;
}
