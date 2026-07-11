import { Link } from 'react-router-dom';
import { NavButton } from '../ui/NavButton';
import type { ChemicalInventoryItem, MaintenanceTask, PoolEquipment } from '../../models/types';
import { INVENTORY_DISPLAY_STATUS_LABELS } from '../../constants/statusLabels';
import {
  getDashboardIntegrationSummary,
  getInventoryAlertPreview,
  getInventoryItemDisplayStatus,
  getMaintenanceAttentionLabel,
  getUpcomingMaintenancePreview,
} from '../../integrations/systemIntegration';
import { formatDate } from '../../utilities/format';
import { Card } from '../ui/Card';

interface DashboardIntegrationCardsProps {
  equipment: PoolEquipment[];
  maintenanceTasks: MaintenanceTask[];
  chemicalInventory: ChemicalInventoryItem[];
  recommendationCount: number;
}

const INVENTORY_STATUS_LABELS: Record<string, string> = {
  ...INVENTORY_DISPLAY_STATUS_LABELS,
  near_expired: 'Expiring soon',
  low: 'Low quantity',
};

export function DashboardIntegrationCards({
  equipment,
  maintenanceTasks,
  chemicalInventory,
  recommendationCount,
}: DashboardIntegrationCardsProps) {
  const summary = getDashboardIntegrationSummary(
    equipment,
    maintenanceTasks,
    chemicalInventory,
    recommendationCount
  );
  const upcoming = getUpcomingMaintenancePreview(maintenanceTasks);
  const inventoryAlerts = getInventoryAlertPreview(chemicalInventory);
  const { overdue, dueSoon } = summary.upcomingMaintenance;
  const maintenanceAlertCount = overdue.length + dueSoon.length;

  return (
    <>
      <Card
        title="Upcoming Maintenance"
        action={
          <NavButton to="/maintenance" variant="ghost" size="sm">View All</NavButton>
        }
      >
        {upcoming.length === 0 ? (
          <p className="dashboard-integration__empty">No active maintenance tasks scheduled.</p>
        ) : (
          <ul className="dashboard-integration__list">
            {upcoming.map((task) => (
              <li key={task.id}>
                <Link to={`/maintenance/${task.id}`} className="dashboard-integration__link">
                  <span className="dashboard-integration__primary">{task.title}</span>
                  <span className="dashboard-integration__meta">
                    {getMaintenanceAttentionLabel(task)}
                    {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {maintenanceAlertCount > 0 && (
          <p className="dashboard-integration__note">
            {maintenanceAlertCount} task{maintenanceAlertCount !== 1 ? 's' : ''} overdue or due soon
          </p>
        )}
      </Card>

      <Card
        title="Equipment Attention"
        action={
          <NavButton to="/equipment" variant="ghost" size="sm">View All</NavButton>
        }
      >
        {summary.equipmentAttention.length === 0 ? (
          <p className="dashboard-integration__empty">No equipment warranty alerts.</p>
        ) : (
          <ul className="dashboard-integration__list">
            {summary.equipmentAttention.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link to={`/equipment/${item.id}`} className="dashboard-integration__link">
                  <span className="dashboard-integration__primary">{item.name}</span>
                  <span className="dashboard-integration__meta">Warranty expired</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Inventory Alerts"
        action={
          <NavButton to="/inventory" variant="ghost" size="sm">View All</NavButton>
        }
      >
        <div className="dashboard-integration__stats">
          <span>Available {summary.inventoryCounts.available}</span>
          <span>Low {summary.inventoryCounts.low}</span>
          <span>Expired {summary.inventoryCounts.expired}</span>
          <span>Expiring {summary.inventoryCounts.nearExpired}</span>
        </div>
        {inventoryAlerts.length === 0 ? (
          <p className="dashboard-integration__empty">No inventory alerts right now.</p>
        ) : (
          <ul className="dashboard-integration__list">
            {inventoryAlerts.map((item) => (
              <li key={item.id}>
                <Link to={`/inventory/${item.id}`} className="dashboard-integration__link">
                  <span className="dashboard-integration__primary">{item.productName}</span>
                  <span className="dashboard-integration__meta">
                    {INVENTORY_STATUS_LABELS[getInventoryItemDisplayStatus(item)]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
