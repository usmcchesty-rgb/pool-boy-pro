import { useMemo, useState } from 'react';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InventoryCard } from '../components/inventory/InventoryCard';
import { InventoryStatusSummary } from '../components/inventory/InventoryStatusSummary';
import { PageHeader } from '../components/layout/PageHeader';
import { partitionInventoryItems } from '../models/inventory';
import { getInventorySummaryCounts } from '../integrations/systemIntegration';

export function InventoryPage() {
  const { chemicalInventory } = useApp();
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(
    () => (showInactive ? chemicalInventory : chemicalInventory.filter((i) => i.active)),
    [chemicalInventory, showInactive]
  );

  const { expired, nearExpired, lowQuantity, other } = useMemo(
    () => partitionInventoryItems(visible),
    [visible]
  );

  const inactiveCount = chemicalInventory.filter((i) => !i.active).length;
  const alertCount = expired.length + nearExpired.length + lowQuantity.length;
  const statusCounts = useMemo(
    () => getInventorySummaryCounts(chemicalInventory),
    [chemicalInventory]
  );

  function renderSection(title: string, items: typeof visible, className?: string) {
    if (items.length === 0) return null;
    return (
      <section className={`inventory-section ${className ?? ''}`}>
        <h2 className="inventory-section__title">{title}</h2>
        <ul className="inventory-list">
          {items.map((item) => (
            <li key={item.id}>
              <InventoryCard item={item} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="page inventory">
      <PageHeader
        title="Inventory"
        subtitle="Track pool chemicals you have on hand"
        actions={
          <NavButton to="/inventory/new">+ Add Item</NavButton>
        }
      />

      <Card className="inventory-toolbar">
        <InventoryStatusSummary counts={statusCounts} />
        <div className="inventory-toolbar__row">
          <p className="inventory-toolbar__count">
            {visible.length} item{visible.length !== 1 ? 's' : ''}
            {alertCount > 0 && ` · ${alertCount} need attention`}
            {inactiveCount > 0 && !showInactive && ` · ${inactiveCount} inactive hidden`}
          </p>
          {inactiveCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInactive((v) => !v)}
            >
              {showInactive ? 'Hide inactive' : 'Show inactive'}
            </Button>
          )}
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="⊞"
            title={chemicalInventory.length === 0 ? 'No inventory yet' : 'No active inventory'}
            description={
              chemicalInventory.length === 0
                ? 'Track chlorine, acid, salt, and other chemicals you have on hand.'
                : 'Show inactive items or add a new chemical.'
            }
            action={
              <NavButton to="/inventory/new" variant="secondary">Add Item</NavButton>
            }
          />
        </Card>
      ) : (
        <>
          {renderSection('Expired', expired, 'inventory-section--expired')}
          {renderSection('Expiring Soon', nearExpired, 'inventory-section--near-expired')}
          {renderSection('Low Quantity', lowQuantity, 'inventory-section--low')}
          {renderSection('All Items', other)}
        </>
      )}
    </div>
  );
}
