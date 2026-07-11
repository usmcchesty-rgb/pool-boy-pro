import type {
  ChemicalStrengths,
  DosingRecommendation,
  ParameterAnalysis,
  PoolInfo,
  PriorityLevel,
  TreatmentCategory,
  WaterAnalysisResult,
  WaterReadings,
} from '../models/types';
import {
  analyzeWater,
  buildSummary,
  calculateOverallScore,
  getOverallRating,
  getOverallStatus,
} from './analysis';
import { isLevelHigh, isLevelLow } from './classification';
import {
  calcBakingSoda,
  calcCalciumChloride,
  calcCyanuricAcid,
  calcDryAcid,
  calcHouseholdBleach,
  calcLiquidChlorine,
  calcMuriaticAcidPh,
  calcMuriaticAcidTa,
  calcSalt,
  calcSodaAsh,
  type ChemicalDose,
} from './calculator';
import { analyzeWaterBalance, applyWaterBalanceToScore } from './csi';
import { resolveProfileFromPool } from './poolProfiles';
import { RECOMMENDATION_PRIORITY, getDosingTargets } from './ranges';
import {
  applySafetyAndSequencing,
  buildTreatmentPlan,
  inferTreatmentCategory,
} from './treatmentPlan';
import { toGallons } from '../utilities/units';

interface TreatmentCandidate {
  priorityScore: number;
  treatmentPriority: PriorityLevel;
  category: TreatmentCategory;
  dose: ChemicalDose;
  reason: string;
  expectedResult: string;
  waitTime: string;
  pumpRuntime: string;
  retestNote: string;
  warnings?: string[];
}

