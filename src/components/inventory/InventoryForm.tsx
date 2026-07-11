import type { ChemicalInventoryInput, ChemicalType, InventoryQuantityUnit } from '../../models/types';
import {
  CHEMICAL_TYPE_OPTIONS,
  EMPTY_INVENTORY_INPUT,
  INVENTORY_QUANTITY_UNIT_OPTIONS,
} from '../../models/inventory';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface InventoryFormProps {
  value: ChemicalInventoryInput;
  onChange: (value: ChemicalInventoryInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  error?: string | null;
  saving?: boolean;
}

export function InventoryForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  error,
  saving,
}: InventoryFormProps) {
  function update<K extends keyof ChemicalInventoryInput>(key: K, fieldValue: ChemicalInventoryInput[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <form
      className="inventory-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="form-grid">
        <Input
          label="Product Name"
          value={value.productName}
          onChange={(e) => update('productName', e.target.value)}
          placeholder="e.g. Leslie's Liquid Chlorine"
          required
        />
        <Select
          label="Chemical Type"
          value={value.chemicalType}
          onChange={(e) => update('chemicalType', e.target.value as ChemicalType)}
        >
          {CHEMICAL_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Concentration / Strength"
          value={value.concentration ?? ''}
          onChange={(e) => update('concentration', e.target.value)}
          placeholder="e.g. 12.5% or 40 lb bag"
        />
        <Input
          label="Quantity Remaining"
          type="number"
          min={0}
          step="any"
          value={value.quantityRemaining ?? ''}
          onChange={(e) =>
            update('quantityRemaining', e.target.value === '' ? null : Number(e.target.value))
          }
          hint="Leave blank if you are not tracking quantity."
        />
        <Select
          label="Quantity Unit"
          value={value.quantityUnit ?? EMPTY_INVENTORY_INPUT.quantityUnit}
          onChange={(e) => update('quantityUnit', e.target.value as InventoryQuantityUnit)}
        >
          {INVENTORY_QUANTITY_UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Purchase Date"
          type="date"
          value={value.purchaseDate ?? ''}
          onChange={(e) => update('purchaseDate', e.target.value)}
        />
        <Input
          label="Expiration Date"
          type="date"
          value={value.expirationDate ?? ''}
          onChange={(e) => update('expirationDate', e.target.value)}
        />
        <Input
          label="Cost"
          type="number"
          min={0}
          step="0.01"
          value={value.cost ?? ''}
          onChange={(e) => update('cost', e.target.value === '' ? null : Number(e.target.value))}
          hint="Optional purchase cost."
        />
        <Input
          label="Notes"
          value={value.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          hint="Storage location, batch number, or other details."
        />
        <label className="field field--checkbox inventory-form__active">
          <span className="field__label">Active item</span>
          <input
            type="checkbox"
            checked={value.active ?? true}
            onChange={(e) => update('active', e.target.checked)}
          />
          <span className="field__hint">
            Inactive items stay in your list but are hidden from the default inventory view.
          </span>
        </label>
      </div>

      <div className="inventory-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
