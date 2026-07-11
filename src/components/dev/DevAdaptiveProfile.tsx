import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { CLOROX_SALT_POOL_STRIP } from '../../strip/brands/cloroxSaltPool';
import { getAdaptiveProfileSummary } from '../../strip/calibration/anchorProvider';
import {
  exportAdaptiveLearningJson,
  getLearningHealthSummary,
  getPadLearningProgress,
  getRecentLearningActivity,
  invalidateAdaptiveCache,
  rebuildLearnedAnchors,
  resetLearnedCalibration,
  resetLearnedPad,
  resetLearnedPadValue,
} from '../../strip/calibration/adaptiveLearning';
import {
  isAdaptiveLearningEnabled,
  saveAdaptiveProfile,
  setAdaptiveLearningEnabled,
} from '../../strip/calibration/adaptiveStorage';
import { importAdaptiveLearning } from '../../strip/calibration/adaptiveImport';
import { invalidateAnchorCache } from '../../strip/calibration/anchorProvider';
import type { LearningHealthStatus, PadLearningStatus } from '../../strip/calibration/adaptiveTypes';

const HEALTH_LABELS: Record<LearningHealthStatus, string> = {
  not_enough_data: 'Not enough data',
  learning: 'Learning',
  stable: 'Stable',
  needs_review: 'Needs review',
};

const PAD_STATUS_LABELS: Record<PadLearningStatus, string> = {
  baseline_only: 'Baseline only',
  learning: 'Learning',
  stable: 'Stable',
  unreliable: 'Unreliable',
};

function formatTime(ts: string | number): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return d.toLocaleString();
}

function confirmAction(message: string): boolean {
  return window.confirm(message);
}

