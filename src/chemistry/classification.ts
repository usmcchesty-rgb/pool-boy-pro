import type { ParameterLevel, PriorityLevel, ReadingStatus } from '../models/types';

/** Classify a numeric reading into one of five bands */
export function classifyParameterLevel(value: number, thresholds: {
  criticalLowMax: number;
  idealMin: number;
  idealMax: number;
  criticalHighMin: number;
}): ParameterLevel {
  if (value <= thresholds.criticalLowMax) return 'critical_low';
  if (value < thresholds.idealMin) return 'low';
  if (value <= thresholds.idealMax) return 'ideal';
  if (value < thresholds.criticalHighMin) return 'high';
  return 'critical_high';
}

/** Map five-band level to legacy three-band status for existing UI */
export function levelToReadingStatus(level: ParameterLevel): ReadingStatus {
  if (level === 'ideal') return 'ideal';
  if (level === 'low' || level === 'critical_low') return 'too_low';
  return 'too_high';
}

/** Priority for corrections based on severity band */
export function getPriorityForLevel(level: ParameterLevel): PriorityLevel {
  switch (level) {
    case 'critical_low':
    case 'critical_high':
      return 'high';
    case 'low':
    case 'high':
      return 'medium';
    case 'ideal':
      return 'low';
  }
}

export function isLevelLow(level: ParameterLevel): boolean {
  return level === 'low' || level === 'critical_low';
}

export function isLevelHigh(level: ParameterLevel): boolean {
  return level === 'high' || level === 'critical_high';
}

export function needsCorrection(level: ParameterLevel): boolean {
  return level !== 'ideal';
}

/** Score multiplier per band for weighted health score */
export function levelScoreMultiplier(level: ParameterLevel): number {
  switch (level) {
    case 'ideal':
      return 1;
    case 'low':
    case 'high':
      return 0.65;
    case 'critical_low':
    case 'critical_high':
      return 0.2;
  }
}

export function levelLabel(level: ParameterLevel): string {
  const labels: Record<ParameterLevel, string> = {
    critical_low: 'Critical Low',
    low: 'Low',
    ideal: 'Ideal',
    high: 'High',
    critical_high: 'Critical High',
  };
  return labels[level];
}

export function priorityLabel(priority: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return labels[priority];
}
