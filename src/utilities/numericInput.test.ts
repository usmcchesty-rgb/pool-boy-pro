import { describe, expect, it } from 'vitest';
import { formatNumericInputValue, parseNumericInput } from './numericInput';

describe('numericInput', () => {
  it('returns empty string for undefined and NaN', () => {
    expect(formatNumericInputValue(undefined)).toBe('');
    expect(formatNumericInputValue(NaN)).toBe('');
  });

  it('preserves zero in display and parsing', () => {
    expect(formatNumericInputValue(0)).toBe('0');
    expect(parseNumericInput('0')).toBe(0);
  });

  it('returns undefined for empty input', () => {
    expect(parseNumericInput('')).toBeUndefined();
    expect(parseNumericInput('   ')).toBeUndefined();
  });

  it('parses valid numbers', () => {
    expect(parseNumericInput('5')).toBe(5);
    expect(parseNumericInput('7.4')).toBe(7.4);
  });
});
