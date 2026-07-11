import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ParameterRow } from '../test/ParameterRow';
import { RecommendationList } from '../test/RecommendationList';
import { PageHeader } from '../layout/PageHeader';
import { StripManualEntry } from './StripManualEntry';
import { StripReviewSections } from './StripReviewSections';
import { StripAccuracyBadge } from './TestSourceBadge';
import { StripScannerView, type ScanPhase } from './StripScannerView';
import { StripPrivacyNotice } from './StripPrivacyNotice';
import { StripTimingPanel, createStripTiming, type StripTimingState } from './StripTimingPanel';
import {
  advanceStripTiming,
  getStripTimingConfig,
  getTimingMessage,
} from '../../strip/calibration/timing';
import {
  StripScanVerification,
  matchesToSelections,
  mergeScanMatches,
  overallScanAccuracy,
  overallScanConfidence,
} from './StripScanVerification';
import type { PoolInfo, StripCaptureMethod } from '../../models/types';
import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import type { PadMatchResult, ScanProcessResult } from '../../strip/scanner/types';
import { getDefaultStripBrand } from '../../strip/stripRegistry';
import { stripSelectionsToWaterReadings, validateStripSelections } from '../../strip/stripReadings';
import { getOverallStripAccuracy } from '../../strip/stripConfidence';
import { analyzeTest } from '../../chemistry/recommendations';
import { poolFromSettings } from '../../services/testService';
import type { CreateStripTestOptions } from '../../services/quickCheckService';
import { isCameraSupported } from '../../strip/scanner/cameraSession';
import { AdaptiveLearningPrompt } from './AdaptiveLearningPrompt';
import {
  countEligibleLearningSamples,
  processVerifiedScanLearning,
  type ScanTimingMeta,
} from '../../services/adaptiveLearningService';
import { isAdaptiveLearningEnabled } from '../../strip/calibration/adaptiveStorage';

export type QuickCheckStep =
  | 'welcome'
  | 'instructions'
  | 'method'
  | 'scan'
  | 'verify'
  | 'entry'
  | 'review';

type EntryMode = 'scan' | 'manual';

const STEP_LABELS: Record<QuickCheckStep, string> = {
  welcome: 'Welcome',
  instructions: 'Instructions',
  method: 'How to Read',
  scan: 'Scan Strip',
  verify: 'Verify Scan',
  entry: 'Read Strip',
  review: 'Review',
};

export interface QuickCheckWorkflowProps {
  onSave: (
    brand: StripBrandDefinition,
    selections: StripPadSelections,
    pool: PoolInfo,
    options?: CreateStripTestOptions
  ) => Promise<void>;
}

