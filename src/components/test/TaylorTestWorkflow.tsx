import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ParameterRow } from './ParameterRow';
import { RecommendationList } from './RecommendationList';
import { TaylorGuide } from './TaylorGuide';
import {
  TaylorAdaptiveInsightsPanel,
  TaylorCompletionEncouragement,
  TaylorConfidenceNote,
  TaylorLearnMore,
  TaylorNextStepPreview,
  TaylorResultInterpretationPanel,
  TaylorWhyThisTest,
} from './TaylorAssistantPanels';
import { PageHeader } from '../layout/PageHeader';
import { TaylorStepFields } from './TaylorStepFields';
import { ReviewEditSections } from './ReviewEditSections';
import type { PoolInfo, WaterReadings } from '../../models/types';
import {
  isSaltSanitizer,
  TAYLOR_TEST_STEPS,
  type TaylorTestInputs,
  type TaylorTestStep,
} from '../../models/taylorKit';
import { buildReadingsFromTaylorInputs } from '../../chemistry/taylorKit';
import { analyzeTest } from '../../chemistry/recommendations';
import {
  getTaylorWarnings,
  validateTaylorStep,
  validateTaylorTest,
} from '../../utilities/taylorValidation';
import {
  getNextTaylorStep,
  getPrevTaylorStep,
  getTaylorStepIndex,
  getTaylorStepOrder,
} from '../../utilities/taylorSteps';
import { TAYLOR_STEP_GUIDES } from '../../constants/taylorStepGuides';
import {
  getCompletionEncouragement,
  getConfidenceMessage,
  getNextStepPreview,
  getStepAdaptiveInsights,
  getStepInterpretation,
  getWhyThisTest,
} from '../../utilities/taylorAssistant';

export interface TaylorTestWorkflowProps {
  title: string;
  subtitle?: string;
  initialPool: PoolInfo;
  initialInputs: TaylorTestInputs;
  initialNotes?: string;
  saveLabel?: string;
  onSave: (readings: WaterReadings, pool: PoolInfo, notes?: string) => Promise<void>;
}

