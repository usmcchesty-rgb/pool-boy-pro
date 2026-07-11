import type { StripCalibrationData } from './types';
import { validateCalibrationImport } from './validation';

const STORAGE_KEY = 'poolBoyPro_stripCalibration';

export function loadImportedCalibration(): StripCalibrationData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const result = validateCalibrationImport(parsed);
    return result.valid && result.data ? result.data : null;
  } catch {
    return null;
  }
}

export function saveImportedCalibration(data: StripCalibrationData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearImportedCalibration(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function importCalibrationFromJson(raw: unknown): { ok: true; data: StripCalibrationData } | { ok: false; errors: string[] } {
  const result = validateCalibrationImport(raw);
  if (!result.valid || !result.data) {
    return { ok: false, errors: result.errors.map((e) => `${e.path}: ${e.message}`) };
  }
  saveImportedCalibration(result.data);
  return { ok: true, data: result.data };
}
