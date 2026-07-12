import type { PoolInfo } from '../models/types';
import { isSaltSanitizer } from '../models/taylorKit';
import type { StripBrandDefinition, StripPadSelections } from './types';

export type SaltEntryMode = 'scale' | 'ppm';

export interface SaltEntryState {
  mode: SaltEntryMode;
  scaleReading?: number;
}

export interface ManualEntryValidation {
  errors: Record<string, string>;
  missingLabels: string[];
  canContinue: boolean;
}

/** Pool-aware validation for manual Quick Test entry */
export function validateManualStripEntry(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  pool: PoolInfo,
  saltSkipped = false
): ManualEntryValidation {
  const errors: Record<string, string> = {};
  const missingLabels: string[] = [];
  const saltRequired = isSaltSanitizer(pool.sanitizerType);

  for (const pad of brand.pads) {
    if (pad.id === 'salt') {
      if (saltRequired && !saltSkipped && selections.salt === undefined) {
        errors.salt = 'Enter a salt reading or skip if not applicable.';
        missingLabels.push(pad.label);
      }
      continue;
    }

    if (selections[pad.id] === undefined) {
      errors[pad.id] = `Select a ${pad.label} value from the color chart.`;
      missingLabels.push(pad.label);
    }
  }

  return {
    errors,
    missingLabels,
    canContinue: missingLabels.length === 0,
  };
}

/** Scan path validation — six-way pads required; salt may be pending second scan */
export function validateScanStripSelections(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  pool: PoolInfo,
  hasSaltMatch: boolean
): ManualEntryValidation {
  const errors: Record<string, string> = {};
  const missingLabels: string[] = [];
  const saltRequired = isSaltSanitizer(pool.sanitizerType);

  for (const pad of brand.pads) {
    if (pad.stripType === 'six_way' && selections[pad.id] === undefined) {
      errors[pad.id] = `Verify ${pad.label}.`;
      missingLabels.push(pad.label);
    }
  }

  if (saltRequired && !hasSaltMatch && selections.salt === undefined) {
    errors.salt = 'Scan or enter the salt strip.';
    missingLabels.push('Salt');
  }

  return { errors, missingLabels, canContinue: missingLabels.length === 0 };
}
