import type { ParameterAnalysis, PoolInfo } from '../models/types';
import type { TaylorTestInputs, TaylorTestStep } from '../models/taylorKit';
import { isSaltSanitizer } from '../models/taylorKit';
import {
  buildReadingsFromTaylorInputs,
  calculateCombinedChlorine,
  calculateCalciumHardnessFromDrops,
  calculateFreeChlorine,
  calculateTotalAlkalinityFromDrops,
} from '../chemistry/taylorKit';
import { buildChemistryProfile, resolveProfileFromPool } from '../chemistry/poolProfiles';
import { getNextTaylorStep } from './taylorSteps';
import { isCombinedChlorineStepComplete } from './taylorGuidance';

export type TaylorStatusBadge = 'excellent' | 'good' | 'needs_attention' | 'low' | 'high';

export interface TaylorResultInterpretation {
  label: string;
  value: string;
  badge: TaylorStatusBadge;
  badgeLabel: string;
  summary: string;
  paragraphs: string[];
  whatItMeasures: string;
}

export interface TaylorAdaptiveInsight {
  id: string;
  message: string;
}

export interface LearnMoreTopic {
  id: string;
  title: string;
  body: string;
}

const WHY_THIS_TEST: Partial<Record<TaylorTestStep, string>> = {
  freeChlorine: 'This measures the sanitizer that is actively protecting your pool.',
  combinedChlorine: 'This checks whether chlorine has combined with contaminants.',
  ph: 'This measures how acidic or basic the water is.',
  totalAlkalinity: 'This helps keep pH stable.',
  calciumHardness: 'This protects plaster and equipment.',
  cyanuricAcid: 'This protects chlorine from sunlight.',
  salt: 'This ensures your salt chlorine generator has enough salt.',
};

const NEXT_STEP_PREVIEW: Partial<Record<TaylorTestStep, string>> = {
  pool: "Next we'll test Free Chlorine — the active sanitizer keeping your water safe.",
  freeChlorine:
    "Next we'll test Combined Chlorine to see if any sanitizer has been used up by contaminants.",
  combinedChlorine:
    "Next we'll test pH because chlorine works best when the water is properly balanced.",
  ph: "Next we'll test Total Alkalinity, which helps pH stay steady.",
  totalAlkalinity:
    "Next we'll test Calcium Hardness to see how well your water protects surfaces and equipment.",
  calciumHardness:
    "Next we'll test CYA (stabilizer), which shields chlorine from sunlight.",
  cyanuricAcid: "Next we'll test salt level so your generator can produce chlorine reliably.",
};

export const LEARN_MORE_TOPICS: LearnMoreTopic[] = [
  {
    id: 'chlorine',
    title: 'What is chlorine?',
    body:
      'Chlorine kills bacteria and algae in pool water. Free chlorine is the portion still available to sanitize. Combined chlorine forms when free chlorine reacts with sweat, oils, and other contaminants — it is less effective and can cause odor and irritation.',
  },
  {
    id: 'ph',
    title: 'Why does pH matter?',
    body:
      'pH measures how acidic or basic water is on a 0–14 scale. Pool water near 7.4–7.6 is comfortable for swimmers and lets chlorine work efficiently. Too low pH can corrode metal and etch plaster; too high pH makes chlorine less effective and can lead to scale.',
  },
  {
    id: 'cya',
    title: 'Why does CYA affect chlorine?',
    body:
      'Cyanuric acid (CYA) acts like sunscreen for chlorine outdoors. A moderate level slows chlorine loss from UV. Too little CYA means chlorine burns off quickly in sunlight. Too much CYA locks up chlorine and requires higher free chlorine levels to sanitize effectively.',
  },
  {
    id: 'alkalinity',
    title: 'What is alkalinity?',
    body:
      'Total alkalinity is a buffer that resists sudden pH changes. Think of it as shock absorbers for pH. Low alkalinity lets pH swing wildly; high alkalinity can make pH drift upward and become hard to adjust.',
  },
  {
    id: 'calcium',
    title: 'Why is calcium important?',
    body:
      'Calcium hardness measures dissolved calcium in water. In plaster pools, water that is too soft can slowly dissolve calcium from the surface. Water that is too hard can deposit scale on surfaces and equipment. Vinyl and fiberglass pools are less affected but still benefit from balanced calcium.',
  },
  {
    id: 'salt',
    title: 'How does a salt generator work?',
    body:
      'A salt chlorine generator uses dissolved salt in the water to produce chlorine through electrolysis. The pool still needs chlorine — the generator makes it from salt. If salt is too low, production stops. If salt is too high, the cell may shut down or wear faster.',
  },
];

