import { describe, expect, it } from 'vitest';
import { createWaterTest } from './testService';
import { DEFAULT_SETTINGS } from '../models/defaults';
import { EMPTY_READINGS, DEFAULT_POOL_INFO } from '../models/defaults';

describe('createWaterTest', () => {
  it('regenerates analysis when updating an existing test id', () => {
    const original = createWaterTest(EMPTY_READINGS, DEFAULT_POOL_INFO, DEFAULT_SETTINGS, 'First');
    const updatedReadings = { ...EMPTY_READINGS, freeChlorine: 5, ph: 8.2 };
    const updated = createWaterTest(
      updatedReadings,
      DEFAULT_POOL_INFO,
      DEFAULT_SETTINGS,
      'Updated notes',
      original.id
    );

    expect(updated.id).toBe(original.id);
    expect(updated.testSource).toBe('taylor_k2006_salt');
    expect(updated.analysis).toBeDefined();
    expect(updated.analysis?.overallScore).not.toBe(original.analysis?.overallScore);
    expect(updated.readings.freeChlorine).toBe(5);
    expect(updated.notes).toBe('Updated notes');
  });
});
