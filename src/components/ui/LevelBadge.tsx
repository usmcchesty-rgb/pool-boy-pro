import type { ParameterLevel } from '../../models/types';
import { formatLevel } from '../../utilities/format';

interface LevelBadgeProps {
  level: ParameterLevel;
  size?: 'sm' | 'md';
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  return (
    <span className={`badge badge--level badge--${level} badge--${size}`} role="status">
      {formatLevel(level)}
    </span>
  );
}
