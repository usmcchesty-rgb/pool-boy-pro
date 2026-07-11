import type { AppData, PoolProfileConfig, PoolType, SanitizerType, TemperatureUnit, VolumeUnit } from '../models/types';
import { createDefaultData, storageAdapter, cloneAppData, CORRUPT_STORAGE_ERROR } from '../storage/repository';

export async function exportData(data: AppData): Promise<string> {
  return JSON.stringify(data, null, 2);
}

const REQUIRED_READING_KEYS = [
  'freeChlorine',
  'combinedChlorine',
  'ph',
  'totalAlkalinity',
  'calciumHardness',
  'cyanuricAcid',
  'salt',
  'temperature',
] as const;

const POOL_TYPES: PoolType[] = ['inground', 'above_ground', 'spa'];
const SANITIZER_TYPES: SanitizerType[] = ['chlorine', 'salt', 'bromine'];
const VOLUME_UNITS: VolumeUnit[] = ['gallons', 'liters'];
const TEMPERATURE_UNITS: TemperatureUnit[] = ['fahrenheit', 'celsius'];
const POOL_SURFACES: PoolProfileConfig['surface'][] = ['vinyl', 'fiberglass', 'plaster', 'pebble'];
const POOL_ENVIRONMENTS: PoolProfileConfig['environment'][] = ['outdoor', 'indoor'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validatePoolProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') {
    return 'settings are missing pool profile configuration.';
  }
  const p = profile as Record<string, unknown>;
  if (!POOL_SURFACES.includes(p.surface as PoolProfileConfig['surface'])) {
    return 'settings have an invalid pool surface.';
  }
  if (!SANITIZER_TYPES.includes(p.sanitizer as SanitizerType)) {
    return 'settings have an invalid sanitizer type.';
  }
  if (!POOL_ENVIRONMENTS.includes(p.environment as PoolProfileConfig['environment'])) {
    return 'settings have an invalid pool environment.';
  }
  if (typeof p.spaMode !== 'boolean') {
    return 'settings are missing spa mode configuration.';
  }
  return null;
}

function validateSettings(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object') {
    return 'Backup is missing settings.';
  }
  const s = settings as Record<string, unknown>;
  if (typeof s.poolName !== 'string' || !s.poolName.trim()) {
    return 'settings are missing a pool name.';
  }
  if (!isFiniteNumber(s.defaultPoolVolume) || s.defaultPoolVolume <= 0) {
    return 'settings have an invalid default pool volume.';
  }
  if (!VOLUME_UNITS.includes(s.preferredVolumeUnit as VolumeUnit)) {
    return 'settings have an invalid preferred volume unit.';
  }
  if (!TEMPERATURE_UNITS.includes(s.preferredTemperatureUnit as TemperatureUnit)) {
    return 'settings have an invalid preferred temperature unit.';
  }
  if (!POOL_TYPES.includes(s.defaultPoolType as PoolType)) {
    return 'settings have an invalid default pool type.';
  }
  if (!SANITIZER_TYPES.includes(s.defaultSanitizerType as SanitizerType)) {
    return 'settings have an invalid default sanitizer type.';
  }
  if (!s.chemicalStrengths || typeof s.chemicalStrengths !== 'object') {
    return 'settings are missing chemical strengths.';
  }
  const profileError = validatePoolProfile(s.poolProfile);
  if (profileError) return profileError;
  return null;
}

