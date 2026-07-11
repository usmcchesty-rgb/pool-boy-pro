/** Per-pad matcher tuning — thresholds and normalization preferences */

export interface PadMatcherConfig {
  padId: string;
  /** ΔE below which confidence is high */
  highConfidenceMaxDeltaE: number;
  /** ΔE below which confidence is medium */
  mediumConfidenceMaxDeltaE: number;
  /** If best-second ΔE gap is below this, result is ambiguous */
  ambiguityMaxGap: number;
  /** Apply session white-balance normalization before matching */
  useNormalization: boolean;
}

const DEFAULT_CONFIG: Omit<PadMatcherConfig, 'padId'> = {
  highConfidenceMaxDeltaE: 6,
  mediumConfidenceMaxDeltaE: 12,
  ambiguityMaxGap: 3,
  useNormalization: true,
};

/** Pad-specific overrides based on observed chart similarity */
export const CLOROX_PAD_MATCHER_CONFIG: Record<string, PadMatcherConfig> = {
  totalHardness: { padId: 'totalHardness', ...DEFAULT_CONFIG, ambiguityMaxGap: 2.5 },
  totalChlorine: { padId: 'totalChlorine', ...DEFAULT_CONFIG, ambiguityMaxGap: 2 },
  freeChlorine: { padId: 'freeChlorine', ...DEFAULT_CONFIG, ambiguityMaxGap: 2 },
  ph: { padId: 'ph', ...DEFAULT_CONFIG, ambiguityMaxGap: 2.5, useNormalization: true },
  totalAlkalinity: { padId: 'totalAlkalinity', ...DEFAULT_CONFIG, ambiguityMaxGap: 3 },
  cyanuricAcid: { padId: 'cyanuricAcid', ...DEFAULT_CONFIG, ambiguityMaxGap: 3.5 },
  salt: { padId: 'salt', ...DEFAULT_CONFIG, ambiguityMaxGap: 4, useNormalization: false },
};

export function getPadMatcherConfig(padId: string): PadMatcherConfig {
  return CLOROX_PAD_MATCHER_CONFIG[padId] ?? { padId, ...DEFAULT_CONFIG };
}
