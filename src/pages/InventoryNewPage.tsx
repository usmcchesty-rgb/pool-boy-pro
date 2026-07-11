import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { InventoryForm } from '../components/inventory/InventoryForm';
import { EMPTY_INVENTORY_INPUT, validateInventoryInput } from '../models/inventory';
import type { ChemicalInventoryInput } from '../models/types';
import { PageHeader } from '../components/layout/PageHeader';

export function InventoryNewPage() {
  const { addInventoryItem } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<ChemicalInventoryInput>({ ...EMPTY_INVENTORY_INPUT });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const validationError = validateInventoryInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const item = await addInventoryItem(form);
      navigate(`/inventory/${item.id}`);
    } catch {
      setError('Could not save item. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="page inventory">
      <PageHeader
        title="Add Inventory Item"
        subtitle="Record a pool chemical you have on hand"
        actions={
          <NavButton to="/inventory" variant="secondary">Back to List</NavButton>
        }
      />

      <Card title="Item Details">
        <InventoryForm
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/inventory')}
          submitLabel="Save Item"
          error={error}
          saving={saving}
        />
      </Card>
    </div>
  );
}
