import { v4 as uuidv4 } from 'uuid';
import {
  createInventoryRecord,
  updateInventoryRecord,
} from '../models/inventory';
import type { ChemicalInventoryInput, ChemicalInventoryItem } from '../models/types';

export function createInventoryItem(
  input: ChemicalInventoryInput,
  existingId?: string
): ChemicalInventoryItem {
  return createInventoryRecord(input, existingId ?? uuidv4());
}

export function updateInventoryItem(
  existing: ChemicalInventoryItem,
  input: ChemicalInventoryInput
): ChemicalInventoryItem {
  return updateInventoryRecord(existing, input);
}

export function deactivateInventoryItem(existing: ChemicalInventoryItem): ChemicalInventoryItem {
  return {
    ...existing,
    active: false,
    updatedAt: new Date().toISOString(),
  };
}

export function activateInventoryItem(existing: ChemicalInventoryItem): ChemicalInventoryItem {
  return {
    ...existing,
    active: true,
    updatedAt: new Date().toISOString(),
  };
}
