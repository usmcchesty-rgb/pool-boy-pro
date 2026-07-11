import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import { StripPadPicker } from './StripPadPicker';

interface StripReviewSectionsProps {
  brand: StripBrandDefinition;
  selections: StripPadSelections;
  onChange: (padId: string, value: number) => void;
}

export function StripReviewSections({ brand, selections, onChange }: StripReviewSectionsProps) {
  return (
    <div className="strip-review-sections">
      <p className="field__hint">Review your chart matches. Adjust any reading before saving.</p>
      <div className="strip-manual-entry__pads">
        {brand.pads.map((pad) => (
          <StripPadPicker
            key={pad.id}
            pad={pad}
            value={selections[pad.id]}
            onChange={(v) => onChange(pad.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
