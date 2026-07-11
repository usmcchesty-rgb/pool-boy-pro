import { useMemo, useState } from 'react';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { MaintenanceCard } from '../components/maintenance/MaintenanceCard';
import { PageHeader } from '../components/layout/PageHeader';
import { partitionMaintenanceTasks } from '../models/maintenance';

export function MaintenancePage() {
  const { maintenanceTasks, equipment, completeMaintenanceTask } = useApp();
  const [showInactive, setShowInactive] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const equipmentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of equipment) map.set(item.id, item.name);
    return map;
  }, [equipment]);

  const visible = useMemo(
    () => (showInactive ? maintenanceTasks : maintenanceTasks.filter((t) => t.active)),
    [maintenanceTasks, showInactive]
  );

  const { overdue, dueSoon, upcoming, other } = useMemo(
    () => partitionMaintenanceTasks(visible),
    [visible]
  );

  const inactiveCount = maintenanceTasks.filter((t) => !t.active).length;

  async function handleComplete(id: string) {
    setCompletingId(id);
    await completeMaintenanceTask(id);
    setCompletingId(null);
  }

  function renderSection(title: string, tasks: typeof visible, className?: string) {
    if (tasks.length === 0) return null;
    return (
      <section className={`maintenance-section ${className ?? ''}`}>
        <h2 className="maintenance-section__title">{title}</h2>
        <ul className="maintenance-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <MaintenanceCard
                task={task}
                equipmentName={
                  task.relatedEquipmentId
                    ? equipmentNames.get(task.relatedEquipmentId)
                    : undefined
                }
                onComplete={handleComplete}
                completing={completingId === task.id}
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="page maintenance">
      <PageHeader
        title="Maintenance"
        subtitle="Track routine pool maintenance tasks"
        actions={
          <NavButton to="/maintenance/new">+ Add Task</NavButton>
        }
      />

      <Card className="maintenance-toolbar">
        <div className="maintenance-toolbar__row">
          <p className="maintenance-toolbar__count">
            {visible.length} task{visible.length !== 1 ? 's' : ''}
            {overdue.length > 0 && ` · ${overdue.length} overdue`}
            {inactiveCount > 0 && !showInactive && ` · ${inactiveCount} inactive hidden`}
          </p>
          {inactiveCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInactive((v) => !v)}
            >
              {showInactive ? 'Hide inactive' : 'Show inactive'}
            </Button>
          )}
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="◷"
            title={maintenanceTasks.length === 0 ? 'No maintenance tasks yet' : 'No active tasks'}
            description={
              maintenanceTasks.length === 0
                ? 'Add cleaning, testing, and seasonal maintenance tasks.'
                : 'Show inactive items or add a new task.'
            }
            action={
              <NavButton to="/maintenance/new" variant="secondary">Add Task</NavButton>
            }
          />
        </Card>
      ) : (
        <>
          {renderSection('Overdue', overdue, 'maintenance-section--overdue')}
          {renderSection('Due Soon', dueSoon, 'maintenance-section--due-soon')}
          {renderSection('Upcoming', upcoming)}
          {renderSection('Other', other)}
        </>
      )}
    </div>
  );
}
