import type { MaintenanceCategory, MaintenanceFrequency, MaintenanceInput } from '../../models/types';
import type { PoolEquipment } from '../../models/types';
import {
  MAINTENANCE_CATEGORY_OPTIONS,
  MAINTENANCE_FREQUENCY_OPTIONS,
} from '../../models/maintenance';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface MaintenanceFormProps {
  value: MaintenanceInput;
  onChange: (value: MaintenanceInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  equipment: PoolEquipment[];
  error?: string | null;
  saving?: boolean;
}

export function MaintenanceForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  equipment,
  error,
  saving,
}: MaintenanceFormProps) {
  function update<K extends keyof MaintenanceInput>(key: K, fieldValue: MaintenanceInput[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  const activeEquipment = equipment.filter((e) => e.active);
  const showCustomInterval = value.frequency === 'custom';

  return (
    <form
      className="maintenance-form"
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
          label="Task Title"
          value={value.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. Brush pool walls"
          required
        />
        <Select
          label="Category"
          value={value.category}
          onChange={(e) => update('category', e.target.value as MaintenanceCategory)}
        >
          {MAINTENANCE_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          label="Frequency"
          value={value.frequency}
          onChange={(e) => update('frequency', e.target.value as MaintenanceFrequency)}
        >
          {MAINTENANCE_FREQUENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {showCustomInterval && (
          <Input
            label="Custom Interval (days)"
            type="number"
            min={1}
            value={value.customIntervalDays ?? ''}
            onChange={(e) =>
              update('customIntervalDays', e.target.value ? Number(e.target.value) : undefined)
            }
            hint="How many days between each completion."
          />
        )}
        <Input
          label="Due Date"
          type="date"
          value={value.dueDate ?? ''}
          onChange={(e) => update('dueDate', e.target.value)}
        />
        <Input
          label="Last Completed"
          type="date"
          value={value.lastCompletedDate ?? ''}
          onChange={(e) => update('lastCompletedDate', e.target.value)}
        />
        <Select
          label="Related Equipment"
          value={value.relatedEquipmentId ?? ''}
          onChange={(e) => update('relatedEquipmentId', e.target.value)}
        >
          <option value="">None</option>
          {activeEquipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Input
          label="Notes"
          value={value.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          hint="Optional details for this maintenance task."
        />
        <label className="field field--checkbox maintenance-form__active">
          <span className="field__label">Active task</span>
          <input
            type="checkbox"
            checked={value.active ?? true}
            onChange={(e) => update('active', e.target.checked)}
          />
          <span className="field__hint">
            Inactive tasks stay in your list but are hidden from the default schedule view.
          </span>
        </label>
      </div>

      <div className="maintenance-form__actions">
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
