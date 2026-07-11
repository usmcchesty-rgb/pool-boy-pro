import { v4 as uuidv4 } from 'uuid';
import { analyzeTest } from '../chemistry/recommendations';
import type { AppSettings, PoolInfo, WaterReadings, WaterTest } from '../models/types';
import { DEFAULT_POOL_INFO } from '../models/defaults';

export function createWaterTest(
  readings: WaterReadings,
  pool: PoolInfo,
  settings: AppSettings,
  notes?: string,
  existingId?: string
): WaterTest {
  const analysis = analyzeTest(readings, pool, settings.chemicalStrengths);
  return {
    id: existingId ?? uuidv4(),
    date: new Date().toISOString(),
    readings,
    pool,
    notes,
    analysis,
    testSource: 'taylor_k2006_salt',
  };
}

export function poolFromSettings(settings: AppSettings): PoolInfo {
  const profile = settings.poolProfile;
  return {
    volume: settings.defaultPoolVolume,
    volumeUnit: settings.preferredVolumeUnit,
    poolType: profile.spaMode ? 'spa' : settings.defaultPoolType === 'spa' ? 'inground' : settings.defaultPoolType,
    sanitizerType: profile.sanitizer,
    profile,
  };
}

export { DEFAULT_POOL_INFO };