export function getWhyThisTest(step: TaylorTestStep): string | null {
  return WHY_THIS_TEST[step] ?? null;
}

export function getNextStepPreview(
  step: TaylorTestStep,
  pool: PoolInfo,
  saltSkipped: boolean
): string | null {
  const next = getNextTaylorStep(step, pool, saltSkipped);
  if (!next || next === 'review') {
    return 'Next you will review all results and see what your pool needs.';
  }
  return NEXT_STEP_PREVIEW[step] ?? null;
}

export function getCompletionEncouragement(): { title: string; paragraphs: string[] } {
  return {
    title: 'Great job!',
    paragraphs: [
      "You've successfully completed a full Taylor K-2006-SALT water analysis.",
      "Now let's use these results to determine exactly what your pool needs.",
    ],
  };
}

function findParam(
  parameters: ParameterAnalysis[],
  key: string
): ParameterAnalysis | undefined {
  return parameters.find((p) => p.parameter === key);
}

function isPlasterLike(pool: PoolInfo): boolean {
  const surface = resolveProfileFromPool(pool).surface;
  return surface === 'plaster' || surface === 'pebble';
}

function isStepResultReady(step: TaylorTestStep, inputs: TaylorTestInputs, pool: PoolInfo): boolean {
  switch (step) {
    case 'freeChlorine':
      return inputs.fcDropCount !== undefined;
    case 'combinedChlorine':
      return isCombinedChlorineStepComplete(inputs);
    case 'ph':
      return inputs.ph !== undefined && !Number.isNaN(inputs.ph);
    case 'totalAlkalinity':
      return inputs.totalAlkalinityMode === 'drops'
        ? inputs.totalAlkalinityDrops !== undefined
        : inputs.totalAlkalinityPpm !== undefined;
    case 'calciumHardness':
      return inputs.calciumHardnessMode === 'drops'
        ? inputs.calciumHardnessDrops !== undefined
        : inputs.calciumHardnessPpm !== undefined;
    case 'cyanuricAcid':
      return inputs.cyanuricAcid !== undefined;
    case 'salt':
      if (inputs.saltSkipped && !isSaltSanitizer(pool.sanitizerType)) return true;
      return inputs.salt !== undefined;
    default:
      return false;
  }
}

export function mapLevelToBadge(
  level: ParameterAnalysis['level'] | undefined
): { badge: TaylorStatusBadge; badgeLabel: string } {
  switch (level) {
    case 'ideal':
      return { badge: 'excellent', badgeLabel: 'Excellent' };
    case 'low':
      return { badge: 'low', badgeLabel: 'Low' };
    case 'high':
      return { badge: 'high', badgeLabel: 'High' };
    case 'critical_low':
      return { badge: 'needs_attention', badgeLabel: 'Needs Attention' };
    case 'critical_high':
      return { badge: 'needs_attention', badgeLabel: 'Needs Attention' };
    default:
      return { badge: 'good', badgeLabel: 'Good' };
  }
}

