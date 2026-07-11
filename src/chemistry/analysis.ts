import type { OverallRating, ParameterAnalysis, ParameterLevel, PoolInfo, WaterReadings } from '../models/types';
import type { AnalysisParameterKey, PoolAnalysisContext } from './ranges';
import {
  getParameterThresholds,
  getDosingTargets,
  PARAMETER_WEIGHTS,
} from './ranges';
import { resolveProfileFromPool } from './poolProfiles';
import {
  classifyParameterLevel,
  getPriorityForLevel,
  isLevelHigh,
  isLevelLow,
  levelScoreMultiplier,
  levelToReadingStatus,
} from './classification';
import { toFahrenheit } from '../utilities/units';

interface ParameterContent {
  whyItMatters: string;
  possibleCauses: string[];
  possibleEffects: string[];
  suggestedCorrection: string;
}

function buildParameterAnalysis(
  parameter: AnalysisParameterKey,
  label: string,
  value: number,
  unit: string,
  context: PoolAnalysisContext,
  contentFn: (level: ParameterLevel) => ParameterContent
): ParameterAnalysis {
  const thresholds = getParameterThresholds(parameter, context);
  const level = classifyParameterLevel(value, thresholds);
  const content = contentFn(level);

  return {
    parameter,
    label,
    value,
    unit,
    level,
    status: levelToReadingStatus(level),
    priority: getPriorityForLevel(level),
    idealMin: thresholds.idealMin,
    idealMax: thresholds.idealMax,
    ...content,
  };
}

function fcContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Free chlorine is the active sanitizer that kills bacteria and algae. FAS-DPD measures true free chlorine without interference from combined chlorine.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Proper chlorination maintained'],
      possibleEffects: ['Effective sanitation and clear water'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Heavy bather load', 'High UV exposure', 'Insufficient chlorinator output', 'Recent rain dilution'],
      possibleEffects:
        level === 'critical_low'
          ? ['Unsafe swimming conditions', 'Rapid algae growth', 'Cloudy water']
          : ['Reduced sanitizer reserve', 'Risk of algae if trend continues'],
      suggestedCorrection:
        level === 'critical_low'
          ? 'Add liquid chlorine immediately and verify pump run time. Retest within 4 hours.'
          : 'Raise free chlorine with liquid chlorine or increase salt cell output.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Over-chlorination', 'Excessive shock treatment', 'Chlorinator set too high'],
    possibleEffects:
      level === 'critical_high'
        ? ['Strong chlorine odor', 'Skin and eye irritation', 'Bleached swimwear']
        : ['Mild irritation possible', 'Accelerated chlorine loss to sunlight'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Stop adding chlorine. Allow natural dissipation and retest before swimming.'
        : 'Allow chlorine to dissipate naturally or partially drain and refill.',
  };
}

function ccContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Combined chlorine (chloramines) forms when free chlorine binds to contaminants. Elevated levels reduce sanitizer effectiveness and cause odor.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Effective breakpoint chlorination maintained'],
      possibleEffects: ['Efficient sanitation without chloramine buildup'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Organic contamination', 'Insufficient free chlorine', 'Heavy bather load', 'Stale water'],
    possibleEffects:
      level === 'critical_high'
        ? ['Strong chlorine smell', 'Eye irritation', 'Persistent sanitizer demand']
        : ['Noticeable odor', 'Reduced chlorine efficiency'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Perform breakpoint shock immediately (FC = CC × 10, minimum 10 ppm). Do not swim until FC drops below 5 ppm.'
        : 'Shock the pool to breakpoint chlorination (FC = CC × 10 or minimum 10 ppm).',
  };
}

function phContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'pH affects sanitizer effectiveness, swimmer comfort, and equipment longevity. Phenol red provides an accurate pool pH reading.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Balanced chemistry maintained'],
      possibleEffects: ['Optimal sanitizer performance and swimmer comfort'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Acid rain', 'Trichlor tablets', 'Organic matter decomposition', 'CO₂ from aeration'],
      possibleEffects:
        level === 'critical_low'
          ? ['Aggressive corrosion', 'Etching of plaster', 'Severe eye irritation']
          : ['Corrosion risk', 'Reduced chlorine effectiveness'],
      suggestedCorrection:
        level === 'critical_low'
          ? 'Add soda ash promptly and retest within 4 hours. Check alkalinity as well.'
          : 'Add soda ash to raise pH, or aerate if caused by CO₂.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Liquid chlorine additions', 'High alkalinity', 'Soda ash or borax additions'],
    possibleEffects:
      level === 'critical_high'
        ? ['Scale formation on surfaces and heater', 'Cloudy water', 'Reduced chlorine effectiveness']
        : ['Mild scale risk', 'Slightly reduced chlorine efficiency'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Add muriatic acid in the deep end with pump running. Retest in 4–6 hours.'
        : 'Add muriatic acid or dry acid to lower pH.',
  };
}

function taContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Total alkalinity buffers pH against rapid changes and is the foundation of balanced water chemistry.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Stable water balance'],
      possibleEffects: ['Stable pH maintenance'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Acid additions', 'Rain dilution', 'Trichlor use over time'],
      possibleEffects:
        level === 'critical_low'
          ? ['Severe pH bounce', 'Etching of plaster', 'Corrosion of metal fixtures']
          : ['pH drift and instability', 'Corrosion risk'],
      suggestedCorrection:
        level === 'critical_low'
          ? 'Add baking soda in stages and retest alkalinity and pH after 6 hours.'
          : 'Add baking soda to raise alkalinity.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Soda ash additions', 'High pH over time', 'Fill water with high alkalinity'],
    possibleEffects:
      level === 'critical_high'
        ? ['Persistent high pH', 'Cloudy water', 'Scale formation']
        : ['Gradual pH drift upward'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Lower with muriatic acid using the acid demand method. Aerate while treating.'
        : 'Lower with muriatic acid or partial drain and refill.',
  };
}

function chContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Calcium hardness protects plaster and equipment. Low levels cause etching; high levels cause scale.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Balanced calcium levels'],
      possibleEffects: ['Protected surfaces and equipment'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Soft fill water', 'Rain dilution', 'Low calcium source water'],
      possibleEffects:
        level === 'critical_low'
          ? ['Aggressive etching of plaster', 'Pitting and staining']
          : ['Gradual surface wear', 'Metal corrosion'],
      suggestedCorrection: 'Add calcium chloride to raise hardness.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Hard fill water', 'Calcium-based products', 'Evaporation concentrating minerals'],
    possibleEffects:
      level === 'critical_high'
        ? ['Heavy scale on heater and tile', 'Rough surfaces', 'Cloudy water']
        : ['Early scale formation possible'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Partial drain and refill with softer water. Consider a sequestrant.'
        : 'Partial drain and refill with softer water, or use a sequestrant.',
  };
}

function cyaContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Cyanuric acid (stabilizer) protects chlorine from UV degradation. Excess CYA reduces chlorine effectiveness.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Proper UV protection for chlorine'],
      possibleEffects: ['Protected chlorine levels outdoors'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['No stabilizer added', 'Heavy rain dilution', 'Partial drain'],
      possibleEffects:
        level === 'critical_low'
          ? ['Very rapid chlorine loss in sunlight', 'High chemical consumption']
          : ['Accelerated chlorine loss outdoors'],
      suggestedCorrection: 'Add cyanuric acid stabilizer.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Trichlor tablet use', 'Excess stabilizer added', 'Evaporation concentrating CYA'],
    possibleEffects:
      level === 'critical_high'
        ? ['Chlorine lock effect', 'Algae despite adequate FC reading', 'Need much higher FC targets']
        : ['Reduced chlorine efficiency'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Partial drain and refill to dilute CYA. Adjust FC targets accordingly.'
        : 'Partial drain and refill to dilute CYA.',
  };
}

function saltContent(level: ParameterLevel, context: PoolAnalysisContext): ParameterContent {
  if (context.profile.sanitizer !== 'salt') {
    return {
      whyItMatters: 'Salt level is informational for non-salt pools.',
      possibleCauses: ['Not applicable for non-salt pools'],
      possibleEffects: ['No impact on traditional chlorination'],
      suggestedCorrection: 'Not applicable — pool uses traditional chlorine.',
    };
  }
  const base = {
    whyItMatters:
      'Salt level determines salt cell chlorine production efficiency. The K-2006-SALT kit provides precise measurement.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Optimal salt cell operation'],
      possibleEffects: ['Efficient chlorine generation'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Rain dilution', 'Partial drain', 'Insufficient salt added after fill'],
      possibleEffects:
        level === 'critical_low'
          ? ['Salt cell shutdown or error', 'Insufficient sanitation from SWG']
          : ['Reduced chlorine production', 'Salt cell warning lights'],
      suggestedCorrection: `Add pool-grade salt to reach ${Math.round(getDosingTargets(context.profile).salt)} ppm target.`,
    };
  }
  return {
    ...base,
    possibleCauses: ['Excess salt added', 'Evaporation concentrating salt'],
    possibleEffects:
      level === 'critical_high'
        ? ['Corrosion risk to fixtures', 'Salt cell strain', 'Unpleasant taste and feel']
        : ['Mild corrosion risk over time'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Partial drain and refill to dilute salt level.'
        : 'Partial drain and refill to dilute salt level.',
  };
}

function tempContent(level: ParameterLevel): ParameterContent {
  const base = {
    whyItMatters:
      'Temperature affects chlorine demand, algae growth rate, and swimmer comfort. Higher temps increase sanitizer consumption.',
  };
  if (level === 'ideal') {
    return {
      ...base,
      possibleCauses: ['Comfortable swimming range'],
      possibleEffects: ['Balanced sanitizer demand'],
      suggestedCorrection: 'No adjustment needed.',
    };
  }
  if (isLevelLow(level)) {
    return {
      ...base,
      possibleCauses: ['Cool weather', 'Shaded pool', 'Evening test time'],
      possibleEffects: ['Reduced algae growth', 'Chlorine lasts longer', 'Cold for some swimmers'],
      suggestedCorrection: 'Monitor chlorine less frequently in cool conditions.',
    };
  }
  return {
    ...base,
    possibleCauses: ['Hot weather', 'Full sun exposure', 'Heater running'],
    possibleEffects:
      level === 'critical_high'
        ? ['Very high chlorine demand', 'Algae blooms more likely', 'Bather discomfort']
        : ['Increased chlorine demand', 'Algae risk elevated'],
    suggestedCorrection:
      level === 'critical_high'
        ? 'Increase free chlorine target, ensure continuous circulation, and test daily.'
        : 'Increase free chlorine target slightly and ensure adequate circulation.',
  };
}

