import type { EquipmentInput, EquipmentType } from '../../models/types';
import { EQUIPMENT_TYPE_OPTIONS } from '../../models/equipment';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface EquipmentFormProps {
  value: EquipmentInput;
  onChange: (value: EquipmentInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  error?: string | null;
  saving?: boolean;
}

export function EquipmentForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  error,
  saving,
}: EquipmentFormProps) {
  function update<K extends keyof EquipmentInput>(key: K, fieldValue: EquipmentInput[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <form
      className="equipment-form"
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
        <Select
          label="Equipment Type"
          value={value.type}
          onChange={(e) => update('type', e.target.value as EquipmentType)}
        >
          {EQUIPMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Name"
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g. Main Pool Pump"
          required
        />
        <Input
          label="Manufacturer"
          value={value.manufacturer ?? ''}
          onChange={(e) => update('manufacturer', e.target.value)}
        />
        <Input
          label="Model"
          value={value.model ?? ''}
          onChange={(e) => update('model', e.target.value)}
        />
        <Input
          label="Serial Number"
          value={value.serialNumber ?? ''}
          onChange={(e) => update('serialNumber', e.target.value)}
        />
        <Input
          label="Install Date"
          type="date"
          value={value.installDate ?? ''}
          onChange={(e) => update('installDate', e.target.value)}
        />
        <Input
          label="Warranty Expiration"
          type="date"
          value={value.warrantyExpiration ?? ''}
          onChange={(e) => update('warrantyExpiration', e.target.value)}
        />
        <Input
          label="Notes"
          value={value.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          hint="Maintenance notes, location, or service history references."
        />
        <label className="field field--checkbox equipment-form__active">
          <span className="field__label">Active equipment</span>
          <input
            type="checkbox"
            checked={value.active ?? true}
            onChange={(e) => update('active', e.target.checked)}
          />
          <span className="field__hint">Inactive items stay in your list but are hidden from the default view.</span>
        </label>
      </div>

      <div className="equipment-form__actions">
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
