import { describe, expect, it } from 'vitest';
import {
  EMPTY_MAINTENANCE_INPUT,
  calculateNextDueDate,
  createMaintenanceRecord,
  getMaintenanceDueStatus,
  partitionMaintenanceTasks,
  sortMaintenanceTasks,
  validateMaintenanceInput,
} from '../models/maintenance';
import type { MaintenanceTask } from '../models/types';
import {
  completeMaintenanceTask,
  createMaintenance,
  deactivateMaintenanceTask,
} from '../services/maintenanceService';

function makeTask(
  overrides: Partial<MaintenanceTask> & Pick<MaintenanceTask, 'id' | 'title'>
): MaintenanceTask {
  return createMaintenanceRecord(
    {
      ...EMPTY_MAINTENANCE_INPUT,
      title: overrides.title,
      category: overrides.category ?? 'cleaning',
      frequency: overrides.frequency ?? 'weekly',
      dueDate: overrides.dueDate ?? '2026-07-01',
      lastCompletedDate: overrides.lastCompletedDate ?? '',
      relatedEquipmentId: overrides.relatedEquipmentId ?? '',
      notes: overrides.notes ?? '',
      active: overrides.active ?? true,
      customIntervalDays: overrides.customIntervalDays,
    },
    overrides.id,
    overrides.createdAt ?? '2026-01-01T00:00:00Z'
  );
}

describe('maintenance model', () => {
  it('creates a record with trimmed fields and defaults', () => {
    const record = createMaintenanceRecord(
      {
        ...EMPTY_MAINTENANCE_INPUT,
        title: '  Brush walls  ',
        dueDate: '2026-07-10',
      },
      'm1',
      '2026-01-01T00:00:00Z'
    );
    expect(record.id).toBe('m1');
    expect(record.title).toBe('Brush walls');
    expect(record.active).toBe(true);
    expect(record.dueDate).toBe('2026-07-10');
  });

  it('validates required title and due date for active tasks', () => {
    expect(validateMaintenanceInput({ ...EMPTY_MAINTENANCE_INPUT, title: '  ' })).toContain('title');
    expect(
      validateMaintenanceInput({ ...EMPTY_MAINTENANCE_INPUT, title: 'Test', dueDate: '' })
    ).toContain('Due date');
    expect(
      validateMaintenanceInput({
        ...EMPTY_MAINTENANCE_INPUT,
        title: 'Custom task',
        frequency: 'custom',
        dueDate: '2026-07-01',
      })
    ).toContain('Custom frequency');
  });

  it('calculates next due dates by frequency', () => {
    expect(calculateNextDueDate('daily', '2026-07-01')).toBe('2026-07-02');
    expect(calculateNextDueDate('weekly', '2026-07-01')).toBe('2026-07-08');
    expect(calculateNextDueDate('biweekly', '2026-07-01')).toBe('2026-07-15');
    expect(calculateNextDueDate('monthly', '2026-07-01')).toBe('2026-08-01');
    expect(calculateNextDueDate('quarterly', '2026-07-01')).toBe('2026-10-01');
    expect(calculateNextDueDate('yearly', '2026-07-01')).toBe('2027-07-01');
    expect(calculateNextDueDate('custom', '2026-07-01', 10)).toBe('2026-07-11');
  });

  it('sorts overdue before due soon and upcoming', () => {
    const today = new Date('2026-07-05T12:00:00');
    const tasks = [
      makeTask({ id: '1', title: 'Upcoming', dueDate: '2026-07-20' }),
      makeTask({ id: '2', title: 'Overdue', dueDate: '2026-07-01' }),
      makeTask({ id: '3', title: 'Due soon', dueDate: '2026-07-08' }),
      makeTask({ id: '4', title: 'Inactive', dueDate: '2026-07-01', active: false }),
    ];

    const sorted = sortMaintenanceTasks(tasks);
    expect(sorted.map((t) => t.title)).toEqual(['Overdue', 'Due soon', 'Upcoming', 'Inactive']);

    expect(getMaintenanceDueStatus(tasks[1], today)).toBe('overdue');
    expect(getMaintenanceDueStatus(tasks[2], today)).toBe('due_soon');
    expect(getMaintenanceDueStatus(tasks[0], today)).toBe('upcoming');
  });

  it('partitions tasks into overdue, due soon, and upcoming groups', () => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 10);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + 3);
    const upcomingDate = new Date(today);
    upcomingDate.setDate(upcomingDate.getDate() + 30);

    const tasks = [
      makeTask({ id: '1', title: 'Upcoming', dueDate: fmt(upcomingDate) }),
      makeTask({ id: '2', title: 'Overdue', dueDate: fmt(overdueDate) }),
      makeTask({ id: '3', title: 'Due soon', dueDate: fmt(dueSoonDate) }),
    ];

    const groups = partitionMaintenanceTasks(tasks);
    expect(groups.overdue.map((t) => t.title)).toEqual(['Overdue']);
    expect(groups.dueSoon.map((t) => t.title)).toEqual(['Due soon']);
    expect(groups.upcoming.map((t) => t.title)).toEqual(['Upcoming']);

    expect(getMaintenanceDueStatus(groups.overdue[0], today)).toBe('overdue');
  });
});

describe('maintenance service', () => {
  it('creates maintenance with generated id', () => {
    const task = createMaintenance(
      { ...EMPTY_MAINTENANCE_INPUT, title: 'Skim pool', dueDate: '2026-07-10' },
      'fixed-id'
    );
    expect(task.id).toBe('fixed-id');
    expect(task.title).toBe('Skim pool');
  });

  it('completes recurring tasks and advances due date', () => {
    const task = createMaintenance(
      {
        ...EMPTY_MAINTENANCE_INPUT,
        title: 'Weekly skim',
        frequency: 'weekly',
        dueDate: '2026-07-01',
      },
      'w1'
    );
    const completed = completeMaintenanceTask(task, '2026-07-05');
    expect(completed.lastCompletedDate).toBe('2026-07-05');
    expect(completed.dueDate).toBe('2026-07-12');
    expect(completed.active).toBe(true);
  });

  it('completes one-time tasks by marking inactive', () => {
    const task = createMaintenance(
      {
        ...EMPTY_MAINTENANCE_INPUT,
        title: 'Open pool',
        frequency: 'one_time',
        dueDate: '2026-04-01',
      },
      'o1'
    );
    const completed = completeMaintenanceTask(task, '2026-04-01');
    expect(completed.lastCompletedDate).toBe('2026-04-01');
    expect(completed.active).toBe(false);
  });

  it('deactivates tasks without deleting them', () => {
    const task = createMaintenance(
      { ...EMPTY_MAINTENANCE_INPUT, title: 'Backwash', dueDate: '2026-07-01' },
      'b1'
    );
    const inactive = deactivateMaintenanceTask(task);
    expect(inactive.active).toBe(false);
  });
});
