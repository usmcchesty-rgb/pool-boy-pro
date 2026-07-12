import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import { StripPadPicker } from './StripPadPicker';
import { isSaltSanitizer } from '../../models/taylorKit';
import type { PoolInfo } from '../../models/types';
import {
  CLOROX_SALT_SCALE_ANCHORS,
  SALT_SCALE_REQUIRES_BOTTLE_VERIFICATION,
  saltScaleToPpm,
} from '../../strip/brands/saltScaleMapping';
import type { SaltEntryMode } from '../../strip/quickCheckValidation';

interface StripManualEntryProps {
  brand: StripBrandDefinition;
  selections: StripPadSelections;
  errors: Record<string, string>;
  pool: PoolInfo;
  saltSkipped: boolean;
  onSaltSkippedChange: (skipped: boolean) => void;
  saltMode: SaltEntryMode;
  onSaltModeChange: (mode: SaltEntryMode) => void;
  saltScaleReading: string;
  onSaltScaleReadingChange: (value: string) => void;
  onChange: (padId: string, value: number) => void;
  missingSummary?: string;
}

export function StripManualEntry({
  brand,
  selections,
  errors,
  pool,
  saltSkipped,
  onSaltSkippedChange,
  saltMode,
  onSaltModeChange,
  saltScaleReading,
  onSaltScaleReadingChange,
  onChange,
  missingSummary,
}: StripManualEntryProps) {
  const sixWayPads = brand.pads.filter((p) => p.stripType === 'six_way');
  const saltPad = brand.pads.find((p) => p.id === 'salt');
  const saltRequired = isSaltSanitizer(pool.sanitizerType);
  const convertedPpm =
    saltScaleReading !== '' && !Number.isNaN(Number(saltScaleReading))
      ? saltScaleToPpm(Number(saltScaleReading))
      : null;

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

      {saltPad && (
        <section className="strip-manual-entry__section">
          <h3 className="strip-manual-entry__title">Salt Level Strip</h3>
          <p className="field__hint">
            Use the separate salt strip. Enter the number printed on the scale or choose ppm directly.
          </p>

          {!saltRequired && (
            <label className="strip-manual-entry__skip">
              <input
                type="checkbox"
                checked={saltSkipped}
                onChange={(e) => onSaltSkippedChange(e.target.checked)}
              />
              <span>Skip salt (not a saltwater pool)</span>
            </label>
          )}

          {!saltSkipped && (
            <>
              <div className="strip-salt-mode" role="tablist" aria-label="Salt entry mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={saltMode === 'scale'}
                  className={`strip-salt-mode__btn ${saltMode === 'scale' ? 'strip-salt-mode__btn--active' : ''}`}
                  onClick={() => onSaltModeChange('scale')}
                >
                  Salt Scale Number
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={saltMode === 'ppm'}
                  className={`strip-salt-mode__btn ${saltMode === 'ppm' ? 'strip-salt-mode__btn--active' : ''}`}
                  onClick={() => onSaltModeChange('ppm')}
                >
                  Direct PPM
                </button>
              </div>

              {saltMode === 'scale' ? (
                <div className="strip-salt-scale-entry">
                  <label className="field__label" htmlFor="salt-scale-input">
                    Scale reading on strip
                  </label>
                  <input
                    id="salt-scale-input"
                    className="field__input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    max={10}
                    value={saltScaleReading}
                    onChange={(e) => {
                      onSaltScaleReadingChange(e.target.value);
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) onChange('salt', saltScaleToPpm(n));
                    }}
                    placeholder="e.g. 6.4"
                  />
                  {convertedPpm !== null && (
                    <p className="strip-salt-scale-entry__result">
                      Scale reading: <strong>{saltScaleReading}</strong>
                      <br />
                      Salt result: <strong>{convertedPpm.toLocaleString()} ppm</strong>
                    </p>
                  )}
                  <p className="field__hint">
                    Chart anchors: {CLOROX_SALT_SCALE_ANCHORS.filter((a) => a.bottleVerified).map((a) => a.scale).join(', ')}
                    {SALT_SCALE_REQUIRES_BOTTLE_VERIFICATION && ' · verify scale 0 on physical bottle'}
                  </p>
                </div>
              ) : (
                <StripPadPicker
                  pad={saltPad}
                  value={selections.salt}
                  onChange={(v) => onChange('salt', v)}
                  error={errors.salt}
                />
              )}
            </>
          )}

          {errors.salt && <p className="field__error">{errors.salt}</p>}
        </section>
      )}

      {missingSummary && (
        <p className="page-message page-message--error" role="alert">
          {missingSummary}
        </p>
      )}
    </div>
  );
}
