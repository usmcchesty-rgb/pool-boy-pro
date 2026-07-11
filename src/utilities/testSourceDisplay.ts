import type { StripAccuracyLevel, WaterTest } from '../models/types';
import { getTestSource } from './historyFilters';

export const TEST_SOURCE_DISPLAY_LABELS = {
  taylor: 'Taylor Test',
  strip: 'Strip Test',
  cloroxStrip: 'Clorox Strip',
} as const;

/** Primary label shown in history and dashboard */
export function getTestSourceDisplayLabel(test: WaterTest): string {
  if (getTestSource(test) === 'test_strip') {
    return TEST_SOURCE_DISPLAY_LABELS.cloroxStrip;
  }
  return TEST_SOURCE_DISPLAY_LABELS.taylor;
}

/** Estimated accuracy for dashboard display */
export function getTestAccuracyLevel(test: WaterTest): StripAccuracyLevel | 'high' {
  if (getTestSource(test) === 'test_strip') {
    return test.stripMetadata?.accuracyLevel ?? 'medium';
  }
  return 'high';
}

export function getTestAccuracyLabel(test: WaterTest): string {
  const level = getTestAccuracyLevel(test);
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  return 'Low';
}
