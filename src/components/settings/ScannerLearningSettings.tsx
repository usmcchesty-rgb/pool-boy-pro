import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  getAdaptiveProfileSummary,
  getLearningHealthSummary,
  getPadLearningProgress,
  getRecentLearningActivity,
  resetLearnedCalibration,
} from '../../strip/calibration/adaptiveLearning';
import {
  formatLastImproved,
  getLearningPhase,
  PHASE_BLEND_CONFIG,
} from '../../strip/calibration/learningPhases';
import {
  isAdaptiveLearningEnabled,
  pauseAdaptiveLearning,
  resumeAdaptiveLearning,
} from '../../strip/calibration/adaptiveStorage';
import { getActiveAnchorInfo } from '../../strip/calibration/anchorProvider';
import { ScannerLearningDetails } from './ScannerLearningDetails';

export function ScannerLearningSettings() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const summary = getAdaptiveProfileSummary();
  const paused = !isAdaptiveLearningEnabled();
  const phase = getLearningPhase(summary.verifiedScanCount);
  const phaseConfig = PHASE_BLEND_CONFIG[phase];

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function handlePauseResume() {
    if (paused) {
      resumeAdaptiveLearning();
    } else {
      pauseAdaptiveLearning();
    }
    refresh();
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetLearnedCalibration();
    setConfirmReset(false);
    refresh();
  }

  return (
    <Card title="Scanner Learning" key={refreshKey}>
      <p className="field__hint">
        Pool Boy Pro learns from your verified strip scans on this device. No photos are stored —
        only color numbers.
      </p>

      <dl className="scanner-learning-stats">
        <div className="scanner-learning-stats__row">
          <dt>Status</dt>
          <dd>{summary.statusLabel}</dd>
        </div>
        <div className="scanner-learning-stats__row">
          <dt>Calibration Quality</dt>
          <dd>{summary.calibrationQualityLabel}</dd>
        </div>
        <div className="scanner-learning-stats__row">
          <dt>Verified scans</dt>
          <dd>{summary.verifiedScanCount}</dd>
        </div>
        <div className="scanner-learning-stats__row">
          <dt>Confidence</dt>
          <dd>{summary.scannerConfidence}%</dd>
        </div>
        <div className="scanner-learning-stats__row">
          <dt>Last updated</dt>
          <dd>{formatLastImproved(summary.dateLastImproved)}</dd>
        </div>
      </dl>

      <div className="scanner-learning-actions">
        <Button variant="secondary" type="button" onClick={() => setDetailsOpen((v) => !v)}>
          {detailsOpen ? 'Hide Details' : 'View Details'}
        </Button>
        <Button variant="secondary" type="button" onClick={handlePauseResume}>
          {paused ? 'Resume Learning' : 'Pause Learning'}
        </Button>
        <Button variant="ghost" type="button" onClick={handleReset}>
          {confirmReset ? 'Confirm Reset' : 'Reset Learning'}
        </Button>
      </div>

      {confirmReset && (
        <p className="field__hint">
          This removes all learned calibration on this device. Tap Confirm Reset again to proceed.
        </p>
      )}

      {detailsOpen && (
        <ScannerLearningDetails
          summary={summary}
          health={getLearningHealthSummary()}
          padProgress={getPadLearningProgress()}
          activity={getRecentLearningActivity(10)}
          anchorInfo={getActiveAnchorInfo()}
          phaseLabel={phaseConfig.label}
        />
      )}
    </Card>
  );
}