/** Analyze all water parameters independently against configurable thresholds */
export function analyzeWater(readings: WaterReadings, pool: PoolInfo): ParameterAnalysis[] {
  const context: PoolAnalysisContext = {
    profile: resolveProfileFromPool(pool),
  };
  const tempF = toFahrenheit(readings.temperature, readings.temperatureUnit);

  return [
    buildParameterAnalysis('freeChlorine', 'Free Chlorine', readings.freeChlorine, 'ppm', context, fcContent),
    buildParameterAnalysis('combinedChlorine', 'Combined Chlorine', readings.combinedChlorine, 'ppm', context, ccContent),
    buildParameterAnalysis('ph', 'pH', readings.ph, '', context, phContent),
    buildParameterAnalysis('totalAlkalinity', 'Total Alkalinity', readings.totalAlkalinity, 'ppm', context, taContent),
    buildParameterAnalysis('calciumHardness', 'Calcium Hardness', readings.calciumHardness, 'ppm', context, chContent),
    buildParameterAnalysis('cyanuricAcid', 'Cyanuric Acid', readings.cyanuricAcid, 'ppm', context, cyaContent),
    buildParameterAnalysis('salt', 'Salt', readings.salt, 'ppm', context, (level) => saltContent(level, context)),
    buildParameterAnalysis('temperature', 'Water Temperature', tempF, '°F', context, tempContent),
  ];
}

/** Calculate Water Health Score (0–100) from weighted parameter bands */
export function calculateOverallScore(parameters: ParameterAnalysis[]): number {
  if (parameters.length === 0) return 0;

  let totalWeight = 0;
  let score = 0;

  for (const p of parameters) {
    const w = PARAMETER_WEIGHTS[p.parameter as AnalysisParameterKey] ?? 5;
    totalWeight += w;
    score += w * levelScoreMultiplier(p.level);
  }

  return Math.round((score / totalWeight) * 100);
}

/** Derive overall rating label from score and critical parameters */
export function getOverallRating(score: number, parameters: ParameterAnalysis[]): OverallRating {
  const hasCritical = parameters.some(
    (p) => p.level === 'critical_low' || p.level === 'critical_high'
  );
  const hasHighPriority = parameters.some((p) => p.priority === 'high');

  let rating: OverallRating;
  if (score >= 90) rating = 'excellent';
  else if (score >= 75) rating = 'good';
  else if (score >= 60) rating = 'fair';
  else if (score >= 40) rating = 'poor';
  else rating = 'critical';

  if (hasCritical && (rating === 'excellent' || rating === 'good')) {
    rating = 'fair';
  }
  if (hasCritical && score < 50) {
    rating = 'critical';
  }
  if (hasHighPriority && rating === 'excellent' && score < 95) {
    rating = 'good';
  }

  return rating;
}

export function getOverallStatus(
  score: number,
  parameters: ParameterAnalysis[]
): 'ideal' | 'too_low' | 'too_high' | 'mixed' {
  const issues = parameters.filter((p) => p.level !== 'ideal');
  if (issues.length === 0) return 'ideal';
  if (score >= 85 && !issues.some((p) => p.level === 'critical_low' || p.level === 'critical_high')) {
    return 'ideal';
  }
  const lows = issues.filter((p) => isLevelLow(p.level)).length;
  const highs = issues.filter((p) => isLevelHigh(p.level)).length;
  if (lows > 0 && highs > 0) return 'mixed';
  if (lows >= highs) return 'too_low';
  return 'too_high';
}

const RATING_LABELS: Record<OverallRating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  critical: 'Critical',
};

export function ratingLabel(rating: OverallRating): string {
  return RATING_LABELS[rating];
}

/** Professional overall water summary */
export function buildSummary(
  score: number,
  rating: OverallRating,
  parameters: ParameterAnalysis[]
): string {
  const issues = parameters.filter((p) => p.level !== 'ideal');
  const critical = issues.filter((p) => p.level === 'critical_low' || p.level === 'critical_high');
  const label = ratingLabel(rating);

  if (issues.length === 0) {
    return `Water health score ${score}/100 — ${label}. All parameters are within ideal ranges. Your pool is well balanced and ready for use.`;
  }

  if (critical.length > 0) {
    const names = critical.map((p) => p.label).join(', ');
    return `Water health score ${score}/100 — ${label}. Critical attention required for ${names}. Address high-priority items before swimming.`;
  }

  const names = issues.map((p) => p.label).join(', ');
  return `Water health score ${score}/100 — ${label}. Adjustments recommended for ${names}. Follow prioritized recommendations below.`;
}
