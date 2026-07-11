import { describe, expect, it } from 'vitest';
import { importData, normalizeImportedData, validateImportedBackup } from './dataService';
import { DEFAULT_SETTINGS } from '../models/defaults';

const validReadings = {
  freeChlorine: 2,
  combinedChlorine: 0.2,
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};

const validPool = {
  volume: 10000,
  volumeUnit: 'gallons',
  poolType: 'inground',
  sanitizerType: 'chlorine',
};

function validBackup(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    settings: {
      poolName: 'Test Pool',
      preferredVolumeUnit: 'gallons',
      preferredTemperatureUnit: 'fahrenheit',
      defaultPoolVolume: 10000,
      defaultPoolType: 'inground',
      defaultSanitizerType: 'chlorine',
      chemicalStrengths: DEFAULT_SETTINGS.chemicalStrengths,
      theme: 'light',
      preferredFasDpdSampleSize: 10,
      preferredTaEntryMode: 'drops',
      preferredChEntryMode: 'drops',
      poolProfile: {
        surface: 'vinyl',
        sanitizer: 'chlorine',
        environment: 'outdoor',
        spaMode: false,
      },
    },
    tests: [
      {
        id: 't1',
        date: '2026-01-01T12:00:00.000Z',
        readings: validReadings,
        pool: validPool,
      },
    ],
    ...overrides,
  };
}

describe('dataService import', () => {
  it('normalizes legacy backups missing newer collections', () => {
    const normalized = normalizeImportedData({
      version: 1,
      settings: {
        poolName: 'Legacy Pool',
        preferredVolumeUnit: 'gallons',
        preferredTemperatureUnit: 'fahrenheit',
        defaultPoolVolume: 10000,
        defaultPoolType: 'inground',
        defaultSanitizerType: 'chlorine',
        chemicalStrengths: {},
        theme: 'light',
        preferredFasDpdSampleSize: 10,
        preferredTaEntryMode: 'drops',
        preferredChEntryMode: 'drops',
        poolProfile: {
          surface: 'vinyl',
          sanitizer: 'chlorine',
          environment: 'outdoor',
          spaMode: false,
        },
      },
      tests: [],
    } as never);

    expect(normalized.equipment).toEqual([]);
    expect(normalized.maintenanceTasks).toEqual([]);
    expect(normalized.chemicalInventory).toEqual([]);
    expect(normalized.settings.poolName).toBe('Legacy Pool');
  });

  it('rejects invalid backup files', async () => {
    await expect(importData('not json')).rejects.toThrow(/not valid JSON/i);
    await expect(importData('{}')).rejects.toThrow(/Invalid backup/i);
  });

  it('rejects backups with malformed tests before import', async () => {
    const backup = JSON.stringify(
      validBackup({
        tests: [{ id: 't1', date: '2026-01-01', readings: {}, pool: {} }],
      })
    );
    await expect(importData(backup)).rejects.toThrow(/invalid or missing freeChlorine/i);
  });

  it('rejects backups with missing settings', () => {
    expect(() => validateImportedBackup({ tests: [] })).toThrow(/missing settings/i);
  });

  it('rejects backups with non-array equipment', () => {
    expect(() => validateImportedBackup({ ...validBackup(), equipment: {} })).toThrow(
      /equipment must be an array/i
    );
  });

  it('imports valid backups with defaults for missing arrays', async () => {
    const imported = await importData(JSON.stringify(validBackup()));
    expect(imported.tests).toHaveLength(1);
    expect(imported.tests[0].readings.freeChlorine).toBe(2);
    expect(imported.equipment).toEqual([]);
  });
});
