import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalType,
  InventoryQuantityUnit,
} from './types';
import { parseDateOnly, todayDateOnly } from './maintenance';

export const CHEMICAL_TYPE_OPTIONS: { value: ChemicalType; label: string }[] = [
  { value: 'liquid_chlorine', label: 'Liquid Chlorine' },
  { value: 'bleach', label: 'Bleach' },
  { value: 'muriatic_acid', label: 'Muriatic Acid' },
  { value: 'dry_acid', label: 'Dry Acid' },
  { value: 'baking_soda', label: 'Baking Soda' },
  { value: 'soda_ash', label: 'Soda Ash' },
  { value: 'calcium_chloride', label: 'Calcium Chloride' },
  { value: 'cyanuric_acid', label: 'Cyanuric Acid / Stabilizer' },
  { value: 'salt', label: 'Salt' },
  { value: 'other', label: 'Other' },
];

export const INVENTORY_QUANTITY_UNIT_OPTIONS: { value: InventoryQuantityUnit; label: string }[] = [
  { value: 'gallons', label: 'Gallons' },
  { value: 'liters', label: 'Liters' },
  { value: 'pounds', label: 'Pounds' },
  { value: 'ounces', label: 'Ounces' },
  { value: 'kilograms', label: 'Kilograms' },
  { value: 'bags', label: 'Bags' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'other', label: 'Other' },
];

export const LOW_QUANTITY_THRESHOLDS: Record<InventoryQuantityUnit, number> = {
  gallons: 1,
  liters: 4,
  pounds: 5,
  ounces: 16,
  kilograms: 2,
  bags: 1,
  bottles: 1,
  other: 1,
};

export const NEAR_EXPIRATION_DAYS = 30;

export const EMPTY_INVENTORY_INPUT: ChemicalInventoryInput = {
  productName: '',
  chemicalType: 'liquid_chlorine',
  concentration: '',
  quantityRemaining: null,
  quantityUnit: 'gallons',
  purchaseDate: '',
  expirationDate: '',
  cost: null,
  notes: '',
  active: true,
};

export type InventoryExpirationStatus = 'expired' | 'near_expired' | 'ok' | 'none';

export type InventoryAlertStatus = 'expired' | 'near_expired' | 'low_quantity' | 'ok' | 'inactive';

