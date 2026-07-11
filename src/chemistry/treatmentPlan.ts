import type {
  DosingRecommendation,
  TreatmentCategory,
  TreatmentPlanStep,
  WaterReadings,
} from '../models/types';

/** Technician-standard treatment sequence (lower runs first) */
const SEQUENCE_ORDER: Record<TreatmentCategory, number> = {
  shock: 10,
  alkalinity_up: 20,
  acid_ta: 25,
  base_ph: 30,
  acid_ph: 35,
  chlorine_raise: 40,
  calcium: 50,
  cya: 60,
  salt: 70,
  chlorine_wait: 80,
  physical: 90,
};

const CHLORINE_CATEGORIES: TreatmentCategory[] = ['shock', 'chlorine_raise'];
const ACID_CATEGORIES: TreatmentCategory[] = ['acid_ph', 'acid_ta'];
const BASE_CATEGORIES: TreatmentCategory[] = ['base_ph', 'alkalinity_up'];

export function inferTreatmentCategory(chemical: string, reason: string): TreatmentCategory {
  const text = `${chemical} ${reason}`.toLowerCase();
  if (text.includes('combined chlorine') || text.includes('breakpoint') || text.includes('shock')) {
    return 'shock';
  }
  if (text.includes('allow fc') || text.includes('dissipate') || text.includes('no chemical')) {
    return 'chlorine_wait';
  }
  if (text.includes('partial drain') || text.includes('refill')) {
    return 'physical';
  }
  if (text.includes('baking soda') || (text.includes('alkalinity') && text.includes('below'))) {
    return 'alkalinity_up';
  }
  if (text.includes('muriatic') && text.includes('alkalinity')) {
    return 'acid_ta';
  }
  if (text.includes('muriatic') || text.includes('dry acid')) {
    return 'acid_ph';
  }
  if (text.includes('soda ash')) {
    return 'base_ph';
  }
  if (text.includes('calcium')) {
    return 'calcium';
  }
  if (text.includes('cyanuric') || text.includes('stabilizer') || text.includes('cya')) {
    return 'cya';
  }
  if (text.includes('salt')) {
    return 'salt';
  }
  if (text.includes('chlorine') || text.includes('bleach')) {
    return 'chlorine_raise';
  }
  return 'chlorine_raise';
}

export function sortRecommendationsBySequence(
  recommendations: DosingRecommendation[]
): DosingRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const seqA = SEQUENCE_ORDER[a.category ?? 'chlorine_raise'];
    const seqB = SEQUENCE_ORDER[b.category ?? 'chlorine_raise'];
    if (seqA !== seqB) return seqA - seqB;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    return pDiff !== 0 ? pDiff : a.order - b.order;
  });
}

function isChlorineCategory(category: TreatmentCategory): boolean {
  return CHLORINE_CATEGORIES.includes(category);
}

function isAcidCategory(category: TreatmentCategory): boolean {
  return ACID_CATEGORIES.includes(category);
}

function isBaseCategory(category: TreatmentCategory): boolean {
  return BASE_CATEGORIES.includes(category);
}

function needsSeparation(a: TreatmentCategory, b: TreatmentCategory): boolean {
  if (isChlorineCategory(a) && isAcidCategory(b)) return true;
  if (isAcidCategory(a) && isChlorineCategory(b)) return true;
  if (isBaseCategory(a) && isAcidCategory(b)) return true;
  if (isAcidCategory(a) && isBaseCategory(b)) return true;
  return false;
}

function waitBetweenTreatments(prev: DosingRecommendation, next: DosingRecommendation): string {
  if (needsSeparation(prev.category ?? 'chlorine_raise', next.category ?? 'chlorine_raise')) {
    return 'Wait at least 4 hours — never add acid and chlorine together. Test pH and FC before proceeding.';
  }
  return 'Wait 30–60 minutes and verify circulation before the next chemical.';
}