export function DevAdaptiveProfile() {
  const [summary, setSummary] = useState(getAdaptiveProfileSummary());
  const [health, setHealth] = useState(getLearningHealthSummary());
  const [padProgress, setPadProgress] = useState(getPadLearningProgress());
  const [activity, setActivity] = useState(getRecentLearningActivity(15));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    invalidateAdaptiveCache();
    rebuildLearnedAnchors();
    invalidateAnchorCache();
    setSummary(getAdaptiveProfileSummary());
    setHealth(getLearningHealthSummary());
    setPadProgress(getPadLearningProgress());
    setActivity(getRecentLearningActivity(15));
  }

  function handleDisableLearning() {
    setAdaptiveLearningEnabled(false);
    refresh();
    setMsg('Adaptive learning disabled');
  }

  function handleEnableLearning() {
    setAdaptiveLearningEnabled(true);
    refresh();
    setMsg('Adaptive learning enabled');
  }

  function handleResetAll() {
    if (!confirmAction('Reset ALL adaptive learning data? Developer calibration will be kept. This cannot be undone.')) return;
    resetLearnedCalibration();
    refresh();
    setMsg('All adaptive learning reset — baseline anchors preserved');
  }

  function handleResetPad(padId: string, label: string) {
    if (!confirmAction(`Reset all learned data for ${label}? Samples will be removed.`)) return;
    const removed = resetLearnedPad(padId);
    rebuildLearnedAnchors();
    invalidateAnchorCache();
    refresh();
    setMsg(`Reset ${label} — removed ${removed} samples`);
  }

  function handleResetPadValue(padId: string, value: number, label: string) {
    if (!confirmAction(`Reset learned data for ${label} = ${value}?`)) return;
    const removed = resetLearnedPadValue(padId, value);
    rebuildLearnedAnchors();
    invalidateAnchorCache();
    refresh();
    setMsg(`Reset ${label} ${value} — removed ${removed} samples`);
  }

  function handleExport() {
    const blob = new Blob([exportAdaptiveLearningJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adaptive-learning-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown;
        const result = importAdaptiveLearning(parsed);
        if (result.ok) {
          saveAdaptiveProfile(result.data);
          refresh();
          setMsg(`Imported ${result.data.samples.length} samples`);
          setErr('');
        } else {
          setErr(result.errors.join('; '));
        }
      } catch {
        setErr('Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="dev-adaptive-profile">
      <section className="dev-adaptive-health">
        <h3>Adaptive Learning Health</h3>
        <p className={`dev-adaptive-health__status dev-adaptive-health__status--${health.overallStatus}`}>
          <strong>Status:</strong> {HEALTH_LABELS[health.overallStatus]}
        </p>
        <dl className="dev-adaptive-health__metrics">
          <dt>Accepted samples</dt><dd>{health.totalAcceptedSamples}</dd>
          <dt>Rejected samples</dt><dd>{health.totalRejectedSamples}</dd>
          <dt>Active learned anchors</dt><dd>{health.activeLearnedAnchors}</dd>
          <dt>Baseline only anchors</dt><dd>{health.baselineOnlyAnchors}</dd>
          <dt>High-variance anchors</dt><dd>{health.highVarianceAnchors}</dd>
          <dt>False-high corrections</dt><dd>{health.falseHighConfidenceCorrections}</dd>
          <dt>Rollbacks</dt><dd>{health.rollbackCount}</dd>
          <dt>Last update</dt><dd>{formatTime(health.lastLearningUpdate)}</dd>
        </dl>
        <p className="field__hint"><strong>Active source:</strong> {summary.activeSourceLabel}</p>
      </section>

      <section className="dev-adaptive-pads">
        <h3>Per-Pad Progress</h3>
        <ul className="dev-adaptive-pads__list">
          {padProgress.map((pad) => (
            <li key={pad.padId} className={`dev-adaptive-pads__item dev-adaptive-pads__item--${pad.status}`}>
              <div className="dev-adaptive-pads__header">
                <strong>{pad.label}</strong>
                <span className="dev-adaptive-pads__badge">{PAD_STATUS_LABELS[pad.status]}</span>
              </div>
              <p className="field__hint">
                Samples: {pad.sampleCount} · Active values: {pad.activeLearnedValues}/{pad.totalChartValues} ·
                Baseline {(pad.baselineWeight * 100).toFixed(0)}% / Learned {(pad.learnedWeight * 100).toFixed(0)}% ·
                Variance: {pad.varianceLab.toFixed(1)} · Corrections: {(pad.recentCorrectionRate * 100).toFixed(0)}%
              </p>
              {pad.topMistake && (
                <p className="field__hint">
                  Top mistake: {pad.topMistake.proposed}→{pad.topMistake.confirmed} ({pad.topMistake.count}×)
                </p>
              )}
              {pad.disabledAnchors > 0 && (
                <p className="taylor-note">{pad.disabledAnchors} anchor(s) rolled back to baseline</p>
              )}
              <Button size="sm" variant="ghost" onClick={() => handleResetPad(pad.padId, pad.label)} type="button">
                Reset pad
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="dev-adaptive-activity">
        <h3>Recent Learning Activity</h3>
        {activity.length === 0 ? (
          <p className="field__hint">No learning activity yet</p>
        ) : (
          <ul className="dev-calibration__samples">
            {activity.map((entry) => (
              <li key={entry.id} className={entry.accepted ? '' : 'dev-calibration__sample--rejected'}>
                <span>
                  {entry.accepted ? '✓' : '✗'} {entry.padId}
                  {entry.confirmedValue !== undefined ? ` = ${entry.confirmedValue}` : ''}
                  {' · '}Q {(entry.qualityScore * 100).toFixed(0)}%
                  {' · '}{formatTime(entry.timestamp)}
                </span>
                {!entry.accepted && entry.rejectionReason && (
                  <span className="field__hint"> — {entry.rejectionReason}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="backup-actions">
        {isAdaptiveLearningEnabled() ? (
          <Button variant="secondary" onClick={handleDisableLearning} type="button">Disable Learning</Button>
        ) : (
          <Button variant="secondary" onClick={handleEnableLearning} type="button">Enable Learning</Button>
        )}
        <Button variant="ghost" onClick={handleResetAll} type="button">Reset All Learning</Button>
        <Button variant="secondary" onClick={handleExport} type="button">Export JSON</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} type="button">Import JSON</Button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
      </div>

      {msg && <p className="page-message page-message--success">{msg}</p>}
      {err && <p className="field__error">{err}</p>}

      <details>
        <summary>Reset individual pad values</summary>
        <ul className="dev-adaptive-reset-list">
          {CLOROX_SALT_POOL_STRIP.pads.map((pad) =>
            pad.scaleValues.map((value) => (
              <li key={`${pad.id}-${value}`}>
                {pad.label} = {value}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleResetPadValue(pad.id, value, pad.label)}
                  type="button"
                >
                  Reset
                </Button>
              </li>
            ))
          )}
        </ul>
      </details>
    </div>
  );
}
