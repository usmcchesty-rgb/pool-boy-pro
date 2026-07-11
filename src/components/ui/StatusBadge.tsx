import type { ReadingStatus } from '../../models/types';
import { statusLabel } from '../../utilities/format';

interface StatusBadgeProps {
  status: ReadingStatus | 'mixed';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const label = status === 'mixed' ? 'Mixed' : statusLabel(status);
  return (
    <span className={`badge badge--${status} badge--${size}`} role="status">
      {label}
    </span>
  );
}