/** Apply safety filters and reorder recommendations */
export function applySafetyAndSequencing(
  recommendations: DosingRecommendation[],
  readings: WaterReadings
): { recommendations: DosingRecommendation[]; planWarnings: TreatmentPlanStep[] } {
  const planWarnings: TreatmentPlanStep[] = [];
  let filtered = [...recommendations];

  const phOutOfRange = readings.ph < 7.2 || readings.ph > 7.6;
  const fcVeryHigh = readings.freeChlorine > 5;
  const hasShock = filtered.some((r) => r.category === 'shock');
  const hasChlorineAdd = filtered.some((r) =>
    CHLORINE_CATEGORIES.includes(r.category ?? 'chlorine_raise')
  );
  const hasAcid = filtered.some((r) => isAcidCategory(r.category ?? 'chlorine_raise'));
  const hasCalciumOrCya = filtered.some((r) => r.category === 'calcium' || r.category === 'cya');

  if (fcVeryHigh && hasChlorineAdd && !hasShock) {
    filtered = filtered.filter((r) => !isChlorineCategory(r.category ?? 'chlorine_raise'));
    planWarnings.push({
      order: 0,
      kind: 'warning',
      title: 'Free chlorine is already high',
      description: `FC is ${readings.freeChlorine.toFixed(1)} ppm — do not add more chlorine until it drops below 5 ppm.`,
    });
  }

  if (fcVeryHigh && hasShock) {
    planWarnings.push({
      order: 0,
      kind: 'warning',
      title: 'High free chlorine before shock',
      description: `FC is already ${readings.freeChlorine.toFixed(1)} ppm. Proceed with shock only if combined chlorine remains — avoid overdosing.`,
    });
  }

  if (phOutOfRange && hasCalciumOrCya) {
    planWarnings.push({
      order: 0,
      kind: 'warning',
      title: 'Balance pH before other adjustments',
      description: 'Correct pH to 7.2–7.6 before adding calcium or stabilizer for best results.',
    });
  }

  if (hasAcid && hasChlorineAdd) {
    planWarnings.push({
      order: 0,
      kind: 'warning',
      title: 'Never mix acid and chlorine',
      description: 'Apply acid and chlorine treatments separately with at least 4 hours between additions.',
    });
  }

  if (hasShock && filtered.some((r) => r.category === 'chlorine_raise')) {
    filtered = filtered.filter((r) => r.category !== 'chlorine_raise');
  }

  filtered = sortRecommendationsBySequence(filtered).map((rec, index) => ({
    ...rec,
    order: index + 1,
  }));

  return { recommendations: filtered, planWarnings };
}

/** Build an ordered treatment plan with waits and retest guidance */
export function buildTreatmentPlan(
  recommendations: DosingRecommendation[],
  readings: WaterReadings,
  planWarnings: TreatmentPlanStep[] = []
): TreatmentPlanStep[] {
  const steps: TreatmentPlanStep[] = [];
  let order = 1;

  for (const warning of planWarnings) {
    steps.push({ ...warning, order: order++ });
  }

  if (recommendations.length === 0) {
    return steps;
  }

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const prev = recommendations[i - 1];

    if (i > 0 && prev) {
      const prevCat = prev.category ?? 'chlorine_raise';
      const curCat = rec.category ?? 'chlorine_raise';
      if (needsSeparation(prevCat, curCat)) {
        steps.push({
          order: order++,
          kind: 'wait',
          title: 'Wait before next chemical',
          description: waitBetweenTreatments(prev, rec),
        });
      }
    }

    steps.push({
      order: order++,
      kind: 'treatment',
      title: rec.chemical,
      description: `${rec.amount}${rec.unit ? ` ${rec.unit}` : ''} — ${rec.reason}`,
      recommendationOrder: rec.order,
    });

    if (rec.pumpRuntime) {
      steps.push({
        order: order++,
        kind: 'pump',
        title: 'Run pump',
        description: rec.pumpRuntime,
        recommendationOrder: rec.order,
      });
    }

    if (rec.waitTime) {
      steps.push({
        order: order++,
        kind: 'wait',
        title: 'Wait period',
        description: rec.waitTime,
        recommendationOrder: rec.order,
      });
    }
  }

  const retestMessages = recommendations.map((r) => r.retestNote).filter(Boolean);
  const retestDescription =
    retestMessages.length > 0
      ? retestMessages[retestMessages.length - 1]
      : 'Retest all key parameters after treatments complete.';

  steps.push({
    order: order++,
    kind: 'retest',
    title: 'Retest water',
    description:
      readings.freeChlorine > 3 || recommendations.some((r) => r.category === 'shock')
        ? `${retestDescription} For shock treatments, retest FC and CC after 24 hours.`
        : retestDescription,
  });

  return steps;
}

/** Build plan from legacy recommendations missing treatmentPlan */
export function buildTreatmentPlanFromRecommendations(
  recommendations: DosingRecommendation[],
  readings: WaterReadings
): TreatmentPlanStep[] {
  const enriched = recommendations.map((rec) => ({
    ...rec,
    unit: rec.unit ?? '',
    expectedResult: rec.expectedResult ?? 'Improve water balance toward ideal ranges.',
    category: rec.category ?? inferTreatmentCategory(rec.chemical, rec.reason),
  }));
  const { recommendations: sequenced, planWarnings } = applySafetyAndSequencing(enriched, readings);
  return buildTreatmentPlan(sequenced, readings, planWarnings);
}

export function enrichLegacyRecommendation(rec: DosingRecommendation): DosingRecommendation {
  return {
    ...rec,
    unit: rec.unit ?? '',
    expectedResult: rec.expectedResult ?? 'Improve water balance toward ideal ranges.',
    category: rec.category ?? inferTreatmentCategory(rec.chemical, rec.reason),
  };
}
