import { describe, expect, it } from 'vitest';
import {
  calcDryAcid,
  calcHouseholdBleach,
  calcLiquidChlorine,
  calcMuriaticAcidPh,
  calcSalt,
} from './calculator';
import { DEFAULT_CHEMICAL_STRENGTHS } from '../models/defaults';
import { resolveStrengths, validateChemicalStrength } from './strengthConfig';

const VOLUME = 10000;

describe('liquid chlorine strength scaling', () => {
  it('doubles dose when strength is halved', () => {
    const at125 = calcLiquidChlorine(0, 2, VOLUME, 12.5);
    const at625 = calcLiquidChlorine(0, 2, VOLUME, 6.25);
    expect(at125).not.toBeNull();
    expect(at625).not.toBeNull();
    expect(at625!.amount).toBeCloseTo(at125!.amount * 2, 4);
  });

  it('returns null when strength is missing or zero', () => {
    expect(calcLiquidChlorine(0, 2, VOLUME, 0)).toBeNull();
    expect(calcLiquidChlorine(0, 2, VOLUME, -5)).toBeNull();
  });
});

describe('household bleach strength scaling', () => {
  it('requires more bleach at lower sodium hypochlorite %', () => {
    const at6 = calcHouseholdBleach(1, 3, VOLUME, 6);
    const at8 = calcHouseholdBleach(1, 3, VOLUME, 8);
    expect(at6).not.toBeNull();
    expect(at8).not.toBeNull();
    expect(at6!.amount).toBeGreaterThan(at8!.amount);
    expect(at6!.amount / at8!.amount).toBeCloseTo(8 / 6, 4);
  });
});

describe('acid strength scaling', () => {
  it('scales muriatic acid dose to configured HCl strength', () => {
    const at3145 = calcMuriaticAcidPh(8.0, 7.4, VOLUME, 31.45);
    const at20 = calcMuriaticAcidPh(8.0, 7.4, VOLUME, 20);
    expect(at3145).not.toBeNull();
    expect(at20).not.toBeNull();
    expect(at20!.amount).toBeCloseTo(at3145!.amount * (31.45 / 20), 4);
  });

  it('scales dry acid dose to configured active ingredient %', () => {
    const at935 = calcDryAcid(8.0, 7.4, VOLUME, 93.5);
    const at80 = calcDryAcid(8.0, 7.4, VOLUME, 80);
    expect(at935).not.toBeNull();
    expect(at80).not.toBeNull();
    expect(at80!.amount).toBeCloseTo(at935!.amount * (93.5 / 80), 4);
  });
});

describe('product purity scaling', () => {
  it('requires more salt when purity is below 100%', () => {
    const pure = calcSalt(2800, 3200, VOLUME, 100);
    const impure = calcSalt(2800, 3200, VOLUME, 99);
    expect(pure).not.toBeNull();
    expect(impure).not.toBeNull();
    expect(impure!.amount).toBeGreaterThan(pure!.amount);
  });
});

describe('saved strength settings', () => {
  it('fills missing values from defaults', () => {
    const resolved = resolveStrengths({ liquidChlorine: 10 });
    expect(resolved.liquidChlorine).toBe(10);
    expect(resolved.householdBleach).toBe(DEFAULT_CHEMICAL_STRENGTHS.householdBleach);
    expect(resolved.muriaticAcid).toBe(DEFAULT_CHEMICAL_STRENGTHS.muriaticAcid);
  });

  it('flags missing strength for validation', () => {
    const result = validateChemicalStrength('liquidChlorine', 0);
    expect(result.level).toBe('missing');
    expect(result.message).toContain('Settings');
  });

  it('flags unusual strength outside typical range', () => {
    const result = validateChemicalStrength('householdBleach', 2);
    expect(result.level).toBe('unusual');
    expect(result.message).toContain('typical range');
  });
});