function interpretFreeChlorine(
  ppm: number,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } =
    ppm <= 0.5 && (param?.level === 'critical_low' || ppm < 0.5)
      ? { badge: 'needs_attention' as const, badgeLabel: 'Needs Attention' }
      : mapLevelToBadge(param?.level);

  const whatItMeasures =
    'Free chlorine is the portion of sanitizer still available to kill germs and algae — your active protection.';

  let summary = 'Sanitizer level recorded.';
  const paragraphs: string[] = [];

  if (ppm <= 0.5 && param?.level === 'critical_low') {
    summary = 'Chlorine is nearly depleted.';
    paragraphs.push(
      `Your Free Chlorine is ${ppm.toFixed(1)} ppm.`,
      'Your chlorine is nearly depleted. Avoid swimming until sanitizer has been restored.'
    );
  } else if (param?.level === 'low' || param?.level === 'critical_low') {
    summary = 'Below recommended sanitizer level.';
    paragraphs.push(
      `Your Free Chlorine is ${ppm.toFixed(1)} ppm.`,
      'Your chlorine is below the recommended level. The pool may not have enough sanitizer to prevent algae or bacteria growth.'
    );
  } else if (param?.level === 'ideal') {
    summary = 'Sanitizer is in the ideal range.';
    paragraphs.push(
      `Your Free Chlorine is ${ppm.toFixed(1)} ppm.`,
      'This is in the recommended range for your pool.',
      'This is the chlorine actively sanitizing the water.'
    );
  } else if (param?.level === 'high' || param?.level === 'critical_high') {
    summary = 'Sanitizer is above typical ideal levels.';
    paragraphs.push(
      `Your Free Chlorine is ${ppm.toFixed(1)} ppm.`,
      'Free chlorine is above the typical ideal range. Very high levels can irritate skin and eyes.'
    );
  } else {
    paragraphs.push(`Your Free Chlorine is ${ppm.toFixed(1)} ppm.`, whatItMeasures);
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

function interpretCombinedChlorine(ppm: number): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const whatItMeasures =
    'Combined chlorine (chloramines) forms when free chlorine reacts with contaminants. Lower is better.';

  if (ppm === 0) {
    return {
      badge: 'excellent',
      badgeLabel: 'Excellent',
      summary: 'No significant chloramines detected.',
      whatItMeasures,
      paragraphs: [
        'Your Combined Chlorine is 0.0 ppm.',
        'Excellent — no significant chloramines detected.',
      ],
    };
  }

  if (ppm > 0 && ppm <= 0.5) {
    return {
      badge: 'good',
      badgeLabel: 'Good',
      summary: 'Slight chloramines — monitor.',
      whatItMeasures,
      paragraphs: [
        `Your Combined Chlorine is ${ppm.toFixed(1)} ppm.`,
        'Slight chloramines detected. Monitor on future tests.',
      ],
    };
  }

  return {
    badge: 'needs_attention',
    badgeLabel: 'Needs Attention',
    summary: 'Chloramines are elevated.',
    whatItMeasures,
    paragraphs: [
      `Your Combined Chlorine is ${ppm.toFixed(1)} ppm.`,
      'Combined Chlorine is elevated. Your pool is beginning to accumulate chloramines.',
      'The treatment plan will explain how to remove them.',
    ],
  };
}

