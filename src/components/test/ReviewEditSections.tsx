import { useState } from 'react';
import type { PoolInfo } from '../../models/types';
import type { TaylorTestInputs, TaylorTestStep } from '../../models/taylorKit';
import { buildReadingsFromTaylorInputs } from '../../chemistry/taylorKit';
import { validateTaylorStep } from '../../utilities/taylorValidation';
import { TaylorStepFields, getReviewSummaryValue } from './TaylorStepFields';
import { formatTemperature } from '../../utilities/units';

const REVIEW_SECTIONS: { step: TaylorTestStep; label: string }[] = [
  { step: 'pool', label: 'Pool Info & Temperature' },
  { step: 'freeChlorine', label: 'Free Chlorine' },
  { step: 'combinedChlorine', label: 'Combined Chlorine' },
  { step: 'ph', label: 'pH' },
  { step: 'totalAlkalinity', label: 'Total Alkalinity' },
  { step: 'calciumHardness', label: 'Calcium Hardness' },
  { step: 'cyanuricAcid', label: 'Cyanuric Acid' },
  { step: 'salt', label: 'Salt' },
];

interface ReviewEditSectionsProps {
  inputs: TaylorTestInputs;
  pool: PoolInfo;
  errors: Record<string, string>;
  onUpdateInputs: (patch: Partial<TaylorTestInputs>) => void;
  onUpdatePool: (patch: Partial<PoolInfo>) => void;
}

export function ReviewEditSections({
  inputs,
  pool,
  errors,
  onUpdateInputs,
  onUpdatePool,
}: ReviewEditSectionsProps) {
  const [openSection, setOpenSection] = useState<TaylorTestStep | null>(null);
  const readings = buildReadingsFromTaylorInputs(inputs);

  function toggleSection(step: TaylorTestStep) {
    setOpenSection((prev) => (prev === step ? null : step));
  }

  function sectionErrors(step: TaylorTestStep): string[] {
    return Object.values(validateTaylorStep(step, inputs, pool));
  }

  return (
    <div className="review-edit-sections">
      <h3 className="review-readings__title">Calculated Readings</h3>
      <p className="review-edit-hint">Expand any section to edit without leaving Review.</p>
      {REVIEW_SECTIONS.map(({ step, label }) => {
        const isOpen = openSection === step;
        const stepErrs = sectionErrors(step);
        const summary =
          step === 'pool'
            ? `${getReviewSummaryValue(step, inputs, pool, readings)} · ${formatTemperature(readings.temperature, readings.temperatureUnit)}`
            : getReviewSummaryValue(step, inputs, pool, readings);

        return (
          <div
            key={step}
            className={`review-edit-section ${isOpen ? 'review-edit-section--open' : ''} ${stepErrs.length ? 'review-edit-section--error' : ''}`}
          >
            <button
              type="button"
              className="review-edit-section__summary"
              aria-expanded={isOpen}
              onClick={() => toggleSection(step)}
            >
              <span className="review-edit-section__label">{label}</span>
              <span className="review-edit-section__value">{summary}</span>
              <span className="review-edit-section__action">{isOpen ? 'Close' : 'Edit'}</span>
            </button>
            {isOpen && (
              <div className="review-edit-section__body">
                <TaylorStepFields
                  step={step}
                  inputs={inputs}
                  pool={pool}
                  errors={errors}
                  onUpdateInputs={onUpdateInputs}
                  onUpdatePool={onUpdatePool}
                  compact
                />
                {stepErrs.length > 0 && (
                  <ul className="review-edit-section__errors">
                    {stepErrs.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
