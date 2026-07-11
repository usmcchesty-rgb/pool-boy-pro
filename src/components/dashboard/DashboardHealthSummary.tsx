import { NavButton } from '../ui/NavButton';
import type { ChemicalInventoryItem, PoolEquipment, WaterAnalysisResult } from '../../models/types';
import { ScoreRing } from '../ui/ScoreRing';
import { LevelBadge } from '../ui/LevelBadge';
import { formatDateTime, formatRating, formatRelativeDate } from '../../utilities/format';
import {
  getDashboardHealthData,
  resolveParameterLevel,
} from '../../utilities/dashboardAnalysis';
import { enrichRecommendation } from '../../integrations/systemIntegration';
import { WaterBalanceSummary } from './WaterBalanceSummary';
import { InventoryAvailabilityBadge } from '../integrations/InventoryAvailabilityBadge';

import { TestSourceBadge } from '../strip/TestSourceBadge';

interface DashboardHealthSummaryProps {
  analysis: WaterAnalysisResult;
  testDate: string;
  testId: string;
  sourceLabel: string;
  accuracyLabel: string;
  inventory?: ChemicalInventoryItem[];
  equipment?: PoolEquipment[];
}

export function DashboardHealthSummary({
  analysis,
  testDate,
  testId,
  sourceLabel,
  accuracyLabel,
  inventory = [],
  equipment = [],
}: DashboardHealthSummaryProps) {
  const { issues, topRecommendation } = getDashboardHealthData(analysis);
  const rating = analysis.overallRating;
  const topIntegrated = topRecommendation
    ? enrichRecommendation(topRecommendation, inventory, equipment)
    : null;

  return (
    <div className="dashboard-health">
      <div className="dashboard-health__score-row">
        <ScoreRing
          score={analysis.overallScore}
          status={analysis.overallStatus}
        />
        <div className="dashboard-health__headline">
          <TestSourceBadge
            label={sourceLabel}
            accuracyLabel={accuracyLabel}
            compact
          />
          <p className="dashboard-health__label">Water Health Score</p>
          <p
            className={`dashboard-health__rating${
              rating ? ` dashboard-health__rating--${rating}` : ''
            }`}
          >
            {rating ? formatRating(rating) : '—'}
          </p>
          <p className="dashboard-health__date">{formatRelativeDate(testDate)}</p>
          <p className="dashboard-health__datetime">{formatDateTime(testDate)}</p>
        </div>
      </div>

      {analysis.waterBalance && (
        <WaterBalanceSummary waterBalance={analysis.waterBalance} />
      )}

      <section className="dashboard-health__section" aria-label="Top water quality issues">
        <h3 className="dashboard-health__section-title">Top Issues</h3>
        {issues.length > 0 ? (
          <ul className="dashboard-health__issues">
            {issues.map((param) => (
              <li key={param.parameter} className="dashboard-health__issue">
                <span className="dashboard-health__issue-name">{param.label}</span>
                <LevelBadge level={resolveParameterLevel(param)} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-health__balanced">No significant issues detected.</p>
        )}
      </section>

      <section className="dashboard-health__section" aria-label="Priority recommendation">
        <h3 className="dashboard-health__section-title">Priority Action</h3>
        {topRecommendation && topIntegrated ? (
          <div className="dashboard-health__rec">
            <p className="dashboard-health__rec-chemical">{topRecommendation.chemical}</p>
            <p className="dashboard-health__rec-amount">{topRecommendation.amount}</p>
            <p className="dashboard-health__rec-reason">{topRecommendation.reason}</p>
            <InventoryAvailabilityBadge
              recommendation={topRecommendation}
              status={topIntegrated.inventory}
              compact
            />
          </div>
        ) : (
          <p className="dashboard-health__balanced">
            No chemical adjustments needed — your water is balanced.
          </p>
        )}
      </section>

      <div className="dashboard-health__footer">
        <NavButton to={`/history/${testId}`} variant="secondary" size="sm">
          View Details
        </NavButton>
      </div>
    </div>
  );
}
