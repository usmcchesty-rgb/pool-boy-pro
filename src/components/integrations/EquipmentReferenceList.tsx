import type { RecommendationEquipmentRef } from '../../integrations/systemIntegration';
import { Link } from 'react-router-dom';

interface EquipmentReferenceListProps {
  refs: RecommendationEquipmentRef[];
  compact?: boolean;
}

export function EquipmentReferenceList({ refs, compact }: EquipmentReferenceListProps) {
  if (refs.length === 0) return null;

  return (
    <ul className={`integration-equipment ${compact ? 'integration-equipment--compact' : ''}`}>
      {refs.map((ref) => (
        <li key={ref.equipment.id}>
          <Link to={`/equipment/${ref.equipment.id}`} className="integration-equipment__link">
            {ref.role === 'pump' ? `Run "${ref.label}"` : ref.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
