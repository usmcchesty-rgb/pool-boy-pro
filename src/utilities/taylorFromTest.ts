import { getFasDpdMultiplier } from '../chemistry/taylorKit';
import type { AppSettings, WaterTest } from '../models/types';
import { isSaltSanitizer, type TaylorTestInputs } from '../models/taylorKit';

/** Reconstruct Taylor workflow inputs from stored test readings for editing. */
export function taylorInputsFromWaterTest(test: WaterTest, settings: AppSettings): TaylorTestInputs {
  const readings = test.readings;
  const sampleSizeMl = settings.preferredFasDpdSampleSize;
  const multiplier = getFasDpdMultiplier(sampleSizeMl);
  const saltSkipped = !isSaltSanitizer(test.pool.sanitizerType) && readings.salt === 0;

  return {
    sampleSizeMl,
    fcDropCount: readings.freeChlorine / multiplier,
    ccDropCount: readings.combinedChlorine / multiplier,
    ph: readings.ph,
    acidDemand: readings.acidDemand,
    baseDemand: readings.baseDemand,
    totalAlkalinityMode: 'ppm',
    totalAlkalinityPpm: readings.totalAlkalinity,
    calciumHardnessMode: 'ppm',
    calciumHardnessPpm: readings.calciumHardness,
    cyanuricAcid: readings.cyanuricAcid,
    salt: saltSkipped ? 0 : readings.salt,
    saltSkipped,
    ccSampleStayedClear: readings.combinedChlorine === 0,
    temperature: readings.temperature,
    temperatureUnit: readings.temperatureUnit ?? settings.preferredTemperatureUnit,
  };
}
