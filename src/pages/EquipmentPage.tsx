import { useMemo, useState } from 'react';
import { NavButton } from '../components/ui/NavButton';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { EquipmentCard } from '../components/equipment/EquipmentCard';
import { PageHeader } from '../components/layout/PageHeader';

export function EquipmentPage() {
  const { equipment } = useApp();
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(
    () => (showInactive ? equipment : equipment.filter((e) => e.active)),
    [equipment, showInactive]
  );

  const inactiveCount = equipment.filter((e) => !e.active).length;

  return (
    <div className="page equipment">
      <PageHeader
        title="Equipment"
        subtitle="Track pool equipment and basic maintenance info"
        actions={
          <NavButton to="/equipment/new">+ Add Equipment</NavButton>
        }
      />

      <Card className="equipment-toolbar">
        <div className="equipment-toolbar__row">
          <p className="equipment-toolbar__count">
            {visible.length} item{visible.length !== 1 ? 's' : ''}
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
            icon="⛭"
            title={equipment.length === 0 ? 'No equipment yet' : 'No active equipment'}
            description={
              equipment.length === 0
                ? 'Track pumps, filters, heaters, and other pool equipment.'
                : 'Show inactive items or add new equipment.'
            }
            action={
              <NavButton to="/equipment/new" variant="secondary">Add Equipment</NavButton>
            }
          />
        </Card>
      ) : (
        <ul className="equipment-list">
          {visible.map((item) => (
            <li key={item.id}>
              <EquipmentCard equipment={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