export function TaylorTestWorkflow({
  title,
  subtitle,
  initialPool,
  initialInputs,
  initialNotes = '',
  saveLabel = 'Save Test Results',
  onSave,
}: TaylorTestWorkflowProps) {
  const { settings, updateSettings } = useApp();
  const [step, setStep] = useState<TaylorTestStep>('pool');
  const [maxStepReached, setMaxStepReached] = useState(
    getTaylorStepOrder(initialPool, initialInputs.saltSkipped).length - 1
  );
  const [pool, setPool] = useState<PoolInfo>(initialPool);
  const [inputs, setInputs] = useState<TaylorTestInputs>(initialInputs);
  const [notes, setNotes] = useState(initialNotes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [expandTroubleshooting, setExpandTroubleshooting] = useState(false);
  const [usedTroubleshooting, setUsedTroubleshooting] = useState(false);

  const stepIndex = getTaylorStepIndex(step, pool, inputs.saltSkipped);
  const stepOrder = getTaylorStepOrder(pool, inputs.saltSkipped);
  const totalSteps = stepOrder.length;
  const currentStepNumber = stepIndex >= 0 ? stepIndex + 1 : 1;
  const progressPercent = totalSteps > 0 ? Math.round((currentStepNumber / totalSteps) * 100) : 0;
  const currentStepMeta = TAYLOR_TEST_STEPS.find((s) => s.id === step)!;
  const readings = useMemo(() => buildReadingsFromTaylorInputs(inputs), [inputs]);
  const preview = useMemo(
    () => analyzeTest(readings, pool, settings.chemicalStrengths),
    [readings, pool, settings.chemicalStrengths]
  );
  const warnings = useMemo(() => getTaylorWarnings(inputs, pool), [inputs, pool]);
  const guide = TAYLOR_STEP_GUIDES[step];
  const interpretation = useMemo(
    () =>
      step !== 'review' && step !== 'pool'
        ? getStepInterpretation(step, inputs, pool, preview.parameters)
        : null,
    [step, inputs, pool, preview.parameters]
  );
  const stepInsights = useMemo(
    () => (step !== 'review' && step !== 'pool' ? getStepAdaptiveInsights(step, inputs, pool) : []),
    [step, inputs, pool]
  );
  const nextPreview = useMemo(
    () => (step !== 'review' && step !== 'pool' ? getNextStepPreview(step, pool, inputs.saltSkipped) : null),
    [step, pool, inputs.saltSkipped]
  );
  const confidenceMessage = useMemo(
    () => getConfidenceMessage(interpretation, usedTroubleshooting),
    [interpretation, usedTroubleshooting]
  );
  const whyThisTest = step !== 'review' && step !== 'pool' ? getWhyThisTest(step) : null;
  const completionMessage = getCompletionEncouragement();

  function updatePool(patch: Partial<PoolInfo>) {
    setPool((prev) => ({ ...prev, ...patch }));
    if (patch.volume !== undefined) delete errors.volume;
  }

  function updateInputs(patch: Partial<TaylorTestInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
    if (patch.sampleSizeMl !== undefined) {
      void updateSettings({ preferredFasDpdSampleSize: patch.sampleSizeMl });
    }
    if (patch.totalAlkalinityMode !== undefined) {
      void updateSettings({ preferredTaEntryMode: patch.totalAlkalinityMode });
    }
    if (patch.calciumHardnessMode !== undefined) {
      void updateSettings({ preferredChEntryMode: patch.calciumHardnessMode });
    }
  }

  function goToStep(target: TaylorTestStep) {
    setStep(target);
    setErrors({});
    setExpandTroubleshooting(false);
    setUsedTroubleshooting(false);
  }

  function goToStepFromNav(target: TaylorTestStep) {
    const targetIndex = getTaylorStepIndex(target, pool, inputs.saltSkipped);
    if (targetIndex >= 0 && targetIndex <= maxStepReached) goToStep(target);
  }

  function validateCurrentStep(): boolean {
    const stepErrors = validateTaylorStep(step, inputs, pool);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function advanceTo(nextStep: TaylorTestStep) {
    goToStep(nextStep);
    const idx = getTaylorStepIndex(nextStep, pool, inputs.saltSkipped);
    setMaxStepReached((prev) => Math.max(prev, idx));
  }

  function next() {
    if (!validateCurrentStep()) return;
    const nextStep = getNextTaylorStep(step, pool, inputs.saltSkipped);
    if (nextStep) advanceTo(nextStep);
  }

  function back() {
    const prevStep = getPrevTaylorStep(step, pool, inputs.saltSkipped);
    if (prevStep) goToStep(prevStep);
  }

  function skipSalt() {
    updateInputs({ saltSkipped: true, salt: 0 });
    advanceTo('review');
  }

  async function save() {
    const validationErrors = validateTaylorTest(inputs, pool);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave(readings, pool, notes || undefined);
    } finally {
      setSaving(false);
    }
  }

  const showSaltOptional = step === 'salt' && !isSaltSanitizer(pool.sanitizerType);

  return (
    <div className="page new-test">
      <PageHeader title={title} subtitle={subtitle} />

      <nav className="step-nav step-nav--taylor" aria-label="Taylor test steps">
        {TAYLOR_TEST_STEPS.map((s) => {
          const i = getTaylorStepIndex(s.id, pool, inputs.saltSkipped);
          const skipped = s.id === 'salt' && inputs.saltSkipped && !isSaltSanitizer(pool.sanitizerType);
          const reachable = i >= 0 && i <= maxStepReached;
          return (
            <button
              key={s.id}
              type="button"
              className={`step-nav__item ${step === s.id ? 'step-nav__item--active' : ''} ${i >= 0 && i < stepIndex ? 'step-nav__item--done' : ''} ${reachable ? 'step-nav__item--reachable' : ''} ${skipped ? 'step-nav__item--skipped' : ''}`}
              onClick={() => goToStepFromNav(s.id)}
              aria-current={step === s.id ? 'step' : undefined}
              disabled={!reachable && step !== s.id}
            >
              <span className="step-nav__number">{i >= 0 ? i + 1 : '—'}</span>
              <span className="step-nav__label">
                {s.label}
                {s.id === 'salt' && !isSaltSanitizer(pool.sanitizerType) && (
                  <span className="step-nav__optional">Optional</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <div
        className="new-test__progress"
        aria-label={`Step ${currentStepNumber} of ${totalSteps}: ${currentStepMeta.label}`}
      >
        <div className="new-test__progress-meta">
          <span className="new-test__progress-step">
            Step {currentStepNumber} of {totalSteps}
          </span>
          <span className="new-test__progress-name">{currentStepMeta.label}</span>
        </div>
        <div
          className="new-test__progress-bar"
          role="progressbar"
          aria-valuenow={currentStepNumber}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label="Test progress"
        >
          <span className="new-test__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="new-test__workflow">
        <Card title={currentStepMeta.label} className="test-form-card">
          <p className="step-description">{currentStepMeta.description}</p>

          {whyThisTest && <TaylorWhyThisTest explanation={whyThisTest} />}

          {step !== 'review' && step !== 'pool' && <TaylorLearnMore />}

          {step !== 'review' && guide && (
            <TaylorGuide
              title={guide.title}
              purpose={guide.purpose}
              reagents={guide.reagents}
              steps={guide.steps}
              expectedColors={guide.expectedColors}
              endpoint={guide.endpoint}
              commonMistakes={guide.commonMistakes}
              troubleshooting={guide.troubleshooting}
              expandTroubleshooting={expandTroubleshooting}
            />
          )}

          {showSaltOptional && (
            <p className="taylor-note taylor-note--optional">
              Salt testing is optional for {pool.sanitizerType} pools. Enter a value or skip to Review.
            </p>
          )}

          {step !== 'review' ? (
            <>
              <TaylorStepFields
                step={step}
                inputs={inputs}
                pool={pool}
                errors={errors}
                onUpdateInputs={updateInputs}
                onUpdatePool={updatePool}
                onRequestHelp={() => {
                  setExpandTroubleshooting(true);
                  setUsedTroubleshooting(true);
                }}
              />
              {interpretation && <TaylorResultInterpretationPanel interpretation={interpretation} />}
              {stepInsights.length > 0 && <TaylorAdaptiveInsightsPanel insights={stepInsights} />}
              {confidenceMessage && <TaylorConfidenceNote message={confidenceMessage} />}
              {interpretation && nextPreview && <TaylorNextStepPreview message={nextPreview} />}
            </>
          ) : (
            <div className="review-section">
              <TaylorCompletionEncouragement
                title={completionMessage.title}
                paragraphs={completionMessage.paragraphs}
              />
              <div className="review-score">
                <span className="review-score__value">{preview.overallScore}</span>
                <span className="review-score__label">Water Quality Score</span>
                <p>{preview.summary}</p>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="review-errors" role="alert">
                  <h3>Please fix before saving</h3>
                  <ul>
                    {Object.entries(errors).map(([key, msg]) => (
                      <li key={key}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="review-warnings" role="status">
                  <h3>Validation Warnings</h3>
                  <ul>
                    {warnings.map((w) => (
                      <li key={w.field}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ReviewEditSections
                inputs={inputs}
                pool={pool}
                errors={errors}
                onUpdateInputs={updateInputs}
                onUpdatePool={updatePool}
              />

              <div className="review-params">
                {preview.parameters.map((p) => (
                  <ParameterRow key={p.parameter} param={p} compact />
                ))}
              </div>

              <RecommendationList recommendations={preview.recommendations} />

              <Input
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Weather, bather load, recent treatments…"
              />
            </div>
          )}
        </Card>

        <footer className="form-actions form-actions--taylor">
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={back} type="button">
              Back
            </Button>
          )}
          {showSaltOptional && (
            <Button variant="ghost" onClick={skipSalt} type="button">
              Skip Salt Test
            </Button>
          )}
          {step !== 'review' ? (
            <Button onClick={next} type="button">
              Continue
            </Button>
          ) : (
            <Button onClick={save} disabled={saving} type="button">
              {saving ? 'Saving…' : saveLabel}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
