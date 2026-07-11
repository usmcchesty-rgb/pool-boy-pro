import { useNavigate } from 'react-router-dom';
import type { MaintenanceSuggestion } from '../../integrations/systemIntegration';
import { Button } from '../ui/Button';

interface CreateMaintenanceButtonProps {
  suggestion: MaintenanceSuggestion;
  compact?: boolean;
}

export function CreateMaintenanceButton({ suggestion, compact }: CreateMaintenanceButtonProps) {
  const navigate = useNavigate();

  return (
    <div className={`integration-maintenance ${compact ? 'integration-maintenance--compact' : ''}`}>
      <Button
        variant="secondary"
        size={compact ? 'sm' : undefined}
        onClick={() =>
          navigate('/maintenance/new', {
            state: { prefilled: suggestion.input, source: suggestion.sourceLabel },
          })
        }
      >
        Create Maintenance Task
      </Button>
    </div>
  );
}
