import { v4 as uuidv4 } from 'uuid';
import {
  calculateNextDueDate,
  createMaintenanceRecord,
  formatDateOnly,
  todayDateOnly,
  updateMaintenanceRecord,
} from '../models/maintenance';
import type { MaintenanceInput, MaintenanceTask } from '../models/types';

export function createMaintenance(
  input: MaintenanceInput,
  existingId?: string
): MaintenanceTask {
  return createMaintenanceRecord(input, existingId ?? uuidv4());
}

export function updateMaintenance(
  existing: MaintenanceTask,
  input: MaintenanceInput
): MaintenanceTask {
  return updateMaintenanceRecord(existing, input);
}

export function completeMaintenanceTask(
  existing: MaintenanceTask,
  completedDate: string = todayDateOnly()
): MaintenanceTask {
  const now = new Date().toISOString();

  if (existing.frequency === 'one_time') {
    return {
      ...existing,
      lastCompletedDate: completedDate,
      active: false,
      updatedAt: now,
    };
  }

  return {
    ...existing,
    lastCompletedDate: completedDate,
    dueDate: calculateNextDueDate(
      existing.frequency,
      completedDate,
      existing.customIntervalDays
    ),
    updatedAt: now,
  };
}

export function deactivateMaintenanceTask(existing: MaintenanceTask): MaintenanceTask {
  return {
    ...existing,
    active: false,
    updatedAt: new Date().toISOString(),
  };
}

export function activateMaintenanceTask(existing: MaintenanceTask): MaintenanceTask {
  return {
    ...existing,
    active: true,
    updatedAt: new Date().toISOString(),
  };
}

/** Default due date for new tasks — one week from today */
export function defaultDueDate(daysFromNow = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatDateOnly(date);
}
