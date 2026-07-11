import { describe, expect, it } from 'vitest';
import {
  EMPTY_INVENTORY_INPUT,
  createInventoryRecord,
  getExpirationStatus,
  getInventoryAlertStatus,
  isLowQuantity,
  partitionInventoryItems,
  sortInventoryItems,
  validateInventoryInput,
} from '../models/inventory';
import type { ChemicalInventoryItem } from '../models/types';
import {
  activateInventoryItem,
  createInventoryItem,
  deactivateInventoryItem,
  updateInventoryItem,
} from '../services/inventoryService';

function makeItem(
  overrides: Partial<ChemicalInventoryItem> & Pick<ChemicalInventoryItem, 'id' | 'productName'>
): ChemicalInventoryItem {
  return createInventoryRecord(
    {
      ...EMPTY_INVENTORY_INPUT,
      productName: overrides.productName,
      chemicalType: overrides.chemicalType ?? 'liquid_chlorine',
      concentration: overrides.concentration ?? '12.5%',
      quantityRemaining: overrides.quantityRemaining ?? null,
      quantityUnit: overrides.quantityUnit ?? 'gallons',
      purchaseDate: overrides.purchaseDate ?? '',
      expirationDate: overrides.expirationDate ?? '',
      cost: overrides.cost ?? null,
      notes: overrides.notes ?? '',
      active: overrides.active ?? true,
    },
    overrides.id,
    overrides.createdAt ?? '2026-01-01T00:00:00Z'
  );
}

describe('inventory model', () => {
  it('creates a record with trimmed fields and defaults', () => {
    const record = createInventoryRecord(
      {
        ...EMPTY_INVENTORY_INPUT,
        productName: '  Pool Chlorine  ',
        concentration: ' 12.5% ',
        quantityRemaining: 2,
      },
      'inv-1',
      '2026-01-01T00:00:00Z'
    );
    expect(record.id).toBe('inv-1');
    expect(record.productName).toBe('Pool Chlorine');
    expect(record.concentration).toBe('12.5%');
    expect(record.quantityRemaining).toBe(2);
    expect(record.active).toBe(true);
  });

  it('validates required product name and non-negative values', () => {
    expect(validateInventoryInput({ ...EMPTY_INVENTORY_INPUT, productName: '  ' })).toContain(
      'Product name'
    );
    expect(
      validateInventoryInput({ ...EMPTY_INVENTORY_INPUT, productName: 'Chlorine', quantityRemaining: -1 })
    ).toContain('Quantity');
    expect(
      validateInventoryInput({ ...EMPTY_INVENTORY_INPUT, productName: 'Chlorine', cost: -5 })
    ).toContain('Cost');
  });

  it('detects expired and near-expired items', () => {
    const today = new Date('2026-07-05T12:00:00');
    const expired = makeItem({ id: '1', productName: 'Old Acid', expirationDate: '2026-06-01' });
    const nearExpired = makeItem({ id: '2', productName: 'Bleach', expirationDate: '2026-07-20' });
    const ok = makeItem({ id: '3', productName: 'Salt', expirationDate: '2027-01-01' });

    expect(getExpirationStatus(expired, today)).toBe('expired');
    expect(getExpirationStatus(nearExpired, today)).toBe('near_expired');
    expect(getExpirationStatus(ok, today)).toBe('ok');
    expect(getInventoryAlertStatus(expired)).toBe('expired');
  });

  it('detects low quantity when amount is entered', () => {
    const low = makeItem({
      id: '1',
      productName: 'Low Chlorine',
      quantityRemaining: 0.5,
      quantityUnit: 'gallons',
    });
    const fine = makeItem({
      id: '2',
      productName: 'Full Chlorine',
      quantityRemaining: 5,
      quantityUnit: 'gallons',
    });
    const untracked = makeItem({ id: '3', productName: 'Unknown', quantityRemaining: null });

    expect(isLowQuantity(low)).toBe(true);
    expect(isLowQuantity(fine)).toBe(false);
    expect(isLowQuantity(untracked)).toBe(false);
    expect(getInventoryAlertStatus(low)).toBe('low_quantity');
  });

  it('sorts active expired items before ok items', () => {
    const today = new Date('2026-07-05T12:00:00');
    const items = [
      makeItem({ id: '1', productName: 'Zebra', expirationDate: '2027-01-01' }),
      makeItem({ id: '2', productName: 'Expired', expirationDate: '2026-06-01' }),
      makeItem({ id: '3', productName: 'Inactive', active: false }),
      makeItem({
        id: '4',
        productName: 'Low Stock',
        quantityRemaining: 0.5,
        quantityUnit: 'gallons',
        expirationDate: '2027-01-01',
      }),
    ];

    const sorted = sortInventoryItems(items);
    expect(sorted[0].productName).toBe('Expired');
    expect(sorted[1].productName).toBe('Low Stock');
    expect(sorted[sorted.length - 1].productName).toBe('Inactive');

    const groups = partitionInventoryItems(items);
    expect(groups.expired.map((i) => i.productName)).toEqual(['Expired']);
    expect(groups.lowQuantity.map((i) => i.productName)).toEqual(['Low Stock']);
    expect(getExpirationStatus(groups.expired[0], today)).toBe('expired');
  });
});

describe('inventory service', () => {
  it('creates inventory with generated id', () => {
    const item = createInventoryItem(
      { ...EMPTY_INVENTORY_INPUT, productName: 'Liquid Chlorine' },
      'fixed-id'
    );
    expect(item.id).toBe('fixed-id');
    expect(item.productName).toBe('Liquid Chlorine');
  });

  it('updates inventory fields', () => {
    const item = createInventoryItem(
      { ...EMPTY_INVENTORY_INPUT, productName: 'Bleach' },
      'b1'
    );
    const updated = updateInventoryItem(item, {
      ...EMPTY_INVENTORY_INPUT,
      productName: 'Household Bleach',
      chemicalType: 'bleach',
      quantityRemaining: 2,
    });
    expect(updated.productName).toBe('Household Bleach');
    expect(updated.quantityRemaining).toBe(2);
  });

  it('deactivates and reactivates inventory items', () => {
    const item = createInventoryItem(
      { ...EMPTY_INVENTORY_INPUT, productName: 'Salt' },
      's1'
    );
    const inactive = deactivateInventoryItem(item);
    expect(inactive.active).toBe(false);
    expect(activateInventoryItem(inactive).active).toBe(true);
  });
});