function interpretPh(
  ph: number,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } = mapLevelToBadge(param?.level);
  const whatItMeasures =
    'pH measures how acidic or basic the water is. It affects swimmer comfort and how well chlorine works.';

  let summary = 'pH recorded.';
  const paragraphs = [`Your pH is ${ph.toFixed(1)}.`];

  if (param?.level === 'ideal') {
    summary = 'Comfortable for swimmers; protects equipment.';
    paragraphs.push(
      'Your pH is in the ideal range.',
      'Comfortable for swimmers and helps protect equipment.'
    );
  } else if (param?.level === 'low' || param?.level === 'critical_low') {
    summary = 'Low pH — water may become corrosive.';
    paragraphs.push('Low pH can damage pool surfaces and equipment over time.');
  } else if (param?.level === 'high' || param?.level === 'critical_high') {
    summary = 'High pH — chlorine less effective.';
    paragraphs.push('High pH makes chlorine less effective. Scaling becomes more likely.');
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

function interpretTotalAlkalinity(
  ppm: number,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } = mapLevelToBadge(param?.level);
  const whatItMeasures =
    'Total alkalinity buffers pH — it helps prevent sudden swings after rain, bather load, or chemical additions.';

  const paragraphs = [
    `Your Total Alkalinity is ${ppm} ppm.`,
    whatItMeasures,
  ];

  let summary = 'Alkalinity recorded.';
  if (param?.level === 'high' || param?.level === 'critical_high') {
    summary = 'High alkalinity — pH may keep rising.';
    paragraphs.push('High TA often causes pH to continually rise and become difficult to lower.');
  } else if (param?.level === 'low' || param?.level === 'critical_low') {
    summary = 'Low alkalinity — pH may swing rapidly.';
    paragraphs.push('Low TA lets pH swing up and down quickly.');
  } else if (param?.level === 'ideal') {
    summary = 'Alkalinity supports stable pH.';
    paragraphs.push('This level helps keep pH steady.');
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

function interpretCalciumHardness(
  ppm: number,
  pool: PoolInfo,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } = mapLevelToBadge(param?.level);
  const plaster = isPlasterLike(pool);
  const whatItMeasures = plaster
    ? 'Calcium hardness protects plaster from etching when too low, and from scale when too high.'
    : 'Calcium hardness is less critical on vinyl and fiberglass, but still helps overall water balance.';

  const paragraphs = [`Your Calcium Hardness is ${ppm} ppm.`, whatItMeasures];

  let summary = 'Hardness recorded.';
  if (plaster) {
    if (param?.level === 'low' || param?.level === 'critical_low') {
      summary = 'Low calcium may slowly dissolve plaster.';
      paragraphs.push('Soft water can pull calcium from plaster surfaces over time.');
    } else if (param?.level === 'high' || param?.level === 'critical_high') {
      summary = 'High calcium increases scaling risk.';
      paragraphs.push('Hard water can deposit scale on surfaces and equipment.');
    } else if (param?.level === 'ideal') {
      summary = 'Hardness supports surface protection.';
    }
  } else if (param?.level === 'ideal') {
    summary = 'Hardness is in a reasonable range.';
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

function interpretCyanuricAcid(
  ppm: number,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } = mapLevelToBadge(param?.level);
  const whatItMeasures =
    'CYA (cyanuric acid) stabilizer shields free chlorine from breaking down in sunlight.';

  const paragraphs = [`Your CYA is ${ppm} ppm.`, whatItMeasures];
  let summary = 'Stabilizer level recorded.';

  if (param?.level === 'low' || param?.level === 'critical_low') {
    summary = 'Low CYA — sun destroys chlorine quickly.';
    paragraphs.push('Without enough stabilizer outdoors, chlorine burns off faster in sunlight.');
  } else if (param?.level === 'high') {
    summary = 'High CYA — more chlorine needed to sanitize.';
    paragraphs.push('High stabilizer reduces chlorine efficiency — more free chlorine is required.');
  } else if (param?.level === 'critical_high') {
    summary = 'Very high CYA — dilution may eventually be needed.';
    paragraphs.push(
      'Very high stabilizer significantly locks up chlorine. Water replacement may eventually be recommended.'
    );
  } else if (param?.level === 'ideal') {
    summary = 'Stabilizer supports outdoor chlorine protection.';
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

function interpretSalt(
  ppm: number,
  param: ParameterAnalysis | undefined
): Omit<TaylorResultInterpretation, 'label' | 'value'> {
  const { badge, badgeLabel } = mapLevelToBadge(param?.level);
  const whatItMeasures =
    'Salt level tells your salt chlorine generator how much dissolved salt is available to make chlorine.';

  const paragraphs = [`Your Salt level is ${ppm.toLocaleString()} ppm.`, whatItMeasures];
  let summary = 'Salt level recorded.';

  if (param?.level === 'low' || param?.level === 'critical_low') {
    summary = 'Salt may be too low for the generator.';
    paragraphs.push('Your generator may stop producing chlorine until salt is raised.');
  } else if (param?.level === 'ideal') {
    summary = 'Generator should operate normally.';
    paragraphs.push('Salt is in the range where most generators operate normally.');
  } else if (param?.level === 'high' || param?.level === 'critical_high') {
    summary = 'Salt may exceed generator limits.';
    paragraphs.push('Very high salt can exceed manufacturer limits and stress the cell.');
  }

  return { badge, badgeLabel, summary, paragraphs, whatItMeasures };
}

export function getStepInterpretation(
  step: TaylorTestStep,
  inputs: TaylorTestInputs,
  pool: PoolInfo,
  parameters: ParameterAnalysis[]
): TaylorResultInterpretation | null {
  if (!isStepResultReady(step, inputs, pool)) return null;

  switch (step) {
    case 'freeChlorine': {
      const ppm = calculateFreeChlorine(inputs.fcDropCount!, inputs.sampleSizeMl);
      const body = interpretFreeChlorine(ppm, findParam(parameters, 'freeChlorine'));
      return {
        label: 'Free Chlorine',
        value: `${ppm.toFixed(ppm % 1 === 0 ? 0 : 1)} ppm`,
        ...body,
      };
    }
    case 'combinedChlorine': {
      const ppm = inputs.ccSampleStayedClear
        ? 0
        : calculateCombinedChlorine(inputs.ccDropCount!, inputs.sampleSizeMl);
      const body = interpretCombinedChlorine(ppm);
      return {
        label: 'Combined Chlorine',
        value: `${ppm.toFixed(1)} ppm`,
        ...body,
      };
    }
    case 'ph': {
      const body = interpretPh(inputs.ph!, findParam(parameters, 'ph'));
      return { label: 'pH', value: inputs.ph!.toFixed(1), ...body };
    }
    case 'totalAlkalinity': {
      const ppm =
        inputs.totalAlkalinityMode === 'drops'
          ? calculateTotalAlkalinityFromDrops(inputs.totalAlkalinityDrops!)
          : inputs.totalAlkalinityPpm!;
      const body = interpretTotalAlkalinity(ppm, findParam(parameters, 'totalAlkalinity'));
      return { label: 'Total Alkalinity', value: `${ppm} ppm`, ...body };
    }
    case 'calciumHardness': {
      const ppm =
        inputs.calciumHardnessMode === 'drops'
          ? calculateCalciumHardnessFromDrops(inputs.calciumHardnessDrops!)
          : inputs.calciumHardnessPpm!;
      const body = interpretCalciumHardness(ppm, pool, findParam(parameters, 'calciumHardness'));
      return { label: 'Calcium Hardness', value: `${ppm} ppm`, ...body };
    }
    case 'cyanuricAcid': {
      const body = interpretCyanuricAcid(inputs.cyanuricAcid!, findParam(parameters, 'cyanuricAcid'));
      return {
        label: 'CYA (Stabilizer)',
        value: `${inputs.cyanuricAcid} ppm`,
        ...body,
      };
    }
    case 'salt': {
      if (inputs.saltSkipped && !isSaltSanitizer(pool.sanitizerType)) {
        return {
          label: 'Salt',
          value: 'Skipped',
          badge: 'good',
          badgeLabel: 'Skipped',
          summary: 'Optional for this pool type.',
          whatItMeasures: 'Salt testing is optional when not using a salt generator.',
          paragraphs: ['Salt test skipped — not required for traditional chlorine pools.'],
        };
      }
      const body = interpretSalt(inputs.salt!, findParam(parameters, 'salt'));
      return {
        label: 'Salt',
        value: `${inputs.salt!.toLocaleString()} ppm`,
        ...body,
      };
    }
    default:
      return null;
  }
}

/** Educational insights based on entered results — does not change chemistry */
export function getAdaptiveInsights(
  inputs: TaylorTestInputs,
  pool: PoolInfo
): TaylorAdaptiveInsight[] {
  const readings = buildReadingsFromTaylorInputs(inputs);
  const profile = buildChemistryProfile(resolveProfileFromPool(pool));
  const insights: TaylorAdaptiveInsight[] = [];

  if (!Number.isNaN(readings.freeChlorine) && readings.freeChlorine <= 0.5) {
    insights.push({
      id: 'fc-depleted',
      message:
        'Since your chlorine is depleted, restoring sanitizer should be one of your highest priorities.',
    });
  }

  if (!Number.isNaN(readings.combinedChlorine) && readings.combinedChlorine > 0.5) {
    insights.push({
      id: 'cc-elevated',
      message:
        'Combined Chlorine is elevated. The treatment plan may recommend shocking or SLAM depending on your pool.',
    });
  }

  if (!Number.isNaN(readings.ph)) {
    if (readings.ph > 8.0) {
      insights.push({
        id: 'ph-high',
        message: 'High pH reduces chlorine effectiveness.',
      });
    }
    if (readings.ph < 7.0) {
      insights.push({
        id: 'ph-low',
        message: 'Very low pH can damage pool surfaces and equipment.',
      });
    }
  }

  if (!Number.isNaN(readings.cyanuricAcid) && readings.cyanuricAcid > 80) {
    insights.push({
      id: 'cya-high',
      message:
        'High stabilizer reduces chlorine efficiency. The treatment plan will consider this.',
    });
  }

  if (isSaltSanitizer(pool.sanitizerType) && !inputs.saltSkipped) {
    const minSalt = profile.thresholds.salt.idealMin;
    if (!Number.isNaN(readings.salt) && readings.salt < minSalt) {
      insights.push({
        id: 'salt-low',
        message: 'Your generator may stop producing chlorine.',
      });
    }
  }

  if (!Number.isNaN(readings.totalAlkalinity) && readings.totalAlkalinity > 140) {
    insights.push({
      id: 'ta-high',
      message: 'High alkalinity often causes pH to continually rise.',
    });
  }

  if (!Number.isNaN(readings.calciumHardness)) {
    if (readings.calciumHardness > profile.thresholds.calciumHardness.criticalHighMin) {
      insights.push({
        id: 'ch-high',
        message: 'Scaling risk increases.',
      });
    }
    if (
      isPlasterLike(pool) &&
      readings.calciumHardness < profile.thresholds.calciumHardness.criticalLowMax
    ) {
      insights.push({
        id: 'ch-low-plaster',
        message: 'Low calcium may slowly dissolve plaster.',
      });
    }
  }

  return insights;
}

/** Insights relevant to the current step only */
export function getStepAdaptiveInsights(
  step: TaylorTestStep,
  inputs: TaylorTestInputs,
  pool: PoolInfo
): TaylorAdaptiveInsight[] {
  const all = getAdaptiveInsights(inputs, pool);
  const stepKeys: Partial<Record<TaylorTestStep, string[]>> = {
    freeChlorine: ['fc-depleted'],
    combinedChlorine: ['cc-elevated'],
    ph: ['ph-high', 'ph-low'],
    totalAlkalinity: ['ta-high'],
    calciumHardness: ['ch-high', 'ch-low-plaster'],
    cyanuricAcid: ['cya-high'],
    salt: ['salt-low'],
  };
  const allowed = stepKeys[step];
  if (!allowed) return [];
  return all.filter((i) => allowed.includes(i.id));
}

export function getConfidenceMessage(
  interpretation: TaylorResultInterpretation | null,
  usedTroubleshooting: boolean
): string | null {
  if (usedTroubleshooting) {
    return "Nice job. It's common for first-time users to need a second attempt.";
  }
  if (!interpretation) return null;

  if (interpretation.badge === 'excellent') {
    return 'Everything looks good. Your test appears to have been completed correctly.';
  }
  if (interpretation.badge === 'good') {
    return "You're doing well. That result gives us useful information for your pool.";
  }
  return 'Your test appears to have been completed correctly.';
}

export function getLearnMoreTopic(id: string): LearnMoreTopic | undefined {
  return LEARN_MORE_TOPICS.find((t) => t.id === id);
}
