import { describe, expect, it } from 'vitest';
import { DEFAULT_POOL_INFO } from '../models/defaults';
import type { PoolInfo } from '../models/types';
import { defaultTaylorInputs, type TaylorTestInputs } from '../models/taylorKit';
import { buildReadingsFromTaylorInputs } from '../chemistry/taylorKit';
import { analyzeTest } from '../chemistry/recommendations';
import { DEFAULT_SETTINGS } from '../models/defaults';
import {
  getAdaptiveInsights,
  getCompletionEncouragement,
  getConfidenceMessage,
  getLearnMoreTopic,
  getNextStepPreview,
  getStepAdaptiveInsights,
  getStepInterpretation,
  getWhyThisTest,
  LEARN_MORE_TOPICS,
  mapLevelToBadge,
} from './taylorAssistant';

const pool: PoolInfo = { ...DEFAULT_POOL_INFO };

const vinylPool: PoolInfo = {
  ...pool,
  profile: { surface: 'vinyl', sanitizer: 'salt', environment: 'outdoor', spaMode: false },
};

const plasterPool: PoolInfo = {
  ...pool,
  profile: { surface: 'plaster', sanitizer: 'salt', environment: 'outdoor', spaMode: false },
};

function inputs(overrides: Partial<TaylorTestInputs> = {}): TaylorTestInputs {
  return { ...defaultTaylorInputs(DEFAULT_SETTINGS), ...overrides };
}

function previewFor(state: TaylorTestInputs, testPool: PoolInfo = pool) {
  const readings = buildReadingsFromTaylorInputs(state);
  return analyzeTest(readings, testPool, DEFAULT_SETTINGS.chemicalStrengths);
}

describe('Why this test sections', () => {
  it('explains purpose for every chemistry step', () => {
    expect(getWhyThisTest('freeChlorine')).toContain('sanitizer');
    expect(getWhyThisTest('combinedChlorine')).toContain('contaminants');
    expect(getWhyThisTest('ph')).toContain('acidic');
    expect(getWhyThisTest('totalAlkalinity')).toContain('stable');
    expect(getWhyThisTest('calciumHardness')).toContain('protect');
    expect(getWhyThisTest('cyanuricAcid')).toContain('sunlight');
    expect(getWhyThisTest('salt')).toContain('generator');
  });
});

describe('Next-step explanations', () => {
  it('previews combined chlorine after free chlorine', () => {
    expect(getNextStepPreview('freeChlorine', pool, false)).toContain('Combined Chlorine');
  });

  it('previews review after final step', () => {
    expect(getNextStepPreview('salt', pool, false)).toContain('review');
  });
});

