import type { StripAccuracyLevel } from '../../models/types';

interface StripAccuracyBadgeProps {
  level: StripAccuracyLevel | 'high';
  compact?: boolean;
}

export function StripAccuracyBadge({ level, compact }: StripAccuracyBadgeProps) {
  const label = level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low';
  return (
    <span
      className={`strip-accuracy-badge strip-accuracy-badge--${level}${compact ? ' strip-accuracy-badge--compact' : ''}`}
    >
      {compact ? label : `Estimated Accuracy: ${label}`}
    </span>
  );
}

interface TestSourceBadgeProps {
  label: string;
  accuracyLabel?: string;
  compact?: boolean;
}

export function TestSourceBadge({ label, accuracyLabel, compact }: TestSourceBadgeProps) {
  return (
    <span className={`test-source-badge${compact ? ' test-source-badge--compact' : ''}`}>
      <span className="test-source-badge__source">{label}</span>
      {accuracyLabel && (
        <span className="test-source-badge__accuracy">{accuracyLabel}</span>
      )}
    </span>
  );
}
