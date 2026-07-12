import { useMemo, useRef, useState, useEffect } from 'react';
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
import {
  StripScannerView,
  type ScanPhase,
  type StripScannerHandle,
} from './StripScannerView';
import { StripPrivacyNotice } from './StripPrivacyNotice';
import { StripTimingPanel, createStripTiming, type StripTimingState } from './StripTimingPanel';
import {
  advanceStripTiming,
  getStripTimingConfig,
  getTimingMessage,
} from '../../strip/calibration/timing';
import {
  StripScanVerification,
  type StripScanVerificationHandle,
  matchesToSelections,
  mergeScanMatches,
  overallScanAccuracy,
  overallScanConfidence,
} from './StripScanVerification';
import type { PoolInfo, StripCaptureMethod } from '../../models/types';
import type { StripBrandDefinition, StripPadSelections } from '../../strip/types';
import type { PadMatchResult, ScanProcessResult } from '../../strip/scanner/types';
import type { ScanCapturePackage } from '../../strip/scanner/scanProcessor';
import { previewSessionFromCapture } from '../../strip/scanner/scanProcessor';
import {
  releasePreviewSession,
  resamplePadsFromPreview,
  resetStripBoxToOriginal,
  hasPreviewSession,
  storePreviewSession,
} from '../../strip/scanner/temporaryPreview';
import { StripCorrectionView, StripSampleAreaView } from './StripCorrectionView';
import { getDefaultStripBrand } from '../../strip/stripRegistry';
import { stripSelectionsToWaterReadings } from '../../strip/stripReadings';
import { getOverallStripAccuracy } from '../../strip/stripConfidence';
import { analyzeTest } from '../../chemistry/recommendations';
import { poolFromSettings } from '../../services/testService';
import type { CreateStripTestOptions } from '../../services/quickCheckService';
import { isCameraSupported, releaseActiveCameraStream } from '../../strip/scanner/cameraSession';
import {
  processVerifiedScanLearning,
  type ScanTimingMeta,
} from '../../services/adaptiveLearningService';
import { isAdaptiveLearningEnabled } from '../../strip/calibration/adaptiveStorage';
import {
  hasShownLearningThankYou,
  markLearningThankYouShown,
} from '../../strip/calibration/learningFeedback';
import { LearningThankYouNotice } from '../settings/LearningThankYouNotice';
import { isSaltSanitizer } from '../../models/taylorKit';
import {
  validateManualStripEntry,
  validateScanStripSelections,
  type SaltEntryMode,
} from '../../strip/quickCheckValidation';

export type QuickCheckStep =
  | 'welcome'
  | 'instructions'
  | 'method'
  | 'scan'
  | 'correct'
  | 'verify'
  | 'entry'
  | 'review';

type EntryMode = 'scan' | 'manual';