function normalizeField(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function getChemicalTypeLabel(type: ChemicalType): string {
  return CHEMICAL_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function getQuantityUnitLabel(unit: InventoryQuantityUnit): string {
  return INVENTORY_QUANTITY_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}

export function formatQuantity(
  quantity: number | null,
  unit: InventoryQuantityUnit
): string | null {
  if (quantity == null) return null;
  const unitLabel = getQuantityUnitLabel(unit).toLowerCase();
  return `${quantity} ${unitLabel}`;
}

export function createInventoryRecord(
  input: ChemicalInventoryInput,
  id: string,
  now: string = new Date().toISOString()
): ChemicalInventoryItem {
  return {
    id,
    productName: input.productName.trim(),
    chemicalType: input.chemicalType,
    concentration: normalizeField(input.concentration),
    quantityRemaining: normalizeQuantity(input.quantityRemaining),
    quantityUnit: input.quantityUnit ?? 'gallons',
    purchaseDate: normalizeField(input.purchaseDate),
    expirationDate: normalizeField(input.expirationDate),
    cost: normalizeCost(input.cost),
    notes: normalizeField(input.notes),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateInventoryRecord(
  existing: ChemicalInventoryItem,
  input: ChemicalInventoryInput,
  now: string = new Date().toISOString()
): ChemicalInventoryItem {
  return {
    ...existing,
    productName: input.productName.trim(),
    chemicalType: input.chemicalType,
    concentration: normalizeField(input.concentration),
    quantityRemaining: normalizeQuantity(input.quantityRemaining),
    quantityUnit: input.quantityUnit ?? existing.quantityUnit,
    purchaseDate: normalizeField(input.purchaseDate),
    expirationDate: normalizeField(input.expirationDate),
    cost: normalizeCost(input.cost),
    notes: normalizeField(input.notes),
    active: input.active ?? existing.active,
    updatedAt: now,
  };
}

function normalizeQuantity(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function normalizeCost(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

export function validateInventoryInput(input: ChemicalInventoryInput): string | null {
  if (!input.productName.trim()) return 'Product name is required.';
  if (!input.chemicalType) return 'Chemical type is required.';
  if (input.quantityRemaining != null && input.quantityRemaining < 0) {
    return 'Quantity remaining cannot be negative.';
  }
  if (input.cost != null && input.cost < 0) {
    return 'Cost cannot be negative.';
  }
  return null;
}

export function getExpirationStatus(
  item: ChemicalInventoryItem,
  today: Date = new Date(),
  nearDays = NEAR_EXPIRATION_DAYS
): InventoryExpirationStatus {
  if (!item.expirationDate) return 'none';

  const expiry = parseDateOnly(item.expirationDate);
  const todayOnly = parseDateOnly(todayDateOnly(today));

  if (expiry < todayOnly) return 'expired';

  const nearLimit = new Date(todayOnly);
  nearLimit.setDate(nearLimit.getDate() + nearDays);
  if (expiry <= nearLimit) return 'near_expired';

  return 'ok';
}

export function isLowQuantity(item: ChemicalInventoryItem): boolean {
  if (item.quantityRemaining == null || item.quantityRemaining < 0) return false;
  const threshold = LOW_QUANTITY_THRESHOLDS[item.quantityUnit] ?? 1;
  return item.quantityRemaining <= threshold;
}

export function getInventoryAlertStatus(item: ChemicalInventoryItem): InventoryAlertStatus {
  if (!item.active) return 'inactive';
  const expiration = getExpirationStatus(item);
  if (expiration === 'expired') return 'expired';
  if (expiration === 'near_expired') return 'near_expired';
  if (isLowQuantity(item)) return 'low_quantity';
  return 'ok';
}

const ALERT_STATUS_ORDER: Record<InventoryAlertStatus, number> = {
  expired: 0,
  near_expired: 1,
  low_quantity: 2,
  ok: 3,
  inactive: 4,
};

export function sortInventoryItems(items: ChemicalInventoryItem[]): ChemicalInventoryItem[] {
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;

    const statusA = getInventoryAlertStatus(a);
    const statusB = getInventoryAlertStatus(b);
    if (ALERT_STATUS_ORDER[statusA] !== ALERT_STATUS_ORDER[statusB]) {
      return ALERT_STATUS_ORDER[statusA] - ALERT_STATUS_ORDER[statusB];
    }

    return a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' });
  });
}

export function partitionInventoryItems(items: ChemicalInventoryItem[]): {
  expired: ChemicalInventoryItem[];
  nearExpired: ChemicalInventoryItem[];
  lowQuantity: ChemicalInventoryItem[];
  other: ChemicalInventoryItem[];
} {
  const expired: ChemicalInventoryItem[] = [];
  const nearExpired: ChemicalInventoryItem[] = [];
  const lowQuantity: ChemicalInventoryItem[] = [];
  const other: ChemicalInventoryItem[] = [];
  const seenLow = new Set<string>();

  for (const item of sortInventoryItems(items)) {
    if (!item.active) {
      other.push(item);
      continue;
    }

    const expiration = getExpirationStatus(item);
    if (expiration === 'expired') {
      expired.push(item);
      continue;
    }
    if (expiration === 'near_expired') {
      nearExpired.push(item);
      continue;
    }
    if (isLowQuantity(item) && !seenLow.has(item.id)) {
      lowQuantity.push(item);
      seenLow.add(item.id);
      continue;
    }
    other.push(item);
  }

  return { expired, nearExpired, lowQuantity, other };
}
