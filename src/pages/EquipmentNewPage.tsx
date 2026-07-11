import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { EquipmentForm } from '../components/equipment/EquipmentForm';
import { EMPTY_EQUIPMENT_INPUT, validateEquipmentInput } from '../models/equipment';
import type { EquipmentInput } from '../models/types';
import { PageHeader } from '../components/layout/PageHeader';

export function EquipmentNewPage() {
  const { addEquipment } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<EquipmentInput>({ ...EMPTY_EQUIPMENT_INPUT });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const validationError = validateEquipmentInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const item = await addEquipment(form);
      navigate(`/equipment/${item.id}`);
    } catch {
      setError('Could not save equipment. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="page equipment">
      <PageHeader
        title="Add Equipment"
        subtitle="Record a pump, filter, heater, or other pool equipment"
        actions={
          <NavButton to="/equipment" variant="secondary">Back to List</NavButton>
        }
      />

      <Card title="Equipment Details">
        <EquipmentForm
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/equipment')}
          submitLabel="Save Equipment"
          error={error}
          saving={saving}
        />
      </Card>
    </div>
  );
}