function priorityFromScore(score: number): PriorityLevel {
  if (score >= 85) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function addCandidate(candidates: TreatmentCandidate[], candidate: TreatmentCandidate): void {
  candidates.push(candidate);
}

function candidateToRecommendation(c: TreatmentCandidate, order: number): DosingRecommendation {
  return {
    order,
    chemical: c.dose.chemical,
    amount: c.dose.displayAmount,
    unit: c.dose.unit,
    reason: c.reason,
    expectedResult: c.expectedResult,
    priority: c.treatmentPriority,
    pumpRuntime: c.pumpRuntime,
    waitTime: c.waitTime,
    retestNote: c.retestNote,
    warnings: c.warnings,
    category: c.category,
  };
}

/** Generate dosing recommendations sorted by urgency, not parameter order */
export function generateRecommendations(
  readings: WaterReadings,
  pool: PoolInfo,
  parameters: ParameterAnalysis[],
  strengths: ChemicalStrengths
): DosingRecommendation[] {
  const gallons = toGallons(pool.volume, pool.volumeUnit);
  const targets = getDosingTargets(pool);
  const candidates: TreatmentCandidate[] = [];
  const paramMap = Object.fromEntries(parameters.map((p) => [p.parameter, p]));

  const ccLevel = paramMap.combinedChlorine?.level;
  if (ccLevel && ccLevel !== 'ideal') {
    const shockTarget = Math.max(readings.combinedChlorine * 10, 10);
    const dose =
      calcLiquidChlorine(readings.freeChlorine, shockTarget, gallons, strengths.liquidChlorine) ??
      calcHouseholdBleach(readings.freeChlorine, shockTarget, gallons, strengths.householdBleach);
    if (dose) {
      const score =
        ccLevel === 'critical_high'
          ? RECOMMENDATION_PRIORITY.combinedChlorine_shock
          : RECOMMENDATION_PRIORITY.combinedChlorine_high;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'shock',
        dose,
        reason: `Combined chlorine is ${readings.combinedChlorine.toFixed(1)} ppm. Breakpoint shock requires raising FC to at least ${shockTarget.toFixed(0)} ppm.`,
        expectedResult: 'Break down combined chlorine and restore effective sanitization.',
        waitTime: 'Wait until FC drops below 5 ppm before swimming (typically 8–24 hours).',
        pumpRuntime: 'Run pump continuously for 8 hours during shock treatment.',
        retestNote: 'Retest free and combined chlorine after 24 hours.',
      });
    }
  }

  const taLevel = paramMap.totalAlkalinity?.level;
  if (taLevel && isLevelLow(taLevel)) {
    const dose = calcBakingSoda(readings.totalAlkalinity, targets.totalAlkalinity, gallons, strengths.bakingSoda);
    if (dose) {
      const score =
        taLevel === 'critical_low'
          ? RECOMMENDATION_PRIORITY.totalAlkalinity_critical
          : RECOMMENDATION_PRIORITY.totalAlkalinity_low;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'alkalinity_up',
        dose,
        reason: `Total alkalinity at ${readings.totalAlkalinity} ppm is below the ideal range.`,
        expectedResult: `Raise alkalinity toward ${targets.totalAlkalinity} ppm to stabilize pH.`,
        waitTime: 'Wait 4–6 hours before adding other chemicals.',
        pumpRuntime: 'Run pump 2–4 hours to circulate.',
        retestNote: 'Retest alkalinity and pH after 6 hours — baking soda also raises pH slightly.',
      });
    }
  }

  if (taLevel && isLevelHigh(taLevel)) {
    const dose = calcMuriaticAcidTa(readings.totalAlkalinity, targets.totalAlkalinity, gallons, strengths.muriaticAcid);
    if (dose) {
      const score = RECOMMENDATION_PRIORITY.totalAlkalinity_high;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'acid_ta',
        dose,
        reason: `Total alkalinity at ${readings.totalAlkalinity} ppm exceeds the ideal range.`,
        expectedResult: `Lower alkalinity toward ${targets.totalAlkalinity} ppm.`,
        waitTime: 'Wait 4–6 hours. Aerate the pool to off-gas CO₂ and minimize pH drop.',
        pumpRuntime: 'Run pump 2–4 hours. Point returns upward to aerate.',
        retestNote: 'Retest alkalinity and pH after 24 hours.',
      });
    }
  }

  const phLevel = paramMap.ph?.level;
  if (phLevel && isLevelLow(phLevel)) {
    const dose = calcSodaAsh(readings.ph, targets.ph, gallons, strengths.sodaAsh);
    if (dose) {
      const score =
        phLevel === 'critical_low' ? RECOMMENDATION_PRIORITY.ph_critical : RECOMMENDATION_PRIORITY.ph_low;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'base_ph',
        dose,
        reason: `pH at ${readings.ph.toFixed(1)} is below the ideal range.`,
        expectedResult: `Raise pH toward ${targets.ph} for swimmer comfort and sanitizer efficiency.`,
        waitTime: 'Wait 4 hours before adding other chemicals.',
        pumpRuntime: 'Run pump 2–4 hours to circulate.',
        retestNote: 'Retest pH after 4–6 hours.',
      });
    }
  }

  if (phLevel && isLevelHigh(phLevel)) {
    const dose =
      calcMuriaticAcidPh(readings.ph, targets.ph, gallons, strengths.muriaticAcid) ??
      calcDryAcid(readings.ph, targets.ph, gallons, strengths.dryAcid);
    if (dose) {
      const score =
        phLevel === 'critical_high' ? RECOMMENDATION_PRIORITY.ph_critical : RECOMMENDATION_PRIORITY.ph_high;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'acid_ph',
        dose,
        reason: `pH at ${readings.ph.toFixed(1)} exceeds the ideal range.`,
        expectedResult: `Lower pH toward ${targets.ph} to improve sanitizer effectiveness.`,
        waitTime: 'Wait 4 hours before adding other chemicals. Add acid to deep end with pump running.',
        pumpRuntime: 'Run pump 2–4 hours. Never pour acid over tiles or surfaces directly.',
        retestNote: 'Retest pH after 4–6 hours.',
        warnings: ['Never add acid and chlorine in the same session.'],
      });
    }
  }

  const chLevel = paramMap.calciumHardness?.level;
  if (chLevel && isLevelLow(chLevel)) {
    const dose = calcCalciumChloride(
      readings.calciumHardness,
      targets.calciumHardness,
      gallons,
      strengths.calciumChloride
    );
    if (dose) {
      const score = RECOMMENDATION_PRIORITY.calciumHardness_low;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'calcium',
        dose,
        reason: `Calcium hardness at ${readings.calciumHardness} ppm is below the ideal range.`,
        expectedResult: `Raise calcium hardness toward ${targets.calciumHardness} ppm to protect surfaces.`,
        waitTime: 'Wait 2–4 hours before swimming. Pre-dissolve in bucket of pool water.',
        pumpRuntime: 'Run pump 4 hours to circulate.',
        retestNote: 'Retest calcium hardness after 24 hours.',
        warnings: phLevel && phLevel !== 'ideal' ? ['Balance pH before raising calcium for best results.'] : undefined,
      });
    }
  }

  if (chLevel && isLevelHigh(chLevel)) {
    addCandidate(candidates, {
      priorityScore: RECOMMENDATION_PRIORITY.calciumHardness_high,
      treatmentPriority: 'low',
      category: 'physical',
      dose: {
        chemical: 'Partial drain & refill',
        amount: 0,
        unit: 'gal',
        displayAmount: 'Partial drain & refill',
      },
      reason: `Calcium hardness at ${readings.calciumHardness} ppm exceeds the ideal range.`,
      expectedResult: 'Reduce calcium level through partial drain and fresh water refill.',
      waitTime: 'Wait 24 hours after refill before full chemical balance.',
      pumpRuntime: 'Run pump continuously during refill.',
      retestNote: 'Retest calcium hardness after refill and balance.',
    });
  }

  const cyaLevel = paramMap.cyanuricAcid?.level;
  if (cyaLevel && isLevelLow(cyaLevel)) {
    const dose = calcCyanuricAcid(readings.cyanuricAcid, targets.cyanuricAcid, gallons, strengths.cyanuricAcid);
    if (dose) {
      addCandidate(candidates, {
        priorityScore: RECOMMENDATION_PRIORITY.cyanuricAcid_low,
        treatmentPriority: priorityFromScore(RECOMMENDATION_PRIORITY.cyanuricAcid_low),
        category: 'cya',
        dose,
        reason: `Cyanuric acid at ${readings.cyanuricAcid} ppm is below the ideal range.`,
        expectedResult: `Raise CYA toward ${targets.cyanuricAcid} ppm to protect chlorine from sunlight.`,
        waitTime: 'Wait 24–48 hours. CYA dissolves slowly — add to skimmer in sock or dissolve in bucket.',
        pumpRuntime: 'Run pump continuously until fully dissolved (24–48 hours).',
        retestNote: 'Retest CYA after 48 hours.',
      });
    }
  }

  if (cyaLevel && isLevelHigh(cyaLevel)) {
    addCandidate(candidates, {
      priorityScore: RECOMMENDATION_PRIORITY.cyanuricAcid_high,
      treatmentPriority: 'low',
      category: 'physical',
      dose: {
        chemical: 'Partial drain & refill',
        amount: 0,
        unit: 'gal',
        displayAmount: 'Partial drain & refill',
      },
      reason: `Cyanuric acid at ${readings.cyanuricAcid} ppm exceeds the ideal range.`,
      expectedResult: 'Reduce stabilizer level through partial drain and fresh water refill.',
      waitTime: 'Wait 24 hours after refill.',
      pumpRuntime: 'Run pump continuously during refill.',
      retestNote: 'Retest CYA after refill.',
    });
  }

  const saltLevel = paramMap.salt?.level;
  if (resolveProfileFromPool(pool).sanitizer === 'salt' && saltLevel && isLevelLow(saltLevel)) {
    const dose = calcSalt(readings.salt, targets.salt, gallons, strengths.salt);
    if (dose) {
      addCandidate(candidates, {
        priorityScore: RECOMMENDATION_PRIORITY.salt_low,
        treatmentPriority: priorityFromScore(RECOMMENDATION_PRIORITY.salt_low),
        category: 'salt',
        dose,
        reason: `Salt level at ${readings.salt} ppm is below the ideal range.`,
        expectedResult: `Raise salt toward ${targets.salt} ppm for salt cell operation.`,
        waitTime: 'Wait 24 hours for salt to dissolve before relying on salt cell output.',
        pumpRuntime: 'Run pump until salt is fully dissolved (typically 24 hours).',
        retestNote: 'Retest salt level after 24 hours. Brush pool floor to help dissolve.',
      });
    }
  }

  const fcLevel = paramMap.freeChlorine?.level;
  if (
    fcLevel &&
    isLevelLow(fcLevel) &&
    readings.combinedChlorine < 0.5 &&
    !(ccLevel && ccLevel !== 'ideal')
  ) {
    const dose =
      calcLiquidChlorine(readings.freeChlorine, targets.freeChlorine, gallons, strengths.liquidChlorine) ??
      calcHouseholdBleach(readings.freeChlorine, targets.freeChlorine, gallons, strengths.householdBleach);
    if (dose) {
      const score =
        fcLevel === 'critical_low'
          ? RECOMMENDATION_PRIORITY.freeChlorine_critical
          : RECOMMENDATION_PRIORITY.freeChlorine_low;
      addCandidate(candidates, {
        priorityScore: score,
        treatmentPriority: priorityFromScore(score),
        category: 'chlorine_raise',
        dose,
        reason: `Free chlorine at ${readings.freeChlorine.toFixed(1)} ppm is below the ideal range.`,
        expectedResult: `Raise free chlorine toward ${targets.freeChlorine} ppm for safe sanitization.`,
        waitTime: 'Wait 30 minutes before swimming after liquid chlorine addition.',
        pumpRuntime: 'Run pump 2–4 hours to circulate.',
        retestNote: 'Retest free chlorine after 4 hours.',
      });
    }
  }

  if (fcLevel && isLevelHigh(fcLevel) && readings.combinedChlorine < 0.5) {
    addCandidate(candidates, {
      priorityScore: RECOMMENDATION_PRIORITY.freeChlorine_high,
      treatmentPriority: 'low',
      category: 'chlorine_wait',
      dose: {
        chemical: 'No chemical addition',
        amount: 0,
        unit: 'fl oz',
        displayAmount: 'Allow FC to dissipate',
      },
      reason: `Free chlorine at ${readings.freeChlorine.toFixed(1)} ppm exceeds the ideal range.`,
      expectedResult: 'Allow free chlorine to naturally decrease — do not add more sanitizer.',
      waitTime: 'Wait for FC to drop below 5 ppm before swimming.',
      pumpRuntime: 'Run pump 2–4 hours to circulate and off-gas.',
      retestNote: 'Retest free chlorine after 4–6 hours.',
      warnings: ['Do not add chlorine until FC drops below 5 ppm.'],
    });
  }

  candidates.sort((a, b) => b.priorityScore - a.priorityScore);

  return candidates.map((c, index) => candidateToRecommendation(c, index + 1));
}