describe('Live interpretation panels', () => {
  it('interprets ideal free chlorine with excellent badge', () => {
    const state = inputs({ fcDropCount: 8, sampleSizeMl: 25 });
    const panel = getStepInterpretation(
      'freeChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    expect(panel?.value).toBe('1.6 ppm');
    expect(panel?.badge).toBe('excellent');
    expect(panel?.paragraphs.some((p) => p.includes('actively sanitizing'))).toBe(true);
  });

  it('interprets depleted free chlorine with needs attention', () => {
    const state = inputs({ fcDropCount: 0, sampleSizeMl: 25 });
    const panel = getStepInterpretation(
      'freeChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    expect(panel?.badge).toBe('needs_attention');
    expect(panel?.paragraphs.some((p) => p.includes('depleted'))).toBe(true);
  });

  it('interprets zero combined chlorine as excellent', () => {
    const state = inputs({ ccSampleStayedClear: true, ccDropCount: 0 });
    const panel = getStepInterpretation(
      'combinedChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    expect(panel?.badge).toBe('excellent');
    expect(panel?.summary).toContain('chloramines');
  });

  it('interprets elevated combined chlorine', () => {
    const state = inputs({ ccDropCount: 4, sampleSizeMl: 25 });
    const panel = getStepInterpretation(
      'combinedChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    expect(panel?.badge).toBe('needs_attention');
    expect(panel?.paragraphs.some((p) => p.includes('elevated'))).toBe(true);
  });

  it('returns null when step result is not ready', () => {
    expect(
      getStepInterpretation('freeChlorine', inputs({ fcDropCount: undefined }), pool, [])
    ).toBeNull();
  });
});

describe('pool surface conditional messaging', () => {
  it('mentions plaster etching for low calcium on plaster pools', () => {
    const state = inputs({ calciumHardnessMode: 'ppm', calciumHardnessPpm: 50 });
    const panel = getStepInterpretation(
      'calciumHardness',
      state,
      plasterPool,
      previewFor(state, plasterPool).parameters
    );
    expect(panel?.paragraphs.some((p) => p.toLowerCase().includes('plaster'))).toBe(true);
  });

  it('uses vinyl-appropriate hardness messaging', () => {
    const state = inputs({ calciumHardnessMode: 'ppm', calciumHardnessPpm: 250 });
    const panel = getStepInterpretation(
      'calciumHardness',
      state,
      vinylPool,
      previewFor(state, vinylPool).parameters
    );
    expect(panel?.whatItMeasures.toLowerCase()).toContain('vinyl');
  });
});

describe('adaptive educational messages', () => {
  it('flags depleted chlorine', () => {
    const state = inputs({ fcDropCount: 0 });
    const insights = getAdaptiveInsights(state, pool);
    expect(insights.some((i) => i.id === 'fc-depleted')).toBe(true);
  });

  it('flags elevated combined chlorine', () => {
    const state = inputs({ ccDropCount: 4, sampleSizeMl: 25 });
    const insights = getAdaptiveInsights(state, pool);
    expect(insights.some((i) => i.id === 'cc-elevated')).toBe(true);
  });

  it('flags high pH reducing chlorine effectiveness', () => {
    const state = inputs({ ph: 8.2 });
    const insights = getStepAdaptiveInsights('ph', state, pool);
    expect(insights.some((i) => i.message.includes('chlorine effectiveness'))).toBe(true);
  });

  it('flags low salt for generator', () => {
    const state = inputs({ salt: 2400 });
    const insights = getStepAdaptiveInsights('salt', state, pool);
    expect(insights.some((i) => i.id === 'salt-low')).toBe(true);
  });

  it('flags high CYA', () => {
    const state = inputs({ cyanuricAcid: 100 });
    const insights = getStepAdaptiveInsights('cyanuricAcid', state, pool);
    expect(insights.some((i) => i.id === 'cya-high')).toBe(true);
  });
});

describe('summary status cards', () => {
  it('maps ideal level to excellent badge', () => {
    expect(mapLevelToBadge('ideal')).toEqual({ badge: 'excellent', badgeLabel: 'Excellent' });
  });

  it('includes one-sentence summary on interpretation', () => {
    const state = inputs({ ph: 7.4 });
    const panel = getStepInterpretation('ph', state, pool, previewFor(state).parameters);
    expect(panel?.summary.length).toBeGreaterThan(10);
  });
});

describe('Learn More panels', () => {
  it('includes all required topics', () => {
    const titles = LEARN_MORE_TOPICS.map((t) => t.title);
    expect(titles).toContain('What is chlorine?');
    expect(titles).toContain('Why does pH matter?');
    expect(titles).toContain('Why does CYA affect chlorine?');
    expect(titles).toContain('What is alkalinity?');
    expect(titles).toContain('Why is calcium important?');
    expect(titles).toContain('How does a salt generator work?');
  });

  it('loads topic by id', () => {
    expect(getLearnMoreTopic('chlorine')?.body).toContain('Free chlorine');
  });
});

describe('confidence builders', () => {
  it('encourages after troubleshooting', () => {
    const state = inputs({ fcDropCount: 8, sampleSizeMl: 25 });
    const panel = getStepInterpretation(
      'freeChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    const msg = getConfidenceMessage(panel, true);
    expect(msg).toContain('first-time');
  });

  it('reassures on excellent results', () => {
    const state = inputs({ fcDropCount: 8, sampleSizeMl: 25 });
    const panel = getStepInterpretation(
      'freeChlorine',
      state,
      pool,
      previewFor(state).parameters
    );
    expect(getConfidenceMessage(panel, false)).toContain('Everything looks good');
  });
});

describe('final completion message', () => {
  it('celebrates full Taylor analysis completion', () => {
    const msg = getCompletionEncouragement();
    expect(msg.title).toBe('Great job!');
    expect(msg.paragraphs.join(' ')).toContain('Taylor K-2006-SALT');
    expect(msg.paragraphs.join(' ')).toContain('what your pool needs');
  });
});
