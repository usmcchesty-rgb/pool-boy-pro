import { Link } from 'react-router-dom';
import type { ChemicalInventoryItem } from '../../models/types';
import { formatQuantity, getChemicalTypeLabel } from '../../models/inventory';
import { getInventoryItemDisplayStatus } from '../../integrations/systemIntegration';
import { formatDate } from '../../utilities/format';
import { INVENTORY_DISPLAY_STATUS_LABELS } from '../../constants/statusLabels';

interface InventoryCardProps {
  item: ChemicalInventoryItem;
}

export function InventoryCard({ item }: InventoryCardProps) {
  const status = getInventoryItemDisplayStatus(item);
  const quantityLabel = formatQuantity(item.quantityRemaining, item.quantityUnit);

  return (
    <Link to={`/inventory/${item.id}`} className={`inventory-card inventory-card--${status}`}>
      <div className="inventory-card__header">
        <span className="inventory-card__type">{getChemicalTypeLabel(item.chemicalType)}</span>
        <span className={`inventory-card__badge inventory-card__badge--${status}`}>
          {INVENTORY_DISPLAY_STATUS_LABELS[status]}
        </span>
      </div>
      <h2 className="inventory-card__name">{item.productName}</h2>
      {item.concentration && (
        <p className="inventory-card__concentration">{item.concentration}</p>
      )}
      <dl className="inventory-card__meta">
        {quantityLabel && (
          <div>
            <dt>Remaining</dt>
            <dd>{quantityLabel}</dd>
          </div>
        )}
        {item.expirationDate && (
          <div>
            <dt>Expires</dt>
            <dd>{formatDate(item.expirationDate)}</dd>
          </div>
        )}
        {item.cost != null && (
          <div>
            <dt>Cost</dt>
            <dd>${item.cost.toFixed(2)}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
