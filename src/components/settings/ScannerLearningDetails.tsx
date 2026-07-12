import type { AdaptiveProfileSummary, LearningHealthSummary, PadLearningProgress } from '../../strip/calibration/adaptiveTypes';
import type { LearningActivityEntry } from '../../strip/calibration/adaptiveTypes';
import type { getActiveAnchorInfo } from '../../strip/calibration/anchorProvider';

interface ScannerLearningDetailsProps {
  summary: AdaptiveProfileSummary;
  health: LearningHealthSummary;
  padProgress: PadLearningProgress[];
  activity: LearningActivityEntry[];
  anchorInfo: ReturnType<typeof getActiveAnchorInfo>;
  phaseLabel: string;
}

export function ScannerLearningDetails({
  summary,
  health,
  padProgress,
  activity,
  anchorInfo,
  phaseLabel,
}: ScannerLearningDetailsProps) {
  return (
    <div className="scanner-learning-details">
      <h3 className="scanner-learning-details__title">Advanced details</h3>

      <dl className="scanner-learning-details__grid">
        <div><dt>Learning phase</dt><dd>Phase {summary.currentPhase} — {phaseLabel}</dd></div>
        <div><dt>Accepted samples</dt><dd>{health.totalAcceptedSamples}</dd></div>
        <div><dt>Rejected samples</dt><dd>{health.totalRejectedSamples}</dd></div>
        <div><dt>Verified pads</dt><dd>{summary.verifiedPadsCount}</dd></div>
        <div><dt>Active learned anchors</dt><dd>{health.activeLearnedAnchors}</dd></div>
        <div><dt>Anchor source</dt><dd>{anchorInfo.label}</dd></div>
        <div><dt>Baseline blend</dt><dd>{Math.round(summary.baselineWeight * 100)}%</dd></div>
        <div><dt>Learned blend</dt><dd>{Math.round(summary.learnedWeight * 100)}%</dd></div>
        <div><dt>Outliers rejected</dt><dd>{summary.rejectedOutlierCount}</dd></div>
        <div><dt>False-high corrections</dt><dd>{summary.falseHighConfidenceCount}</dd></div>
        <div><dt>Rollbacks</dt><dd>{health.rollbackCount}</dd></div>
        <div><dt>Calibration version</dt><dd>{summary.calibrationVersion}</dd></div>
      </dl>

      <h4 className="scanner-learning-details__subtitle">Per-pad confidence</h4>
      <ul className="scanner-learning-details__pads">
        {padProgress.map((pad) => (
          <li key={pad.padId}>
            <strong>{pad.label}</strong>
            {' — '}
            {pad.sampleCount} sample{pad.sampleCount !== 1 ? 's' : ''},
            {' '}
            {Math.round(pad.learnedWeight * 100)}% learned,
            {' '}
            variance {pad.varianceLab.toFixed(1)},
            {' '}
            {pad.status.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>

      {activity.length > 0 && (
        <>
          <h4 className="scanner-learning-details__subtitle">Recent activity</h4>
          <ul className="scanner-learning-details__activity">
            {activity.map((entry) => (
              <li key={entry.id}>
                {entry.accepted ? 'Accepted' : 'Rejected'} {entry.padId}
                {entry.confirmedValue !== undefined ? ` = ${entry.confirmedValue}` : ''}
                {entry.rejectionReason ? ` (${entry.rejectionReason})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
