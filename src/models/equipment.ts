import type { EquipmentInput, EquipmentType, PoolEquipment } from './types';

export const EQUIPMENT_TYPE_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'pump', label: 'Pump' },
  { value: 'filter', label: 'Filter' },
  { value: 'heater', label: 'Heater' },
  { value: 'saltwater_generator', label: 'Saltwater Generator' },
  { value: 'chlorinator', label: 'Chlorinator' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'lights', label: 'Lights' },
  { value: 'automation', label: 'Automation System' },
  { value: 'other', label: 'Other' },
];

export const EMPTY_EQUIPMENT_INPUT: EquipmentInput = {
  type: 'pump',
  name: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  installDate: '',
  warrantyExpiration: '',
  notes: '',
  active: true,
};

export function getEquipmentTypeLabel(type: EquipmentType): string {
  return EQUIPMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function normalizeField(value: string | undefined): string {
  return value?.trim() ?? '';
}

/** Build a new equipment record with defaults and timestamps */
export function createEquipmentRecord(
  input: EquipmentInput,
  id: string,
  now: string = new Date().toISOString()
): PoolEquipment {
  return {
    id,
    type: input.type,
    name: input.name.trim(),
    manufacturer: normalizeField(input.manufacturer),
    model: normalizeField(input.model),
    serialNumber: normalizeField(input.serialNumber),
    installDate: normalizeField(input.installDate),
    warrantyExpiration: normalizeField(input.warrantyExpiration),
    notes: normalizeField(input.notes),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge updates onto an existing equipment record */
export function updateEquipmentRecord(
  existing: PoolEquipment,
  input: EquipmentInput,
  now: string = new Date().toISOString()
): PoolEquipment {
  return {
    ...existing,
    type: input.type,
    name: input.name.trim(),
    manufacturer: normalizeField(input.manufacturer),
    model: normalizeField(input.model),
    serialNumber: normalizeField(input.serialNumber),
    installDate: normalizeField(input.installDate),
    warrantyExpiration: normalizeField(input.warrantyExpiration),
    notes: normalizeField(input.notes),
    active: input.active ?? existing.active,
    updatedAt: now,
  };
}

export function validateEquipmentInput(input: EquipmentInput): string | null {
  if (!input.name.trim()) return 'Equipment name is required.';
  if (!input.type) return 'Equipment type is required.';
  return null;
}

export function sortEquipment(items: PoolEquipment[]): PoolEquipment[] {
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function isWarrantyExpired(equipment: PoolEquipment, today: Date = new Date()): boolean {
  if (!equipment.warrantyExpiration) return false;
  const expiry = new Date(equipment.warrantyExpiration + 'T23:59:59');
  return expiry < today;
}
