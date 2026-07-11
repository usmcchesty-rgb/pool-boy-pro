import { Link } from 'react-router-dom';
import type { MaintenanceTask } from '../../models/types';
import {
  getMaintenanceCategoryLabel,
  getMaintenanceDueStatus,
  getMaintenanceFrequencyLabel,
} from '../../models/maintenance';
import { formatDate } from '../../utilities/format';
import { Button } from '../ui/Button';
import { MAINTENANCE_DUE_STATUS_LABELS } from '../../constants/statusLabels';

interface MaintenanceCardProps {
  task: MaintenanceTask;
  equipmentName?: string;
  onComplete?: (id: string) => void;
  completing?: boolean;
}

export function MaintenanceCard({
  task,
  equipmentName,
  onComplete,
  completing,
}: MaintenanceCardProps) {
  const status = getMaintenanceDueStatus(task);

  return (
    <article className={`maintenance-card maintenance-card--${status}`}>
      <div className="maintenance-card__header">
        <span className="maintenance-card__category">
          {getMaintenanceCategoryLabel(task.category)}
        </span>
        <span className={`maintenance-card__badge maintenance-card__badge--${status}`}>
          {MAINTENANCE_DUE_STATUS_LABELS[status]}
        </span>
      </div>

      <Link to={`/maintenance/${task.id}`} className="maintenance-card__link">
        <h2 className="maintenance-card__title">{task.title}</h2>
        <p className="maintenance-card__frequency">
          {getMaintenanceFrequencyLabel(task.frequency)}
          {equipmentName ? ` · ${equipmentName}` : ''}
        </p>
        <dl className="maintenance-card__meta">
          {task.dueDate && (
            <div>
              <dt>Due</dt>
              <dd>{formatDate(task.dueDate)}</dd>
            </div>
          )}
          {task.lastCompletedDate && (
            <div>
              <dt>Last done</dt>
              <dd>{formatDate(task.lastCompletedDate)}</dd>
            </div>
          )}
        </dl>
      </Link>

      {task.active && onComplete && (
        <div className="maintenance-card__actions">
          <Button
            size="sm"
            onClick={() => onComplete(task.id)}
            disabled={completing}
          >
            {completing ? 'Completing…' : 'Complete'}
          </Button>
        </div>
      )}
    </article>
  );
}
