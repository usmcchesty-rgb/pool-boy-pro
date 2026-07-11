import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NavButton } from '../components/ui/NavButton';
import { EmptyState } from '../components/ui/EmptyState';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import {
  getMaintenanceCategoryLabel,
  getMaintenanceDueStatus,
  getMaintenanceFrequencyLabel,
  validateMaintenanceInput,
} from '../models/maintenance';
import type { MaintenanceInput, MaintenanceTask } from '../models/types';
import { formatDate, formatDateTime } from '../utilities/format';
import { PageHeader } from '../components/layout/PageHeader';
import { MAINTENANCE_DUE_STATUS_LABELS } from '../constants/statusLabels';

function toInput(task: MaintenanceTask): MaintenanceInput {
  return {
    title: task.title,
    category: task.category,
    frequency: task.frequency,
    dueDate: task.dueDate,
    lastCompletedDate: task.lastCompletedDate,
    relatedEquipmentId: task.relatedEquipmentId,
    notes: task.notes,
    active: task.active,
    customIntervalDays: task.customIntervalDays,
  };
}

export function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    maintenanceTasks,
    equipment,
    updateMaintenanceTask,
    deleteMaintenanceTask,
    completeMaintenanceTask,
    deactivateMaintenanceTask,
    activateMaintenanceTask,
  } = useApp();
  const item = useMemo(
    () => maintenanceTasks.find((t) => t.id === id),
    [maintenanceTasks, id]
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MaintenanceInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!item || !id) {
    return (
      <div className="page maintenance">
        <PageHeader title="Maintenance" subtitle="Task not found" />
        <Card>
          <EmptyState
            title="Task not found"
            description="This maintenance task may have been deleted or the link is invalid."
            action={
              <NavButton to="/maintenance" variant="secondary">Back to List</NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  const task = item;
  const taskId = id;
  const status = getMaintenanceDueStatus(task);
  const relatedEquipment = task.relatedEquipmentId
    ? equipment.find((e) => e.id === task.relatedEquipmentId)
    : undefined;

  function startEdit() {
    setForm(toInput(task));
    setEditing(true);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    const validationError = validateMaintenanceInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    await updateMaintenanceTask(taskId, form);
    setSaving(false);
    setEditing(false);
    setForm(null);
  }

  async function handleComplete() {
    setCompleting(true);
    await completeMaintenanceTask(taskId);
    setCompleting(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}" permanently?`)) return;
    await deleteMaintenanceTask(taskId);
    navigate('/maintenance');
  }

  async function handleToggleActive() {
    if (task.active) {
      if (confirm(`Mark "${task.title}" as inactive?`)) {
        await deactivateMaintenanceTask(taskId);
      }
    } else {
      await activateMaintenanceTask(taskId);
    }
  }

  return (
    <div className="page maintenance">
      <PageHeader
        title={task.title}
        subtitle={getMaintenanceCategoryLabel(task.category)}
        actions={
          <NavButton to="/maintenance" variant="secondary">Back to List</NavButton>
        }
      />

      {editing && form ? (
        <Card title="Edit Task">
          <MaintenanceForm
            value={form}
            onChange={setForm}
            onSubmit={handleSave}
            onCancel={() => {
              setEditing(false);
              setForm(null);
              setError(null);
            }}
            submitLabel="Save Changes"
            equipment={equipment}
            error={error}
            saving={saving}
          />
        </Card>
      ) : (
        <Card title="Task Details" className="maintenance-detail">
          <div className="maintenance-detail__status-row">
            <span className={`maintenance-card__badge maintenance-card__badge--${status}`}>
              {MAINTENANCE_DUE_STATUS_LABELS[status]}
            </span>
            {!task.active && (
              <span className="maintenance-card__badge maintenance-card__badge--inactive">
                Inactive
              </span>
            )}
          </div>

          <dl className="maintenance-detail__facts">
            <div>
              <dt>Frequency</dt>
              <dd>{getMaintenanceFrequencyLabel(task.frequency)}</dd>
            </div>
            {task.dueDate && (
              <div>
                <dt>Due Date</dt>
                <dd>{formatDate(task.dueDate)}</dd>
              </div>
            )}
            {task.lastCompletedDate && (
              <div>
                <dt>Last Completed</dt>
                <dd>{formatDate(task.lastCompletedDate)}</dd>
              </div>
            )}
            {relatedEquipment && (
              <div>
                <dt>Related Equipment</dt>
                <dd>
                  <Link to={`/equipment/${relatedEquipment.id}`}>{relatedEquipment.name}</Link>
                </dd>
              </div>
            )}
            {task.customIntervalDays && (
              <div>
                <dt>Custom Interval</dt>
                <dd>{task.customIntervalDays} days</dd>
              </div>
            )}
            {task.notes && (
              <div className="maintenance-detail__notes">
                <dt>Notes</dt>
                <dd>{task.notes}</dd>
              </div>
            )}
            <div>
              <dt>Last Updated</dt>
              <dd>{formatDateTime(task.updatedAt)}</dd>
            </div>
          </dl>

          <div className="maintenance-detail__actions">
            {task.active && (
              <Button onClick={handleComplete} disabled={completing}>
                {completing ? 'Completing…' : 'Mark Complete'}
              </Button>
            )}
            <Button onClick={startEdit}>Edit</Button>
            <Button variant="secondary" onClick={handleToggleActive}>
              {task.active ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
