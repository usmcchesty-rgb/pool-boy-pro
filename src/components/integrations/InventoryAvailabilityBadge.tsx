import type { RecommendationInventoryStatus } from '../../integrations/systemIntegration';
import { isTrackableChemicalRecommendation } from '../../integrations/systemIntegration';
import type { DosingRecommendation } from '../../models/types';

interface InventoryAvailabilityBadgeProps {
  recommendation: DosingRecommendation;
  status: RecommendationInventoryStatus;
  compact?: boolean;
}

export function InventoryAvailabilityBadge({
  recommendation,
  status,
  compact,
}: InventoryAvailabilityBadgeProps) {
  if (!isTrackableChemicalRecommendation(recommendation)) return null;

  if (status.available) {
    return (
      <div className={`integration-badge integration-badge--available ${compact ? 'integration-badge--compact' : ''}`}>
        <span className="integration-badge__icon" aria-hidden="true">✓</span>
        <span>
          Available
          {!compact && status.matches.length > 1 && (
            <span className="integration-badge__detail">
              {' '}
              — {status.matches.map((item) => item.productName).join(', ')}
            </span>
          )}
          {!compact && status.matches.length === 1 && (
            <span className="integration-badge__detail"> — {status.matches[0].productName}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`integration-badge integration-badge--missing ${compact ? 'integration-badge--compact' : ''}`}>
      <span className="integration-badge__icon" aria-hidden="true">⚠</span>
      <span>Not in inventory</span>
    </div>
  );
}
