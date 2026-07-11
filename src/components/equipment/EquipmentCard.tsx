import { Link } from 'react-router-dom';
import type { PoolEquipment } from '../../models/types';
import {
  getEquipmentTypeLabel,
  isWarrantyExpired,
} from '../../models/equipment';
import { formatDate } from '../../utilities/format';

interface EquipmentCardProps {
  equipment: PoolEquipment;
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const warrantyExpired = isWarrantyExpired(equipment);

  return (
    <Link to={`/equipment/${equipment.id}`} className="equipment-card">
      <div className="equipment-card__header">
        <span className="equipment-card__type">{getEquipmentTypeLabel(equipment.type)}</span>
        {!equipment.active && (
          <span className="equipment-card__badge equipment-card__badge--inactive">Inactive</span>
        )}
        {equipment.warrantyExpiration && warrantyExpired && (
          <span className="equipment-card__badge equipment-card__badge--warn">Warranty expired</span>
        )}
      </div>
      <h2 className="equipment-card__name">{equipment.name}</h2>
      {(equipment.manufacturer || equipment.model) && (
        <p className="equipment-card__model">
          {[equipment.manufacturer, equipment.model].filter(Boolean).join(' · ')}
        </p>
      )}
      <dl className="equipment-card__meta">
        {equipment.installDate && (
          <div>
            <dt>Installed</dt>
            <dd>{formatDate(equipment.installDate)}</dd>
          </div>
        )}
        {equipment.warrantyExpiration && (
          <div>
            <dt>Warranty</dt>
            <dd>{formatDate(equipment.warrantyExpiration)}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
