import { describe, expect, it } from 'vitest';
import {
  buildChemistryProfile,
  DEFAULT_POOL_PROFILE,
  getActiveTargetRanges,
  getDosingTargets,
  getParameterThresholdsForProfile,
  resolvePoolProfile,
} from './poolProfiles';
import { analyzeWater, calculateOverallScore } from './analysis';
import { DEFAULT_CHEMICAL_STRENGTHS } from '../models/defaults';
import type { PoolInfo, PoolProfileConfig, WaterReadings } from '../models/types';
import { generateRecommendations } from './recommendations';

const baseReadings: WaterReadings = {
  freeChlorine: 2,
  combinedChlorine: 0.2,
  ph: 7.4,
  totalAlkalinity: 100,
  calciumHardness: 250,
  cyanuricAcid: 40,
  salt: 3200,
  temperature: 82,
  temperatureUnit: 'fahrenheit',
};

function poolWithProfile(profile: PoolProfileConfig): PoolInfo {
  return {
    volume: 20000,
    volumeUnit: 'gallons',
    poolType: profile.spaMode ? 'spa' : 'inground',
    sanitizerType: profile.sanitizer,
    profile,
  };
}

describe('pool profile target ranges', () => {
  it('returns different calcium hardness ranges for vinyl vs plaster', () => {
    const vinyl = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, surface: 'vinyl' });
    const plaster = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, surface: 'plaster' });
    expect(vinyl.thresholds.calciumHardness.idealMax).toBeLessThan(
      plaster.thresholds.calciumHardness.idealMax
    );
  });

  it('uses lower CYA targets for indoor pools', () => {
    const indoor = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, environment: 'indoor' });
    const outdoor = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, environment: 'outdoor' });
    expect(indoor.thresholds.cyanuricAcid.idealMax).toBeLessThan(
      outdoor.thresholds.cyanuricAcid.idealMax
    );
  });

  it('adjusts free chlorine and temperature for spa mode', () => {
    const spa = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, spaMode: true });
    const pool = buildChemistryProfile(DEFAULT_POOL_PROFILE);
    expect(spa.thresholds.temperature.idealMin).toBeGreaterThan(pool.thresholds.temperature.idealMin);
    expect(spa.thresholds.cyanuricAcid.idealMax).toBeLessThanOrEqual(30);
  });

  it('uses bromine-specific free chlorine targets', () => {
    const bromine = buildChemistryProfile({ ...DEFAULT_POOL_PROFILE, sanitizer: 'bromine' });
    expect(bromine.thresholds.freeChlorine.idealMin).toBe(3);
    expect(bromine.targets.freeChlorine).toBe(2.5);
  });

  it('exposes active ranges for settings display', () => {
    const ranges = getActiveTargetRanges(DEFAULT_POOL_PROFILE);
    expect(ranges).toHaveLength(8);
    expect(ranges.find((r) => r.parameter === 'freeChlorine')?.thresholds.idealMin).toBe(1);
  });
});

describe('profile-aware analysis', () => {
  it('classifies the same FC reading differently for bromine vs salt profiles', () => {
    const saltPool = poolWithProfile({ ...DEFAULT_POOL_PROFILE, sanitizer: 'salt' });
    const brominePool = poolWithProfile({ ...DEFAULT_POOL_PROFILE, sanitizer: 'bromine' });
    const saltFc = analyzeWater(baseReadings, saltPool).find((p) => p.parameter === 'freeChlorine');
    const bromineFc = analyzeWater(baseReadings, brominePool).find((p) => p.parameter === 'freeChlorine');
    expect(saltFc?.level).toBe('ideal');
    expect(bromineFc?.level).toBe('low');
  });

  it('changes overall score when profile changes', () => {
    const saltPool = poolWithProfile(DEFAULT_POOL_PROFILE);
    const brominePool = poolWithProfile({ ...DEFAULT_POOL_PROFILE, sanitizer: 'bromine' });
    const saltScore = calculateOverallScore(analyzeWater(baseReadings, saltPool));
    const bromineScore = calculateOverallScore(analyzeWater(baseReadings, brominePool));
    expect(bromineScore).toBeLessThan(saltScore);
  });

  it('derives dosing targets from profile for recommendations', () => {
    const vinylPool = poolWithProfile({ ...DEFAULT_POOL_PROFILE, surface: 'vinyl' });
    const targets = getDosingTargets(vinylPool);
    expect(targets.calciumHardness).toBe(250);
    const params = analyzeWater(
      { ...baseReadings, calciumHardness: 100 },
      vinylPool
    );
    const recs = generateRecommendations(
      { ...baseReadings, calciumHardness: 100 },
      vinylPool,
      params,
      DEFAULT_CHEMICAL_STRENGTHS
    );
    const calciumRec = recs.find((r) => r.reason.toLowerCase().includes('calcium'));
    expect(calciumRec?.expectedResult).toContain(String(targets.calciumHardness));
  });
});

describe('legacy pool resolution', () => {
  it('resolves profile from legacy pool metadata without profile field', () => {
    const legacyPool: PoolInfo = {
      volume: 20000,
      volumeUnit: 'gallons',
      poolType: 'inground',
      sanitizerType: 'salt',
    };
    const thresholds = getParameterThresholdsForProfile('freeChlorine', legacyPool);
    expect(thresholds.idealMin).toBe(1);
    expect(thresholds.idealMax).toBe(3);
  });

  it('maps spa pool type to spa profile', () => {
    const profile = resolvePoolProfile({}, { poolType: 'spa', sanitizerType: 'chlorine' });
    expect(profile.spaMode).toBe(true);
    expect(profile.sanitizer).toBe('chlorine');
  });
});
