import type { WaterBalanceAnalysis } from '../../models/types';
import { formatCSIValue } from '../../chemistry/csi';

interface WaterBalanceSummaryProps {
  waterBalance: WaterBalanceAnalysis;
}

function indicatorClass(classification: WaterBalanceAnalysis['classification']): string {
  return `water-balance-indicator water-balance-indicator--${classification}`;
}

export function WaterBalanceSummary({ waterBalance }: WaterBalanceSummaryProps) {
  return (
    <section className="dashboard-health__section dashboard-water-balance" aria-label="Water balance">
      <h3 className="dashboard-health__section-title">Water Balance</h3>
      <div className="dashboard-water-balance__row">
        <span className={indicatorClass(waterBalance.classification)} aria-hidden="true" />
        <div className="dashboard-water-balance__content">
          <p className="dashboard-water-balance__label">CSI</p>
          <p className="dashboard-water-balance__value">{formatCSIValue(waterBalance.value)}</p>
          <p className="dashboard-water-balance__status">{waterBalance.label}</p>
        </div>
      </div>
      <p className="dashboard-water-balance__summary">{waterBalance.summary}</p>
    </section>
  );
}
