import type { AppSettings, ChemicalStrengths, PoolInfo, WaterReadings } from './types';
import { DEFAULT_POOL_PROFILE } from '../chemistry/poolProfiles';

export const APP_VERSION = 1;
export const STORAGE_KEY = 'pool-boy-pro-data';

export const DEFAULT_CHEMICAL_STRENGTHS: ChemicalStrengths = {
  liquidChlorine: 12.5,
  householdBleach: 6.0,
  calciumChloride: 77,
  bakingSoda: 100,
  sodaAsh: 100,
  muriaticAcid: 31.45,
  dryAcid: 93.5,
  cyanuricAcid: 100,
  salt: 100,
};

export const DEFAULT_SETTINGS: AppSettings = {
  preferredVolumeUnit: 'gallons',
  preferredTemperatureUnit: 'fahrenheit',
  defaultPoolVolume: 20000,
  defaultPoolType: 'inground',
  defaultSanitizerType: 'salt',
  chemicalStrengths: { ...DEFAULT_CHEMICAL_STRENGTHS },
  theme: 'light',
  poolName: 'My Pool',
  preferredFasDpdSampleSize: 25,
  preferredTaEntryMode: 'drops',
  preferredChEntryMode: 'drops',
  poolProfile: { ...DEFAULT_POOL_PROFILE },
};

export const DEFAULT_POOL_INFO: PoolInfo = {
  volume: 20000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'salt',
  profile: { ...DEFAULT_POOL_PROFILE },
};

export const EMPTY_READINGS: WaterReadings = {
  freeChlorine: 0,
  combinedChlorine: 0,
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};