const STEP_LABELS: Record<QuickCheckStep, string> = {
  welcome: 'Welcome',
  instructions: 'Instructions',
  method: 'How to Read',
  scan: 'Scan Strip',
  correct: 'Adjust Strip Area',
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
  const scannerRef = useRef<StripScannerHandle>(null);
  const verifyRef = useRef<StripScanVerificationHandle>(null);

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
  const [showThankYou, setShowThankYou] = useState(false);
  const [scanSessionId] = useState(() => `scan-${Date.now()}`);

  const [saltSkipped, setSaltSkipped] = useState(false);
  const [saltMode, setSaltMode] = useState<SaltEntryMode>('scale');
  const [saltScaleReading, setSaltScaleReading] = useState('');
  const [verifyCanContinue, setVerifyCanContinue] = useState(false);
  const [scannerCanCapture, setScannerCanCapture] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [needsCorrection, setNeedsCorrection] = useState(false);
  const [correctionKey, setCorrectionKey] = useState(0);

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
  const saltRequired = isSaltSanitizer(pool.sanitizerType);

  const manualValidation = useMemo(
    () => validateManualStripEntry(brand, selections, pool, saltSkipped),
    [brand, selections, pool, saltSkipped]
  );

  const missingSummary =
    step === 'entry' && !manualValidation.canContinue
      ? `Still needed: ${manualValidation.missingLabels.join(', ')}`
      : undefined;

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
    const nextStep = visibleSteps[stepIndex + 1];
    if (nextStep) goTo(nextStep);
  }

  function back() {
    const prevStep = visibleSteps[stepIndex - 1];
    if (prevStep) goTo(prevStep);
  }

  useEffect(() => {
    return () => {
      releasePreviewSession();
    };
  }, []);

  function applyCaptureResult(result: ScanProcessResult, phase: ScanPhase) {
    const merged = mergeScanMatches(scanMatches, result.padMatches);
    setScanMatches(merged);
    setSelections((prev) => ({ ...prev, ...matchesToSelections(result.padMatches) }));
    setCaptureQuality(result.quality);
    setScanTimingMeta((prev) => ({
      ...prev,
      [phase]: {
        expired: activeTimingState.phase === 'window_expired',
        acknowledged: activeTimingState.expiredAcknowledged,
      },
    }));
  }

  function startScan(phase: ScanPhase = 'six_way') {
    setEntryMode('scan');
    setScanPhase(phase);
    setUsedScanner(true);
    goTo('scan');
  }

  function startManual() {
    releaseActiveCameraStream();
    releasePreviewSession();
    setShowSamplePreview(false);
    setEntryMode('manual');
    setScanMatches([]);
    setUsedScanner(false);
    goTo('entry');
  }

  function handleScanCapture(pkg: ScanCapturePackage, phase: ScanPhase) {
    storePreviewSession(previewSessionFromCapture(pkg));
    setScanPhase(phase);
    setNeedsCorrection(pkg.geometry.requiresCorrection);

    if (pkg.geometry.requiresCorrection) {
      goTo('correct');
      return;
    }

    applyCaptureResult(pkg.result, phase);
    goTo('verify');
  }

  function handleApplyCorrection() {
    const result = resamplePadsFromPreview({ geometrySource: 'adjusted_strip_box' });
    if (!result) return;
    applyCaptureResult(result, scanPhase);
    setNeedsCorrection(false);
    goTo('verify');
  }

  function handleUseDetectedArea() {
    resetStripBoxToOriginal();
    const result = resamplePadsFromPreview({ geometrySource: 'automatic_detection' });
    if (!result) return;
    applyCaptureResult(result, scanPhase);
    setNeedsCorrection(false);
    goTo('verify');
  }

  function handleContinueAnywayCorrection() {
    const result = resamplePadsFromPreview({ forceContinueAnyway: true });
    if (!result) return;
    applyCaptureResult(result, scanPhase);
    setNeedsCorrection(false);
    goTo('verify');
  }

  function handleRescan(phase: ScanPhase) {
    releasePreviewSession();
    setShowSamplePreview(false);
    setScanPhase(phase);
    if (phase === 'salt') {
      setSaltTiming(createStripTiming());
    } else {
      setSixWayTiming(createStripTiming());
    }
    goTo('scan');
  }

  function handleVerifyContinue(confirmed: Set<string>) {
    const validation = validateScanStripSelections(
      brand,
      selections,
      pool,
      !needsSaltScan
    );
    if (!validation.canContinue) {
      setErrors(validation.errors);
      return;
    }
    setVerifiedPadIds(confirmed);
    setErrors({});
    releasePreviewSession();
    setShowSamplePreview(false);
    goTo('review');
  }

  function handleEntryContinue() {
    const validation = validateManualStripEntry(brand, selections, pool, saltSkipped);
    if (!validation.canContinue) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    goTo('review');
  }

  async function save() {
    const validation =
      entryMode === 'manual'
        ? validateManualStripEntry(brand, selections, pool, saltSkipped)
        : validateScanStripSelections(brand, selections, pool, !needsSaltScan);

    if (!validation.canContinue) {
      setErrors(validation.errors);
      goTo(entryMode === 'scan' ? 'verify' : 'entry');
      return;
    }
    setSaving(true);
    try {
      const captureMethod: StripCaptureMethod = usedScanner ? 'camera_verified' : 'manual';

      if (usedScanner && isAdaptiveLearningEnabled()) {
        const learningResult = processVerifiedScanLearning({
          brand,
          scanMatches,
          selections,
          captureQuality,
          timingMeta: scanTimingMeta,
          verifiedPadIds,
          scanSessionId,
          learningEnabled: true,
        });

        if (learningResult.added > 0 && !hasShownLearningThankYou()) {
          markLearningThankYouShown();
          setShowThankYou(true);
        }
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
      <LearningThankYouNotice
        visible={showThankYou}
        onDismiss={() => setShowThankYou(false)}
      />
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
              ref={scannerRef}
              phase={scanPhase}
              onCapture={handleScanCapture}
              onCancel={() => {
                releaseActiveCameraStream();
                releasePreviewSession();
                goTo('method');
              }}
              onManualFallback={startManual}
              onCaptureStateChange={(s) => {
                setScannerCanCapture(s.canManualCapture);
                setScannerStatus(s.statusMessage);
              }}
              scanAllowed={activeTimingState.scanAllowed}
              timingBlockedMessage={
                !activeTimingState.scanAllowed ? getTimingMessage(activeTimingState, timingConfig) : undefined
              }
            />
            {scannerStatus && (
              <p className="strip-scanner__status-footer field__hint" role="status">
                {scannerStatus}
              </p>
            )}
          </>
        )}

        {step === 'correct' && <StripCorrectionView key={correctionKey} />}

        {step === 'verify' && (
          <>
            {showSamplePreview && (
              <StripSampleAreaView onClose={() => setShowSamplePreview(false)} />
            )}
            <StripScanVerification
              ref={verifyRef}
              brand={brand}
              matches={scanMatches}
              selections={selections}
              onChange={updateSelection}
              onRescan={handleRescan}
              onContinue={handleVerifyContinue}
              needsSaltScan={needsSaltScan && saltRequired}
              hideActions
              onCanContinueChange={setVerifyCanContinue}
              canViewSample={hasPreviewSession()}
              onViewSample={() => setShowSamplePreview(true)}
            />
          </>
        )}

        {step === 'entry' && (
          <StripManualEntry
            brand={brand}
            selections={selections}
            errors={errors}
            pool={pool}
            saltSkipped={saltSkipped}
            onSaltSkippedChange={setSaltSkipped}
            saltMode={saltMode}
            onSaltModeChange={setSaltMode}
            saltScaleReading={saltScaleReading}
            onSaltScaleReadingChange={setSaltScaleReading}
            onChange={updateSelection}
            missingSummary={missingSummary}
          />
        )}

        {step === 'review' && (
          <div className="review-section">
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

            {entryMode === 'manual' && saltMode === 'scale' && selections.salt !== undefined && saltScaleReading && (
              <p className="field__hint">
                Salt entered as scale <strong>{saltScaleReading}</strong> → <strong>{selections.salt.toLocaleString()} ppm</strong>
              </p>
            )}

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

      <footer className="form-actions form-actions--taylor form-actions--quick-check">
        {step === 'welcome' || step === 'instructions' ? (
          <>
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={back} type="button">
                Back
              </Button>
            )}
            <Button onClick={next} type="button">
              Continue
            </Button>
          </>
        ) : step === 'method' ? (
          <>
            <Button variant="secondary" onClick={back} type="button">
              Back
            </Button>
            {cameraAvailable && (
              <Button onClick={() => startScan('six_way')} type="button">
                Scan Strip
              </Button>
            )}
            <Button variant="secondary" onClick={startManual} type="button">
              Enter Manually
            </Button>
          </>
        ) : step === 'scan' ? (
          <>
            <Button
              onClick={() => scannerRef.current?.captureNow()}
              disabled={!scannerCanCapture}
              type="button"
            >
              Capture Now
            </Button>
            <Button variant="secondary" onClick={startManual} type="button">
              Enter Manually
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                releaseActiveCameraStream();
                goTo('method');
              }}
              type="button"
            >
              Cancel
            </Button>
          </>
        ) : step === 'correct' ? (
          <>
            <Button variant="secondary" onClick={handleUseDetectedArea} type="button">
              Use Detected Area
            </Button>
            <Button variant="secondary" onClick={() => { resetStripBoxToOriginal(); setCorrectionKey((k) => k + 1); }} type="button">
              Reset
            </Button>
            <Button onClick={handleApplyCorrection} type="button">
              Apply and Rescan Colors
            </Button>
            <Button variant="secondary" onClick={() => handleRescan(scanPhase)} type="button">
              Rescan Camera
            </Button>
            {needsCorrection && (
              <Button variant="ghost" onClick={handleContinueAnywayCorrection} type="button">
                Continue Anyway with Manual Verification
              </Button>
            )}
          </>
        ) : step === 'verify' ? (
          <>
            <Button variant="secondary" onClick={() => verifyRef.current?.rescan()} type="button">
              Rescan
            </Button>
            <Button
              onClick={() => verifyRef.current?.continueToReview()}
              disabled={!verifyCanContinue}
              type="button"
            >
              Continue to Review
            </Button>
          </>
        ) : step === 'entry' ? (
          <>
            <Button variant="secondary" onClick={back} type="button">
              Back
            </Button>
            <Button
              onClick={handleEntryContinue}
              disabled={!manualValidation.canContinue}
              type="button"
            >
              Continue to Review
            </Button>
          </>
        ) : step === 'review' ? (
          <>
            <Button
              variant="secondary"
              onClick={() => goTo(entryMode === 'scan' ? 'verify' : 'entry')}
              type="button"
            >
              Back to Edit
            </Button>
            <Button onClick={save} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save Quick Test'}
            </Button>
          </>
        ) : null}
      </footer>
    </div>
  );
}
