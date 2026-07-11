import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import { StripPadPicker } from './StripPadPicker';

interface StripManualEntryProps {
  brand: StripBrandDefinition;
  selections: StripPadSelections;
  errors: Record<string, string>;
  onChange: (padId: string, value: number) => void;
}

export function StripManualEntry({ brand, selections, errors, onChange }: StripManualEntryProps) {
  const sixWayPads = brand.pads.filter((p) => p.stripType === 'six_way');
  const saltPads = brand.pads.filter((p) => p.stripType === 'salt');

  return (
    <div className="strip-manual-entry">
      <section className="strip-manual-entry__section">
        <h3 className="strip-manual-entry__title">Six-Way Balancer Strip</h3>
        <p className="field__hint">
          Compare each pad to the color chart on the bottle. Tap the closest match.
        </p>
        <div className="strip-manual-entry__pads">
          {sixWayPads.map((pad) => (
            <StripPadPicker
              key={pad.id}
              pad={pad}
              value={selections[pad.id]}
              onChange={(v) => onChange(pad.id, v)}
              error={errors[pad.id]}
            />
          ))}
        </div>
      </section>

      <section className="strip-manual-entry__section">
        <h3 className="strip-manual-entry__title">Salt Level Strip</h3>
        <p className="field__hint">
          Use the separate salt strip from the package. Compare to the salt chart on the bottle.
        </p>
        <div className="strip-manual-entry__pads">
          {saltPads.map((pad) => (
            <StripPadPicker
              key={pad.id}
              pad={pad}
              value={selections[pad.id]}
              onChange={(v) => onChange(pad.id, v)}
              error={errors[pad.id]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
