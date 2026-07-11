import { describe, expect, it } from 'vitest';
import { cloneAppData, createDefaultData, CORRUPT_STORAGE_ERROR } from './repository';

describe('repository reliability', () => {
  it('cloneAppData creates new collection references for React updates', () => {
    const original = createDefaultData();
    original.tests.push({
      id: 't1',
      date: '2026-01-01',
      readings: {} as never,
      pool: {} as never,
    });

    const cloned = cloneAppData(original);

    expect(cloned).not.toBe(original);
    expect(cloned.tests).not.toBe(original.tests);
    expect(cloned.settings).not.toBe(original.settings);
    expect(cloned.tests).toHaveLength(1);
  });

  it('exports a stable corrupt storage error code', () => {
    expect(CORRUPT_STORAGE_ERROR).toBe('CORRUPT_STORAGE');
  });
});