/** Full analysis pipeline */
export function analyzeTest(
  readings: WaterReadings,
  pool: PoolInfo,
  strengths: ChemicalStrengths
): WaterAnalysisResult {
  const parameters = analyzeWater(readings, pool);
  const waterBalance = analyzeWaterBalance(readings, pool);
  const baseScore = calculateOverallScore(parameters);
  const score = applyWaterBalanceToScore(baseScore, waterBalance);
  const overallRating = getOverallRating(score, parameters);
  const overallStatus = getOverallStatus(score, parameters);
  const summary = buildSummary(score, overallRating, parameters);
  const rawRecommendations = generateRecommendations(readings, pool, parameters, strengths);
  const { recommendations, planWarnings } = applySafetyAndSequencing(
    rawRecommendations.map((rec) => ({
      ...rec,
      category: rec.category ?? inferTreatmentCategory(rec.chemical, rec.reason),
    })),
    readings
  );
  const treatmentPlan = buildTreatmentPlan(recommendations, readings, planWarnings);

  return {
    overallScore: score,
    overallRating,
    overallStatus,
    summary,
    parameters,
    recommendations,
    treatmentPlan,
    waterBalance,
  };
}

/** Sort recommendations by priority for display (already ordered at generation) */
export function sortRecommendationsByPriority(
  recommendations: DosingRecommendation[]
): DosingRecommendation[] {
  const priorityOrder: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };
  return [...recommendations].sort((a, b) => {
    const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
    return diff !== 0 ? diff : a.order - b.order;
  });
}

export { inferTreatmentCategory } from './treatmentPlan';
