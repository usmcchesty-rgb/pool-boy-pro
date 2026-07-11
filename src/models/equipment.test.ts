import { describe, expect, it } from 'vitest';
import {
  EMPTY_EQUIPMENT_INPUT,
  createEquipmentRecord,
  sortEquipment,
  updateEquipmentRecord,
  validateEquipmentInput,
} from '../models/equipment';
import type { PoolEquipment } from '../models/types';
import {
  activateEquipment,
  createEquipment,
  deactivateEquipment,
  updateEquipment,
} from '../services/equipmentService';

describe('equipment model', () => {
  it('creates a record with defaults and trimmed fields', () => {
    const record = createEquipmentRecord(
      {
        ...EMPTY_EQUIPMENT_INPUT,
        name: '  Main Pump  ',
        manufacturer: ' Pentair ',
      },
      'eq-1',
      '2026-01-01T00:00:00Z'
    );
    expect(record.id).toBe('eq-1');
    expect(record.name).toBe('Main Pump');
    expect(record.manufacturer).toBe('Pentair');
    expect(record.active).toBe(true);
    expect(record.createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('validates required name', () => {
    expect(validateEquipmentInput({ ...EMPTY_EQUIPMENT_INPUT, name: '  ' })).toContain('name');
  });

  it('sorts active equipment before inactive by name', () => {
    const items: PoolEquipment[] = [
      createEquipmentRecord({ ...EMPTY_EQUIPMENT_INPUT, name: 'Zebra', active: false }, '1'),
      createEquipmentRecord({ ...EMPTY_EQUIPMENT_INPUT, name: 'Alpha', active: true }, '2'),
      createEquipmentRecord({ ...EMPTY_EQUIPMENT_INPUT, name: 'Beta', active: false }, '3'),
    ];
    const sorted = sortEquipment(items);
    expect(sorted[0].name).toBe('Alpha');
    expect(sorted.every((item, index) => index === 0 || !sorted[index - 1].active || !item.active)).toBe(true);
  });

  it('updates record while preserving id and createdAt', () => {
    const existing = createEquipmentRecord(
      { ...EMPTY_EQUIPMENT_INPUT, name: 'Pump' },
      'eq-1',
      '2026-01-01T00:00:00Z'
    );
    const updated = updateEquipmentRecord(
      existing,
      { ...EMPTY_EQUIPMENT_INPUT, name: 'Updated Pump', model: 'SuperFlo' },
      '2026-02-01T00:00:00Z'
    );
    expect(updated.id).toBe('eq-1');
    expect(updated.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(updated.model).toBe('SuperFlo');
    expect(updated.updatedAt).toBe('2026-02-01T00:00:00Z');
  });
});

describe('equipment service', () => {
  it('creates equipment with generated id', () => {
    const item = createEquipment({ ...EMPTY_EQUIPMENT_INPUT, name: 'Filter' }, 'fixed-id');
    expect(item.id).toBe('fixed-id');
    expect(item.name).toBe('Filter');
  });

  it('deactivates and reactivates equipment', () => {
    const item = createEquipment({ ...EMPTY_EQUIPMENT_INPUT, name: 'Heater' }, 'h1');
    const inactive = deactivateEquipment(item);
    expect(inactive.active).toBe(false);
    expect(activateEquipment(inactive).active).toBe(true);
  });

  it('updates equipment fields', () => {
    const item = createEquipment({ ...EMPTY_EQUIPMENT_INPUT, name: 'SWG' }, 's1');
    const updated = updateEquipment(item, {
      ...EMPTY_EQUIPMENT_INPUT,
      name: 'Salt Cell',
      type: 'saltwater_generator',
    });
    expect(updated.name).toBe('Salt Cell');
    expect(updated.type).toBe('saltwater_generator');
  });
});
