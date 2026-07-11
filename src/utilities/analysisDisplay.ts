import type { ParameterAnalysis } from '../models/types';
import { resolveParameterLevel } from './dashboardAnalysis';

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

function compareByPriority(a: ParameterAnalysis, b: ParameterAnalysis): number {
  const priorityDiff =
    PRIORITY_WEIGHT[b.priority ?? 'medium'] - PRIORITY_WEIGHT[a.priority ?? 'medium'];
  if (priorityDiff !== 0) return priorityDiff;
  return a.label.localeCompare(b.label);
}

/** Split and sort parameters for the analysis detail view */
export function sortParametersForDetail(parameters: ParameterAnalysis[]): {
  issues: ParameterAnalysis[];
  ideal: ParameterAnalysis[];
} {
  const issues = parameters.filter((p) => resolveParameterLevel(p) !== 'ideal').sort(compareByPriority);
  const ideal = parameters
    .filter((p) => resolveParameterLevel(p) === 'ideal')
    .sort((a, b) => a.label.localeCompare(b.label));
  return { issues, ideal };
}
