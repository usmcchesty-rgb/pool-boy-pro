import type { StripPadDefinition } from '../../strip/types';

interface StripPadPickerProps {
  pad: StripPadDefinition;
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
}

function formatScaleValue(value: number, unit: string): string {
  if (unit === 'ppm') return `${value} ppm`;
  return String(value);
}

export function StripPadPicker({ pad, value, onChange, error }: StripPadPickerProps) {
  return (
    <fieldset className={`strip-pad-picker ${error ? 'strip-pad-picker--error' : ''}`}>
      <legend className="strip-pad-picker__legend">
        {pad.label}
        {pad.unit && pad.unit !== 'ppm' ? '' : pad.unit ? '' : ''}
      </legend>
      {pad.hint && <p className="strip-pad-picker__hint field__hint">{pad.hint}</p>}
      <div className="strip-pad-picker__options" role="radiogroup" aria-label={pad.label}>
        {pad.scaleValues.map((scaleValue) => {
          const id = `${pad.id}-${scaleValue}`;
          const checked = value === scaleValue;
          return (
            <label
              key={scaleValue}
              className={`strip-pad-picker__option ${checked ? 'strip-pad-picker__option--selected' : ''}`}
            >
              <input
                type="radio"
                name={pad.id}
                id={id}
                value={scaleValue}
                checked={checked}
                onChange={() => onChange(scaleValue)}
              />
              <span className="strip-pad-picker__value">{formatScaleValue(scaleValue, pad.unit)}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
