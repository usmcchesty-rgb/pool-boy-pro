import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NavButton } from '../components/ui/NavButton';
import { EmptyState } from '../components/ui/EmptyState';
import { InventoryForm } from '../components/inventory/InventoryForm';
import {
  formatQuantity,
  getChemicalTypeLabel,
  getInventoryAlertStatus,
  validateInventoryInput,
} from '../models/inventory';
import type { ChemicalInventoryInput, ChemicalInventoryItem } from '../models/types';
import { formatDate, formatDateTime } from '../utilities/format';
import { PageHeader } from '../components/layout/PageHeader';

function toInput(item: ChemicalInventoryItem): ChemicalInventoryInput {
  return {
    productName: item.productName,
    chemicalType: item.chemicalType,
    concentration: item.concentration,
    quantityRemaining: item.quantityRemaining,
    quantityUnit: item.quantityUnit,
    purchaseDate: item.purchaseDate,
    expirationDate: item.expirationDate,
    cost: item.cost,
    notes: item.notes,
    active: item.active,
  };
}

const ALERT_LABELS: Record<string, string> = {
  expired: 'Expired',
  near_expired: 'Expiring soon',
  low_quantity: 'Low quantity',
  ok: 'In stock',
  inactive: 'Inactive',
};

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    chemicalInventory,
    updateInventoryItem,
    deleteInventoryItem,
    deactivateInventoryItem,
    activateInventoryItem,
  } = useApp();
  const item = useMemo(
    () => chemicalInventory.find((i) => i.id === id),
    [chemicalInventory, id]
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChemicalInventoryInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!item || !id) {
    return (
      <div className="page inventory">
        <PageHeader title="Inventory" subtitle="Item not found" />
        <Card>
          <EmptyState
            title="Item not found"
            description="This inventory item may have been deleted or the link is invalid."
            action={
              <NavButton to="/inventory" variant="secondary">Back to List</NavButton>
            }
          />
        </Card>
      </div>
    );
  }

  const inventoryItem = item;
  const inventoryId = id;
  const status = getInventoryAlertStatus(inventoryItem);
  const quantityLabel = formatQuantity(inventoryItem.quantityRemaining, inventoryItem.quantityUnit);

  function startEdit() {
    setForm(toInput(inventoryItem));
    setEditing(true);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    const validationError = validateInventoryInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    await updateInventoryItem(inventoryId, form);
    setSaving(false);
    setEditing(false);
    setForm(null);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${inventoryItem.productName}" permanently?`)) return;
    await deleteInventoryItem(inventoryId);
    navigate('/inventory');
  }

  async function handleToggleActive() {
    if (inventoryItem.active) {
      if (confirm(`Mark "${inventoryItem.productName}" as inactive?`)) {
        await deactivateInventoryItem(inventoryId);
      }
    } else {
      await activateInventoryItem(inventoryId);
    }
  }

  return (
    <div className="page inventory">
      <PageHeader
        title={inventoryItem.productName}
        subtitle={getChemicalTypeLabel(inventoryItem.chemicalType)}
        actions={
          <NavButton to="/inventory" variant="secondary">Back to List</NavButton>
        }
      />

      {editing && form ? (
        <Card title="Edit Item">
          <InventoryForm
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
        <Card title="Item Details" className="inventory-detail">
          <div className="inventory-detail__status-row">
            <span className={`inventory-card__badge inventory-card__badge--${status}`}>
              {ALERT_LABELS[status]}
            </span>
            {!inventoryItem.active && (
              <span className="inventory-card__badge inventory-card__badge--inactive">
                Inactive
              </span>
            )}
          </div>

          <dl className="inventory-detail__facts">
            <div>
              <dt>Chemical Type</dt>
              <dd>{getChemicalTypeLabel(inventoryItem.chemicalType)}</dd>
            </div>
            {inventoryItem.concentration && (
              <div>
                <dt>Concentration / Strength</dt>
                <dd>{inventoryItem.concentration}</dd>
              </div>
            )}
            {quantityLabel && (
              <div>
                <dt>Quantity Remaining</dt>
                <dd>{quantityLabel}</dd>
              </div>
            )}
            {inventoryItem.purchaseDate && (
              <div>
                <dt>Purchase Date</dt>
                <dd>{formatDate(inventoryItem.purchaseDate)}</dd>
              </div>
            )}
            {inventoryItem.expirationDate && (
              <div>
                <dt>Expiration Date</dt>
                <dd>{formatDate(inventoryItem.expirationDate)}</dd>
              </div>
            )}
            {inventoryItem.cost != null && (
              <div>
                <dt>Cost</dt>
                <dd>${inventoryItem.cost.toFixed(2)}</dd>
              </div>
            )}
            {inventoryItem.notes && (
              <div className="inventory-detail__notes">
                <dt>Notes</dt>
                <dd>{inventoryItem.notes}</dd>
              </div>
            )}
            <div>
              <dt>Last Updated</dt>
              <dd>{formatDateTime(inventoryItem.updatedAt)}</dd>
            </div>
          </dl>

          <div className="inventory-detail__actions">
            <Button onClick={startEdit}>Edit</Button>
            <Button variant="secondary" onClick={handleToggleActive}>
              {inventoryItem.active ? 'Deactivate' : 'Reactivate'}
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
