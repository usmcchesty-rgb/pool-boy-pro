import type { WaterBalanceAnalysis } from '../../models/types';
import { formatCSIValue } from '../../chemistry/csi';

interface WaterBalanceDetailProps {
  waterBalance: WaterBalanceAnalysis;
}

function indicatorClass(classification: WaterBalanceAnalysis['classification']): string {
  return `water-balance-indicator water-balance-indicator--${classification}`;
}

export function WaterBalanceDetail({ waterBalance }: WaterBalanceDetailProps) {
  const { explanation, factors } = waterBalance;

  return (
    <section className="analysis-detail__section water-balance-detail" aria-label="Water balance CSI">
      <h2 className="analysis-detail__section-title">Water Balance (CSI)</h2>

      <div className="water-balance-detail__hero">
        <span className={indicatorClass(waterBalance.classification)} aria-hidden="true" />
        <div>
          <p className="water-balance-detail__metric-label">CSI</p>
          <p className="water-balance-detail__metric-value">{formatCSIValue(waterBalance.value)}</p>
          <p className="water-balance-detail__status">{waterBalance.label}</p>
        </div>
      </div>

      <p className="water-balance-detail__summary">{waterBalance.summary}</p>

      <dl className="water-balance-detail__facts">
        <div>
          <dt>Status</dt>
          <dd>{waterBalance.label}</dd>
        </div>
        <div>
          <dt>Adjusted alkalinity</dt>
          <dd>{waterBalance.adjustedAlkalinity} ppm</dd>
        </div>
        <div>
          <dt>Recommended action</dt>
          <dd>{waterBalance.recommendedAction}</dd>
        </div>
      </dl>

      <div className="water-balance-detail__explain">
        <p><strong>Meaning:</strong> {explanation.meaning}</p>
        <p><strong>Why it matters:</strong> {explanation.whyItMatters}</p>
        <p><strong>Scaling risk:</strong> {explanation.scalingRisk}</p>
        <p><strong>Corrosion risk:</strong> {explanation.corrosionRisk}</p>
        <p><strong>Suggested correction:</strong> {explanation.suggestedCorrection}</p>
      </div>

      <details className="water-balance-detail__formula">
        <summary>Calculation breakdown</summary>
        <p className="field__hint">
          LSI = pH + TF + CF + AF − {factors.constant}
        </p>
        <ul>
          <li>pH: {factors.ph}</li>
          <li>Temperature factor (TF @ {Math.round(factors.temperatureF)}°F): {factors.temperatureFactor}</li>
          <li>Calcium factor (CF): {factors.calciumFactor}</li>
          <li>Alkalinity factor (AF, adj. {factors.adjustedAlkalinity} ppm): {factors.alkalinityFactor}</li>
        </ul>
      </details>
    </section>
  );
}
