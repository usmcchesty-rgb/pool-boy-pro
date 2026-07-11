import type {
  DosingRecommendation,
  ParameterAnalysis,
  ParameterLevel,
  PriorityLevel,
  WaterAnalysisResult,
} from '../models/types';

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Resolve five-band level for display, including legacy stored tests */
export function resolveParameterLevel(param: ParameterAnalysis): ParameterLevel {
  if (param.level) return param.level;
  if (param.status === 'ideal') return 'ideal';
  return param.status === 'too_low' ? 'low' : 'high';
}

export function isIssueParameter(param: ParameterAnalysis): boolean {
  return resolveParameterLevel(param) !== 'ideal';
}

/** Top non-ideal parameters by correction priority */
export function getTopIssues(parameters: ParameterAnalysis[], limit = 3): ParameterAnalysis[] {
  return parameters
    .filter(isIssueParameter)
    .sort((a, b) => {
      const priorityDiff =
        PRIORITY_WEIGHT[b.priority ?? 'medium'] - PRIORITY_WEIGHT[a.priority ?? 'medium'];
      if (priorityDiff !== 0) return priorityDiff;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

/** Highest-priority recommendation (analysis engine already sorts by urgency) */
export function getTopRecommendation(
  recommendations: DosingRecommendation[]
): DosingRecommendation | null {
  return recommendations[0] ?? null;
}

export function getDashboardHealthData(analysis: WaterAnalysisResult) {
  return {
    issues: getTopIssues(analysis.parameters),
    topRecommendation: getTopRecommendation(analysis.recommendations),
  };
}
