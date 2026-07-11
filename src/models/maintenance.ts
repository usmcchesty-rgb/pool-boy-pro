import type {
  MaintenanceCategory,
  MaintenanceFrequency,
  MaintenanceInput,
  MaintenanceTask,
} from './types';

export const MAINTENANCE_CATEGORY_OPTIONS: { value: MaintenanceCategory; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'water_testing', label: 'Water Testing' },
  { value: 'chemical_treatment', label: 'Chemical Treatment' },
  { value: 'filter_maintenance', label: 'Filter Maintenance' },
  { value: 'equipment_service', label: 'Equipment Service' },
  { value: 'seasonal_opening', label: 'Seasonal Opening' },
  { value: 'seasonal_closing', label: 'Seasonal Closing' },
  { value: 'other', label: 'Other' },
];

export const MAINTENANCE_FREQUENCY_OPTIONS: { value: MaintenanceFrequency; label: string }[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export const EMPTY_MAINTENANCE_INPUT: MaintenanceInput = {
  title: '',
  category: 'cleaning',
  frequency: 'weekly',
  dueDate: '',
  lastCompletedDate: '',
  relatedEquipmentId: '',
  notes: '',
  active: true,
  customIntervalDays: undefined,
};

export type MaintenanceDueStatus =
  | 'overdue'
  | 'due_soon'
  | 'upcoming'
  | 'no_due_date'
  | 'inactive';

function normalizeField(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function getMaintenanceCategoryLabel(category: MaintenanceCategory): string {
  return MAINTENANCE_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export function getMaintenanceFrequencyLabel(frequency: MaintenanceFrequency): string {
  return MAINTENANCE_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? frequency;
}

export function isRecurringFrequency(frequency: MaintenanceFrequency): boolean {
  return frequency !== 'one_time';
}

/** Parse YYYY-MM-DD as local noon to avoid timezone drift */
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Format a Date as YYYY-MM-DD in local time */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateOnly(now: Date = new Date()): string {
  return formatDateOnly(now);
}

/** Calculate the next due date after a completion */
export function calculateNextDueDate(
  frequency: MaintenanceFrequency,
  completedDate: string,
  customIntervalDays?: number
): string {
  if (frequency === 'one_time') return completedDate;

  const next = parseDateOnly(completedDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'custom':
      next.setDate(next.getDate() + Math.max(1, customIntervalDays ?? 1));
      break;
  }

  return formatDateOnly(next);
}

export function createMaintenanceRecord(
  input: MaintenanceInput,
  id: string,
  now: string = new Date().toISOString()
): MaintenanceTask {
  const customIntervalDays =
    input.frequency === 'custom' && input.customIntervalDays
      ? input.customIntervalDays
      : undefined;

  return {
    id,
    title: input.title.trim(),
    category: input.category,
    frequency: input.frequency,
    dueDate: normalizeField(input.dueDate),
    lastCompletedDate: normalizeField(input.lastCompletedDate),
    relatedEquipmentId: normalizeField(input.relatedEquipmentId),
    notes: normalizeField(input.notes),
    active: input.active ?? true,
    customIntervalDays,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMaintenanceRecord(
  existing: MaintenanceTask,
  input: MaintenanceInput,
  now: string = new Date().toISOString()
): MaintenanceTask {
  const customIntervalDays =
    input.frequency === 'custom' && input.customIntervalDays
      ? input.customIntervalDays
      : undefined;

  return {
    ...existing,
    title: input.title.trim(),
    category: input.category,
    frequency: input.frequency,
    dueDate: normalizeField(input.dueDate),
    lastCompletedDate: normalizeField(input.lastCompletedDate),
    relatedEquipmentId: normalizeField(input.relatedEquipmentId),
    notes: normalizeField(input.notes),
    active: input.active ?? existing.active,
    customIntervalDays,
    updatedAt: now,
  };
}

export function validateMaintenanceInput(input: MaintenanceInput): string | null {
  if (!input.title.trim()) return 'Task title is required.';
  if (!input.category) return 'Category is required.';
  if (!input.frequency) return 'Frequency is required.';
  if (input.frequency === 'custom') {
    if (!input.customIntervalDays || input.customIntervalDays < 1) {
      return 'Custom frequency requires an interval of at least 1 day.';
    }
  }
  if ((input.active ?? true) && !normalizeField(input.dueDate)) {
    return 'Due date is required for active tasks.';
  }
  return null;
}

export function getMaintenanceDueStatus(
  task: MaintenanceTask,
  today: Date = new Date(),
  dueSoonDays = 7
): MaintenanceDueStatus {
  if (!task.active) return 'inactive';
  if (!task.dueDate) return 'no_due_date';

  const due = parseDateOnly(task.dueDate);
  const todayOnly = parseDateOnly(todayDateOnly(today));

  if (due < todayOnly) return 'overdue';

  const soonLimit = new Date(todayOnly);
  soonLimit.setDate(soonLimit.getDate() + dueSoonDays);
  if (due <= soonLimit) return 'due_soon';

  return 'upcoming';
}

const DUE_STATUS_ORDER: Record<MaintenanceDueStatus, number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  no_due_date: 3,
  inactive: 4,
};

export function sortMaintenanceTasks(tasks: MaintenanceTask[]): MaintenanceTask[] {
  return [...tasks].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;

    const statusA = getMaintenanceDueStatus(a);
    const statusB = getMaintenanceDueStatus(b);
    if (DUE_STATUS_ORDER[statusA] !== DUE_STATUS_ORDER[statusB]) {
      return DUE_STATUS_ORDER[statusA] - DUE_STATUS_ORDER[statusB];
    }

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

export function partitionMaintenanceTasks(tasks: MaintenanceTask[]): {
  overdue: MaintenanceTask[];
  dueSoon: MaintenanceTask[];
  upcoming: MaintenanceTask[];
  other: MaintenanceTask[];
} {
  const overdue: MaintenanceTask[] = [];
  const dueSoon: MaintenanceTask[] = [];
  const upcoming: MaintenanceTask[] = [];
  const other: MaintenanceTask[] = [];

  for (const task of sortMaintenanceTasks(tasks)) {
    const status = getMaintenanceDueStatus(task);
    if (status === 'overdue') overdue.push(task);
    else if (status === 'due_soon') dueSoon.push(task);
    else if (status === 'upcoming') upcoming.push(task);
    else other.push(task);
  }

  return { overdue, dueSoon, upcoming, other };
}
