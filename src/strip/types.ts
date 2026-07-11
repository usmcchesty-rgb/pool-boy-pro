import type { StripAccuracyLevel } from '../models/types';

/** Parameters measurable on strip pads (brand-specific subset) */
export type StripParameterKey =
  | 'freeChlorine'
  | 'totalChlorine'
  | 'ph'
  | 'totalAlkalinity'
  | 'totalHardness'
  | 'cyanuricAcid'
  | 'salt';

/** Physical strip included in a product package */
export type StripPhysicalType = 'six_way' | 'salt';

/** Single pad on a strip color chart */
export interface StripPadDefinition {
  id: string;
  parameter: StripParameterKey;
  label: string;
  unit: string;
  /** Discrete bottle chart values — no free numeric entry */
  scaleValues: number[];
  stripType: StripPhysicalType;
  order: number;
  hint?: string;
}

/** Brand-agnostic strip product definition */
export interface StripBrandDefinition {
  id: string;
  manufacturer: string;
  productName: string;
  shortLabel: string;
  description: string;
  dipWaitSeconds: { min: number; max: number };
  readWithinSeconds: number;
  pads: StripPadDefinition[];
  /** Normalized aspect ratio for future camera alignment */
  stripAspectRatio: number;
}

/** User selections keyed by pad id (partial until all pads chosen) */
export type StripPadSelections = Partial<Record<string, number>>;

export interface StripReadingEstimate {
  padId: string;
  parameter: StripParameterKey;
  value: number;
  confidence: number;
  confidenceLevel: StripAccuracyLevel;
}
