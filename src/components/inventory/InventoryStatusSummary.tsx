import type { InventorySummaryCounts } from '../../integrations/systemIntegration';

interface InventoryStatusSummaryProps {
  counts: InventorySummaryCounts;
}

export function InventoryStatusSummary({ counts }: InventoryStatusSummaryProps) {
  return (
    <div className="inventory-status-summary">
      <div className="inventory-status-summary__chip inventory-status-summary__chip--available">
        <span className="inventory-status-summary__label">Available</span>
        <span className="inventory-status-summary__count">{counts.available}</span>
      </div>
      <div className="inventory-status-summary__chip inventory-status-summary__chip--low">
        <span className="inventory-status-summary__label">Low</span>
        <span className="inventory-status-summary__count">{counts.low}</span>
      </div>
      <div className="inventory-status-summary__chip inventory-status-summary__chip--expired">
        <span className="inventory-status-summary__label">Expired</span>
        <span className="inventory-status-summary__count">{counts.expired}</span>
      </div>
      <div className="inventory-status-summary__chip inventory-status-summary__chip--near">
        <span className="inventory-status-summary__label">Expiring Soon</span>
        <span className="inventory-status-summary__count">{counts.nearExpired}</span>
      </div>
    </div>
  );
}
