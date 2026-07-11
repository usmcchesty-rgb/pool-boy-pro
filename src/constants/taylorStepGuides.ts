import type { TaylorTestStep } from '../models/taylorKit';

export const TAYLOR_STEP_GUIDES: Partial<
  Record<TaylorTestStep, { title: string; reagents?: string[]; steps: string[] }>
> = {
  pool: {
    title: 'Before You Test',
    steps: [
      'Rinse the comparator cells with pool water.',
      'Note pool volume, type, and sanitizer for accurate recommendations.',
      'Record water temperature at the time of sampling.',
    ],
  },
  freeChlorine: {
    title: 'FAS-DPD Free Chlorine Test',
    reagents: ['R-0009 (if needed)', 'R-0871 FAS-DPD Titrating Reagent'],
    steps: [
      'Fill comparator to 10 mL or 25 mL line with pool water.',
      'Add 2 drops R-0009 if sample is not at pH 6.5–7.5.',
      'Add 2 scoops R-0870 DPD powder — sample should turn pink.',
      'Titrate with R-0871 until sample turns clear. Count drops.',
    ],
  },
  combinedChlorine: {
    title: 'Combined Chlorine Test',
    reagents: ['R-0003'],
    steps: [
      'Do not discard the free chlorine sample.',
      'Add 5 drops R-0003. Mix for 10 seconds.',
      'Sample turns pink again if combined chlorine is present.',
      'Continue titrating with R-0871 until clear. Count only the additional drops.',
    ],
  },
  ph: {
    title: 'pH Test',
    reagents: ['R-0004 pH Indicator', 'R-0015 Acid Demand (optional)', 'R-0016 Base Demand (optional)'],
    steps: [
      'Fill comparator to 44 mL line with pool water.',
      'Add 5 drops R-0004. Match color to pH scale.',
      'Optional: run acid or base demand tests to determine adjustment amount.',
    ],
  },
  totalAlkalinity: {
    title: 'Total Alkalinity Test',
    reagents: ['R-0007', 'R-0008', 'R-0009'],
    steps: [
      'Fill comparator to 25 mL line with pool water.',
      'Add 2 drops R-0007 and 5 drops R-0008 — sample turns green.',
      'Titrate with R-0009 until red. Each drop = 10 ppm.',
    ],
  },
  calciumHardness: {
    title: 'Calcium Hardness Test',
    reagents: ['R-0010L', 'R-0011L', 'R-0012'],
    steps: [
      'Fill comparator to 25 mL line with pool water.',
      'Add 20 drops R-0010L and 5 drops R-0011L — sample turns red.',
      'Titrate with R-0012 until blue. Each drop = 25 ppm.',
    ],
  },
  cyanuricAcid: {
    title: 'Cyanuric Acid Test',
    reagents: ['R-0013'],
    steps: [
      'Fill mixing bottle to 25 mL with pool water.',
      'Add 1 bottle R-0013. Mix until dissolved.',
      'View through turbidity scale. Record ppm when dot disappears.',
    ],
  },
  salt: {
    title: 'Salt Test (K-2006-SALT)',
    reagents: ['Salt titration reagents from kit'],
    steps: [
      'Follow the salt test procedure in your K-2006-SALT instructions.',
      'Titrate to the specified endpoint and record the salt level in ppm.',
    ],
  },
};
