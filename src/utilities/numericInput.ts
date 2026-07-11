/** Format a numeric field value for controlled text/number inputs */
export function formatNumericInputValue(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '';
  return String(value);
}

/** Parse user input — empty string becomes undefined; valid 0 is preserved */
export function parseNumericInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}
