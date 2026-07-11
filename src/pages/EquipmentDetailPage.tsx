import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NavButton } from '../components/ui/NavButton';
import { EmptyState } from '../components/ui/EmptyState';
import { EquipmentForm } from '../components/equipment/EquipmentForm';
import {
  getEquipmentTypeLabel,
  isWarrantyExpired,
  validateEquipmentInput,
} from '../models/equipment';
import type { EquipmentInput, PoolEquipment } from '../models/types';
import { formatDate, formatDateTime } from '../utilities/format';
import { PageHeader } from '../components/layout/PageHeader';

function toInput(equipment: PoolEquipment): EquipmentInput {
  return {
    type: equipment.type,
    name: equipment.name,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    installDate: equipment.installDate,
    warrantyExpiration: equipment.warrantyExpiration,
    notes: equipment.notes,
    active: equipment.active,
  };
}

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    equipment,
    updateEquipment,
    deleteEquipment,
    deactivateEquipment,
    activateEquipment,
  } = useApp();
  const item = useMemo(() => equipment.find((e) => e.id === id), [equipment, id]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EquipmentInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!item || !id) {
    return (
      <div className="page equipment">
        <PageHeader title="Equipment" subtitle="Item not found" />
        <Card>
          <EmptyState
            title="Equipment not found"
            description="This item may have been deleted or the link is invalid."
            action={
              <NavButton to="/equipment" variant="secondary">Back to List</NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  const equipmentItem = item;
  const equipmentId = id;

  function startEdit() {
    setForm(toInput(equipmentItem));
    setEditing(true);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    const validationError = validateEquipmentInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    await updateEquipment(equipmentId, form);
    setSaving(false);
    setEditing(false);
    setForm(null);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${equipmentItem.name}" permanently?`)) return;
    await deleteEquipment(equipmentId);
    navigate('/equipment');
  }

  async function handleToggleActive() {
    if (equipmentItem.active) {
      if (confirm(`Mark "${equipmentItem.name}" as inactive?`)) {
        await deactivateEquipment(equipmentId);
      }
    } else {
      await activateEquipment(equipmentId);
    }
  }

  const warrantyExpired = isWarrantyExpired(equipmentItem);

  return (
    <div className="page equipment">
      <PageHeader
        title={equipmentItem.name}
        subtitle={getEquipmentTypeLabel(equipmentItem.type)}
        actions={
          <NavButton to="/equipment" variant="secondary">Back to List</NavButton>
        }
      />

      {editing && form ? (
        <Card title="Edit Equipment">
          <EquipmentForm
            value={form}
            onChange={setForm}
            onSubmit={handleSave}
            onCancel={() => {
              setEditing(false);
              setForm(null);
              setError(null);
            }}
            submitLabel="Save Changes"
            error={error}
            saving={saving}
          />
        </Card>
      ) : (
        <>
          <Card title="Equipment Details" className="equipment-detail">
            <div className="equipment-detail__status-row">
              {!equipmentItem.active && (
                <span className="equipment-card__badge equipment-card__badge--inactive">Inactive</span>
              )}
              {equipmentItem.warrantyExpiration && warrantyExpired && (
                <span className="equipment-card__badge equipment-card__badge--warn">Warranty expired</span>
              )}
            </div>

            <dl className="equipment-detail__facts">
              <div>
                <dt>Type</dt>
                <dd>{getEquipmentTypeLabel(equipmentItem.type)}</dd>
              </div>
              {equipmentItem.manufacturer && (
                <div>
                  <dt>Manufacturer</dt>
                  <dd>{equipmentItem.manufacturer}</dd>
                </div>
              )}
              {equipmentItem.model && (
                <div>
                  <dt>Model</dt>
                  <dd>{equipmentItem.model}</dd>
                </div>
              )}
              {equipmentItem.serialNumber && (
                <div>
                  <dt>Serial Number</dt>
                  <dd>{equipmentItem.serialNumber}</dd>
                </div>
              )}
              {equipmentItem.installDate && (
                <div>
                  <dt>Install Date</dt>
                  <dd>{formatDate(equipmentItem.installDate)}</dd>
                </div>
              )}
              {equipmentItem.warrantyExpiration && (
                <div>
                  <dt>Warranty Expiration</dt>
                  <dd>{formatDate(equipmentItem.warrantyExpiration)}</dd>
                </div>
              )}
              {equipmentItem.notes && (
                <div className="equipment-detail__notes">
                  <dt>Notes</dt>
                  <dd>{equipmentItem.notes}</dd>
                </div>
              )}
              <div>
                <dt>Last Updated</dt>
                <dd>{formatDateTime(equipmentItem.updatedAt)}</dd>
              </div>
            </dl>

            <div className="equipment-detail__actions">
              <Button onClick={startEdit}>Edit</Button>
              <Button variant="secondary" onClick={handleToggleActive}>
                {equipmentItem.active ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
