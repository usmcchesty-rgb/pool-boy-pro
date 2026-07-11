import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { EMPTY_MAINTENANCE_INPUT, validateMaintenanceInput } from '../models/maintenance';
import type { MaintenanceInput } from '../models/types';
import { defaultDueDate } from '../services/maintenanceService';
import { PageHeader } from '../components/layout/PageHeader';

interface MaintenanceNewLocationState {
  prefilled?: MaintenanceInput;
  source?: string;
}

export function MaintenanceNewPage() {
  const { addMaintenanceTask, equipment } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as MaintenanceNewLocationState | null;
  const [form, setForm] = useState<MaintenanceInput>({
    ...EMPTY_MAINTENANCE_INPUT,
    dueDate: defaultDueDate(),
    ...locationState?.prefilled,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const validationError = validateMaintenanceInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const task = await addMaintenanceTask(form);
      navigate(`/maintenance/${task.id}`);
    } catch {
      setError('Could not save task. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="page maintenance">
      <PageHeader
        title="Add Maintenance Task"
        subtitle="Schedule a recurring or one-time pool maintenance task"
        actions={
          <NavButton to="/maintenance" variant="secondary">Back to List</NavButton>
        }
      />

      <Card title="Task Details">
        {locationState?.source && (
          <p className="integration-source-note">
            Pre-filled from: {locationState.source}
          </p>
        )}
        <MaintenanceForm
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/maintenance')}
          submitLabel="Save Task"
          equipment={equipment}
          error={error}
          saving={saving}
        />
      </Card>
    </div>
  );
}
