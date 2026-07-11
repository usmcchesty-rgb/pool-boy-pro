import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { WaterAnalysisResult, WaterReadings } from '../../models/types';
import { suggestMaintenanceFromParameter } from '../../integrations/systemIntegration';
import { ScoreRing } from '../ui/ScoreRing';
import { ParameterRow } from './ParameterRow';
import { RecommendationList } from './RecommendationList';
import { WaterBalanceDetail } from './WaterBalanceDetail';
import { CreateMaintenanceButton } from '../integrations/CreateMaintenanceButton';
import { formatRating } from '../../utilities/format';
import { sortParametersForDetail } from '../../utilities/analysisDisplay';

interface WaterAnalysisDetailProps {
  analysis: WaterAnalysisResult;
  readings: WaterReadings;
}

export function WaterAnalysisDetail({ analysis, readings }: WaterAnalysisDetailProps) {
  const { chemicalInventory, equipment } = useApp();
  const { issues, ideal } = sortParametersForDetail(analysis.parameters);
  const rating = analysis.overallRating;

  const issueMaintenance = useMemo(
    () =>
      issues
        .map((param) => ({
          param,
          suggestion: suggestMaintenanceFromParameter(param, equipment),
        }))
        .filter((entry) => entry.suggestion),
    [issues, equipment]
  );

  return (
    <div className="analysis-detail">
      <section className="analysis-detail__overview" aria-label="Overall water quality">
        <div className="analysis-detail__score">
          <ScoreRing
            score={analysis.overallScore}
            status={analysis.overallStatus}
            size={140}
          />
          <div className="analysis-detail__headline">
            <p className="analysis-detail__label">Water Health Score</p>
            <p
              className={`analysis-detail__rating${
                rating ? ` analysis-detail__rating--${rating}` : ''
              }`}
            >
              {rating ? formatRating(rating) : '—'}
            </p>
          </div>
        </div>
        <p className="analysis-detail__summary">{analysis.summary}</p>
      </section>

      {analysis.waterBalance && (
        <WaterBalanceDetail waterBalance={analysis.waterBalance} />
      )}

      <section className="analysis-detail__section" aria-label="Parameters needing attention">
        <h2 className="analysis-detail__section-title">Parameters Needing Attention</h2>
        {issues.length > 0 ? (
          <div className="analysis-detail__params">
            {issues.map((param) => (
              <ParameterRow key={param.parameter} param={param} detail />
            ))}
          </div>
        ) : (
          <p className="analysis-detail__balanced">
            All tested parameters are within ideal ranges.
          </p>
        )}
        {issueMaintenance.length > 0 && (
          <div className="analysis-detail__maintenance-suggestions">
            {issueMaintenance.map(({ param, suggestion }) =>
              suggestion ? (
                <CreateMaintenanceButton key={param.parameter} suggestion={suggestion} />
              ) : null
            )}
          </div>
        )}
      </section>

      {ideal.length > 0 && (
        <section className="analysis-detail__section analysis-detail__section--ideal" aria-label="Ideal parameters">
          <details className="analysis-detail__ideal">
            <summary className="analysis-detail__ideal-summary">
              Ideal Parameters ({ideal.length})
            </summary>
            <div className="analysis-detail__ideal-list">
              {ideal.map((param) => (
                <ParameterRow key={param.parameter} param={param} compact />
              ))}
            </div>
          </details>
        </section>
      )}

      <section className="analysis-detail__section" aria-label="Treatment recommendations">
        <h2 className="analysis-detail__section-title">Treatment Plan</h2>
        <p className="analysis-detail__section-intro">
          Follow these steps in order. Wait times and retest notes are included for each treatment.
        </p>
        <RecommendationList
          recommendations={analysis.recommendations}
          treatmentPlan={analysis.treatmentPlan}
          readings={readings}
          inventory={chemicalInventory}
          equipment={equipment}
        />
      </section>
    </div>
  );
}