export function QuickCheckWorkflow({ onSave }: QuickCheckWorkflowProps) {
  const { settings } = useApp();
  const brand = getDefaultStripBrand();
  const cameraAvailable = isCameraSupported();

  const [step, setStep] = useState<QuickCheckStep>('welcome');
  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [selections, setSelections] = useState<StripPadSelections>({});
  const [pool] = useState<PoolInfo>(() => poolFromSettings(settings));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [scanPhase, setScanPhase] = useState<ScanPhase>('six_way');
  const [scanMatches, setScanMatches] = useState<PadMatchResult[]>([]);
  const [captureQuality, setCaptureQuality] = useState<ScanProcessResult['quality'] | undefined>();
  const [usedScanner, setUsedScanner] = useState(false);
  const [sixWayTiming, setSixWayTiming] = useState<StripTimingState>(createStripTiming);
  const [saltTiming, setSaltTiming] = useState<StripTimingState>(createStripTiming);
  const [scanTimingMeta, setScanTimingMeta] = useState<Record<string, ScanTimingMeta>>({});
  const [verifiedPadIds, setVerifiedPadIds] = useState<Set<string>>(new Set());
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [scanSessionId] = useState(() => `scan-${Date.now()}`);

  const timingConfig = getStripTimingConfig(brand);
  const activeTiming = scanPhase === 'salt' ? saltTiming : sixWayTiming;
  const activeTimingState = advanceStripTiming(activeTiming, timingConfig);

  const visibleSteps: QuickCheckStep[] = useMemo(() => {
    const base: QuickCheckStep[] = ['welcome', 'instructions', 'method'];
    if (entryMode === 'scan') {
      base.push('scan', 'verify', 'review');
    } else {
      base.push('entry', 'review');
    }
    return base;
  }, [entryMode]);

  const stepIndex = visibleSteps.indexOf(step);

  const readings = useMemo(
    () => stripSelectionsToWaterReadings(brand, selections, settings),
    [brand, selections, settings]
  );
  const preview = useMemo(
    () => analyzeTest(readings, pool, settings.chemicalStrengths),
    [readings, pool, settings.chemicalStrengths]
  );

  const accuracyLevel = usedScanner
    ? overallScanAccuracy(scanMatches)
    : getOverallStripAccuracy('manual');

  const needsSaltScan = usedScanner && !scanMatches.some((m) => m.padId === 'salt');

  const eligibleLearningCount = useMemo(() => {
    if (!usedScanner || scanMatches.length === 0) return 0;
    return countEligibleLearningSamples({
      brand,
      scanMatches,
      selections,
      captureQuality,
      timingMeta: scanTimingMeta,
      verifiedPadIds,
      scanSessionId,
      learningEnabled: true,
    });
  }, [usedScanner, scanMatches, selections, captureQuality, scanTimingMeta, verifiedPadIds, scanSessionId, brand]);

  function updateSelection(padId: string, value: number) {
    setSelections((prev) => ({ ...prev, [padId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[padId];
      return next;
    });
  }

  function goTo(target: QuickCheckStep) {
    setStep(target);
  }

  function next() {
    if (step === 'entry') {
      const validationErrors = validateStripSelections(brand, selections);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors({});
    }
    const nextStep = visibleSteps[stepIndex + 1];
    if (nextStep) goTo(nextStep);
  }

  function back() {
    const prevStep = visibleSteps[stepIndex - 1];
    if (prevStep) goTo(prevStep);
  }

  function startScan(phase: ScanPhase = 'six_way') {
    setEntryMode('scan');
    setScanPhase(phase);
    setUsedScanner(true);
    goTo('scan');
  }

  function startManual() {
    setEntryMode('manual');
    setScanMatches([]);
    setUsedScanner(false);
    goTo('entry');
  }

  function handleScanCapture(result: ScanProcessResult, phase: ScanPhase) {
    setCaptureQuality(result.quality);
    setScanTimingMeta((prev) => ({
      ...prev,
      [phase]: {
        expired: activeTimingState.phase === 'window_expired',
        acknowledged: activeTimingState.expiredAcknowledged,
      },
    }));
    const merged = mergeScanMatches(scanMatches, result.padMatches);
    setScanMatches(merged);
    setSelections((prev) => ({ ...prev, ...matchesToSelections(result.padMatches) }));
    goTo('verify');
  }

  function handleRescan(phase: ScanPhase) {
    setScanPhase(phase);
    if (phase === 'salt') {
      setSaltTiming(createStripTiming());
    } else {
      setSixWayTiming(createStripTiming());
    }
    goTo('scan');
  }

  function handleVerifyContinue(confirmed: Set<string>) {
    const validationErrors = validateStripSelections(brand, selections);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setVerifiedPadIds(confirmed);
    goTo('review');
  }

  async function save() {
    const validationErrors = validateStripSelections(brand, selections);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      goTo(entryMode === 'scan' ? 'verify' : 'entry');
      return;
    }
    setSaving(true);
    try {
      const captureMethod: StripCaptureMethod = usedScanner ? 'camera_verified' : 'manual';

      if (usedScanner && learningEnabled && isAdaptiveLearningEnabled()) {
        processVerifiedScanLearning({
          brand,
          scanMatches,
          selections,
          captureQuality,
          timingMeta: scanTimingMeta,
          verifiedPadIds,
          scanSessionId,
          learningEnabled,
        });
      }

      await onSave(brand, selections, pool, {
        notes: notes || undefined,
        captureMethod,
        scanMatches: usedScanner ? scanMatches : undefined,
        captureQuality,
        overallConfidence: usedScanner ? overallScanConfidence(scanMatches) : undefined,
        limitationsAcknowledged: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page quick-check">
      <PageHeader
        title="Quick Test (Strip)"
        subtitle={`${brand.productName} — convenience check`}
      />

      <nav className="step-nav step-nav--quick" aria-label="Quick test steps">
        {visibleSteps.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`step-nav__item ${step === s ? 'step-nav__item--active' : ''} ${i < stepIndex ? 'step-nav__item--done' : ''} ${i <= stepIndex ? 'step-nav__item--reachable' : ''}`}
            onClick={() => i <= stepIndex && goTo(s)}
            aria-current={step === s ? 'step' : undefined}
            disabled={i > stepIndex}
          >
            <span className="step-nav__number">{i + 1}</span>
            <span className="step-nav__label">{STEP_LABELS[s]}</span>
          </button>
        ))}
      </nav>

      <Card title={STEP_LABELS[step]} className="quick-check-card">
        {step === 'welcome' && (
          <div className="quick-check-welcome">
            <p className="quick-check-welcome__lead">
              This is a fast water check using <strong>{brand.productName}</strong>.
            </p>
            <p>Results are <strong>estimates</strong> based on color chart matching.</p>
            <p className="taylor-note taylor-note--optional">
              For maximum accuracy, use the Taylor K-2006-SALT kit.
            </p>
            <StripAccuracyBadge level="medium" />
          </div>
        )}

        {step === 'instructions' && (
          <div className="quick-check-instructions">
            <ol className="quick-check-instructions__list">
              <li>
                Dip the <strong>six-way balancer strip</strong> in pool water at elbow depth.
                Remove immediately and shake once.
              </li>
              <li>
                Wait <strong>{brand.dipWaitSeconds.min}–{brand.dipWaitSeconds.max} seconds</strong> for pads to develop,
                then compare to the bottle color chart within{' '}
                <strong>{brand.readWithinSeconds} seconds</strong>.
              </li>
              <li>
                Dip the <strong>salt level strip</strong> separately and compare to the salt chart
                within {brand.readWithinSeconds} seconds.
              </li>
              <li>Scan with your camera or manually select the closest color match for each pad.</li>
            </ol>
            <p className="taylor-note taylor-note--optional">
              Strip timing values are from package documentation. Physical product verification is recommended.
            </p>
            <StripPrivacyNotice />
          </div>
        )}

        {step === 'method' && (
          <div className="quick-check-method">
            <p className="field__hint">Choose how you want to record your strip readings.</p>
            {cameraAvailable ? (
              <Button onClick={() => startScan('six_way')} type="button" size="lg">
                Scan Strip
              </Button>
            ) : (
              <p className="taylor-note">
                Camera scanning is not available in this browser. Use manual entry.
              </p>
            )}
            <Button variant="secondary" onClick={startManual} type="button" size="lg">
              Enter Manually
            </Button>
          </div>
        )}

        {step === 'scan' && (
          <>
            <StripTimingPanel
              brand={brand}
              stripLabel={scanPhase === 'salt' ? 'Salt strip' : 'Six-way strip'}
              timing={activeTiming}
              onTimingChange={scanPhase === 'salt' ? setSaltTiming : setSixWayTiming}
            />
            <StripScannerView
              phase={scanPhase}
              onCapture={handleScanCapture}
              onCancel={() => goTo('method')}
              onManualFallback={startManual}
              scanAllowed={activeTimingState.scanAllowed}
              timingBlockedMessage={
                !activeTimingState.scanAllowed ? getTimingMessage(activeTimingState, timingConfig) : undefined
              }
            />
          </>
        )}

        {step === 'verify' && (
          <StripScanVerification
            brand={brand}
            matches={scanMatches}
            selections={selections}
            onChange={updateSelection}
            onRescan={handleRescan}
            onContinue={handleVerifyContinue}
            needsSaltScan={needsSaltScan}
          />
        )}

        {step === 'entry' && (
          <StripManualEntry
            brand={brand}
            selections={selections}
            errors={errors}
            onChange={updateSelection}
          />
        )}

        {step === 'review' && (
          <div className="review-section">
            {usedScanner && (
              <AdaptiveLearningPrompt
                eligibleCount={eligibleLearningCount}
                enabled={learningEnabled}
                onEnabledChange={setLearningEnabled}
              />
            )}
            <div className="review-score">
              <span className="review-score__value">{preview.overallScore}</span>
              <span className="review-score__label">Water Quality Score (estimate)</span>
              <p>{preview.summary}</p>
              <StripAccuracyBadge level={accuracyLevel} />
            </div>

            <p className="taylor-note">
              Strip results are less precise than Taylor titration. Confirm unexpected values with a full Taylor test before large chemical additions.
            </p>

            <StripReviewSections
              brand={brand}
              selections={selections}
              onChange={updateSelection}
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
              placeholder="Weather, recent rain, bather load…"
            />
          </div>
        )}
      </Card>

      {step !== 'scan' && (
        <footer className="form-actions form-actions--taylor">
          {stepIndex > 0 && step !== 'verify' && (
            <Button variant="secondary" onClick={back} type="button">
              Back
            </Button>
          )}
          {step === 'welcome' || step === 'instructions' ? (
            <Button onClick={next} type="button">
              Continue
            </Button>
          ) : step === 'review' ? (
            <Button onClick={save} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save Quick Check'}
            </Button>
          ) : null}
        </footer>
      )}
    </div>
  );
}
