import { v4 as uuidv4 } from 'uuid';
import {
  createEquipmentRecord,
  updateEquipmentRecord,
} from '../models/equipment';
import type { EquipmentInput, PoolEquipment } from '../models/types';

export function createEquipment(
  input: EquipmentInput,
  existingId?: string
): PoolEquipment {
  return createEquipmentRecord(input, existingId ?? uuidv4());
}

export function updateEquipment(
  existing: PoolEquipment,
  input: EquipmentInput
): PoolEquipment {
  return updateEquipmentRecord(existing, input);
}

export function deactivateEquipment(existing: PoolEquipment): PoolEquipment {
  return {
    ...existing,
    active: false,
    updatedAt: new Date().toISOString(),
  };
}

export function activateEquipment(existing: PoolEquipment): PoolEquipment {
  return {
    ...existing,
    active: true,
    updatedAt: new Date().toISOString(),
  };
}