function validateTest(test: unknown, index: number): string | null {
  if (!test || typeof test !== 'object') {
    return `Test #${index + 1} is not a valid object.`;
  }
  const t = test as Record<string, unknown>;
  if (typeof t.id !== 'string' || !t.id.trim()) {
    return `Test #${index + 1} is missing a valid id.`;
  }
  if (typeof t.date !== 'string' || Number.isNaN(Date.parse(t.date))) {
    return `Test #${index + 1} has an invalid date.`;
  }
  if (!t.readings || typeof t.readings !== 'object') {
    return `Test #${index + 1} is missing water readings.`;
  }
  const readings = t.readings as Record<string, unknown>;
  for (const key of REQUIRED_READING_KEYS) {
    if (!isFiniteNumber(readings[key])) {
      return `Test #${index + 1} has an invalid or missing ${key} reading.`;
    }
  }
  if (
    readings.temperatureUnit !== undefined &&
    !TEMPERATURE_UNITS.includes(readings.temperatureUnit as TemperatureUnit)
  ) {
    return `Test #${index + 1} has an invalid temperature unit.`;
  }
  if (!t.pool || typeof t.pool !== 'object') {
    return `Test #${index + 1} is missing pool information.`;
  }
  const pool = t.pool as Record<string, unknown>;
  if (!isFiniteNumber(pool.volume) || pool.volume <= 0) {
    return `Test #${index + 1} has an invalid pool volume.`;
  }
  if (!VOLUME_UNITS.includes(pool.volumeUnit as VolumeUnit)) {
    return `Test #${index + 1} has an invalid pool volume unit.`;
  }
  if (!POOL_TYPES.includes(pool.poolType as PoolType)) {
    return `Test #${index + 1} has an invalid pool type.`;
  }
  if (!SANITIZER_TYPES.includes(pool.sanitizerType as SanitizerType)) {
    return `Test #${index + 1} has an invalid sanitizer type.`;
  }
  return null;
}

/** Validate backup structure before import; throws with a user-friendly message. */
export function validateImportedBackup(parsed: unknown): void {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file. The file does not contain valid Pool Boy Pro data.');
  }
  const data = parsed as Record<string, unknown>;

  const settingsError = validateSettings(data.settings);
  if (settingsError) {
    throw new Error(`Invalid backup: ${settingsError}`);
  }

  if (!Array.isArray(data.tests)) {
    throw new Error('Invalid backup: tests must be an array.');
  }

  for (let i = 0; i < data.tests.length; i++) {
    const testError = validateTest(data.tests[i], i);
    if (testError) {
      throw new Error(`Invalid backup: ${testError}`);
    }
  }

  if (data.equipment !== undefined && !Array.isArray(data.equipment)) {
    throw new Error('Invalid backup: equipment must be an array when present.');
  }
  if (data.maintenanceTasks !== undefined && !Array.isArray(data.maintenanceTasks)) {
    throw new Error('Invalid backup: maintenance tasks must be an array when present.');
  }
  if (data.chemicalInventory !== undefined && !Array.isArray(data.chemicalInventory)) {
    throw new Error('Invalid backup: chemical inventory must be an array when present.');
  }
}

/** Merge imported backup with defaults for missing or legacy fields */
export function normalizeImportedData(parsed: Partial<AppData>): AppData {
  const defaults = createDefaultData();
  return {
    version: typeof parsed.version === 'number' ? parsed.version : defaults.version,
    settings: {
      ...defaults.settings,
      ...(parsed.settings ?? {}),
      poolProfile: {
        ...defaults.settings.poolProfile,
        ...(parsed.settings?.poolProfile ?? {}),
      },
      chemicalStrengths: {
        ...defaults.settings.chemicalStrengths,
        ...(parsed.settings?.chemicalStrengths ?? {}),
      },
    },
    tests: Array.isArray(parsed.tests) ? parsed.tests : [],
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
    maintenanceTasks: Array.isArray(parsed.maintenanceTasks) ? parsed.maintenanceTasks : [],
    chemicalInventory: Array.isArray(parsed.chemicalInventory) ? parsed.chemicalInventory : [],
  };
}

export async function importData(json: string): Promise<AppData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid backup file. The file is not valid JSON.');
  }

  validateImportedBackup(parsed);
  return normalizeImportedData(parsed as Partial<AppData>);
}

export function downloadBackup(data: AppData, filename?: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `pool-boy-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadInitialData(): Promise<AppData> {
  const stored = await storageAdapter.load();
  return stored ?? createDefaultData();
}

export async function saveData(data: AppData): Promise<void> {
  await storageAdapter.save(data);
}

export { CORRUPT_STORAGE_ERROR, cloneAppData };
