import type { StripAccuracyLevel } from '../../models/types';
import { getActiveAnchorsForMatching, getAnchorSourceType, getAnchorConfidenceCaps } from '../calibration/anchorProvider';
import { getPadMatcherConfig } from '../calibration/matcherConfig';
import { colorDistance, rgbToLab, type Rgb } from './colorScience';
import type { PadMatchResult } from './types';

export interface ColorMatchResult {
  value: number;
  confidence: number;
  confidenceLevel: StripAccuracyLevel;
  deltaE: number;
  matchedAnchorRgb: Rgb;
  alternateValue?: number;
  alternateConfidence?: number;
  alternateDeltaE?: number;
  ambiguous: boolean;
  ambiguityReason?: string;
  anchorSource: string;
}

/** Map ΔE to confidence score (0–100) using per-pad thresholds */
export function deltaEToConfidence(
  deltaE: number,
  padId: string,
  calibrationFactor = 1
): number {
  const config = getPadMatcherConfig(padId);
  const adjusted = deltaE / calibrationFactor;

  if (adjusted <= config.highConfidenceMaxDeltaE) {
    const ratio = adjusted / config.highConfidenceMaxDeltaE;
    return Math.round(95 - ratio * 15);
  }
  if (adjusted <= config.mediumConfidenceMaxDeltaE) {
    const ratio =
      (adjusted - config.highConfidenceMaxDeltaE) /
      (config.mediumConfidenceMaxDeltaE - config.highConfidenceMaxDeltaE);
    return Math.round(74 - ratio * 24);
  }
  if (adjusted <= config.mediumConfidenceMaxDeltaE * 2) {
    const ratio = (adjusted - config.mediumConfidenceMaxDeltaE) / config.mediumConfidenceMaxDeltaE;
    return Math.round(49 - ratio * 34);
  }
  return Math.max(5, Math.round(20 - adjusted));
}

export function confidenceToLevel(score: number): StripAccuracyLevel {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

interface RankedAnchor {
  value: number;
  rgb: Rgb;
  deltaE: number;
}

/** Find nearest chart anchors using CIEDE2000 in LAB space */
export function rankAnchors(
  sampledRgb: Rgb,
  anchors: Array<{ value: number; rgb: Rgb }>
): RankedAnchor[] {
  const sampleLab = rgbToLab(sampledRgb);
  return anchors
    .map((a) => ({
      value: a.value,
      rgb: a.rgb,
      deltaE: colorDistance(sampleLab, rgbToLab(a.rgb)),
    }))
    .sort((a, b) => a.deltaE - b.deltaE);
}

function applyAmbiguityPenalty(
  confidence: number,
  confidenceLevel: StripAccuracyLevel,
  gap: number,
  config: ReturnType<typeof getPadMatcherConfig>
): { confidence: number; confidenceLevel: StripAccuracyLevel; ambiguous: boolean; reason?: string } {
  if (gap >= config.ambiguityMaxGap) {
    return { confidence, confidenceLevel, ambiguous: false };
  }

  const cappedConfidence = Math.min(confidence, 49);
  const cappedLevel: StripAccuracyLevel = 'low';
  return {
    confidence: cappedConfidence,
    confidenceLevel: cappedLevel,
    ambiguous: true,
    reason: `Two chart colors are very similar (ΔE gap ${gap.toFixed(1)}). Lighting or pad development may affect the match.`,
  };
}

/**
 * Match a sampled pad color to the nearest chart anchor.
 * Returns proposed value, confidence, alternate, and ambiguity info.
 */
export function matchPadColor(
  padId: string,
  sampledRgb: Rgb,
  calibrationConfidence = 1
): ColorMatchResult {
  const anchors = getActiveAnchorsForMatching(padId);
  const anchorSource = getAnchorSourceType();

  if (anchors.length === 0) {
    return {
      value: 0,
      confidence: 0,
      confidenceLevel: 'low',
      deltaE: 999,
      matchedAnchorRgb: [128, 128, 128],
      ambiguous: true,
      ambiguityReason: 'No chart anchors configured for this pad.',
      anchorSource,
    };
  }

  const config = getPadMatcherConfig(padId);
  const ranked = rankAnchors(sampledRgb, anchors);
  const best = ranked[0];
  const second = ranked[1];
  const calFactor = calibrationConfidence < 0.6 ? 1.3 : 1;

  let confidence = deltaEToConfidence(best.deltaE, padId, calFactor);
  let confidenceLevel = confidenceToLevel(confidence);

  const gap = second ? second.deltaE - best.deltaE : Infinity;
  const ambiguity = applyAmbiguityPenalty(confidence, confidenceLevel, gap, config);
  confidence = ambiguity.confidence;
  confidenceLevel = ambiguity.confidenceLevel;

  const caps = getAnchorConfidenceCaps(padId, best.value);
  if (caps.lowSampleCap !== undefined) {
    confidence = Math.min(confidence, caps.lowSampleCap);
    if (confidence < 75) confidenceLevel = confidenceToLevel(confidence);
  }
  if (caps.highVarianceCap !== undefined) {
    confidence = Math.min(confidence, caps.highVarianceCap);
    confidenceLevel = confidenceToLevel(confidence);
  }
  if (caps.falseHighPenalty > 0) {
    confidence = Math.min(confidence, Math.round(95 - caps.falseHighPenalty * 100));
    confidenceLevel = confidenceToLevel(confidence);
  }

  const result: ColorMatchResult = {
    value: best.value,
    confidence,
    confidenceLevel,
    deltaE: best.deltaE,
    matchedAnchorRgb: best.rgb,
    ambiguous: ambiguity.ambiguous,
    ambiguityReason: ambiguity.reason,
    anchorSource,
  };

  if (second && (confidence < 75 || best.deltaE > config.mediumConfidenceMaxDeltaE || ambiguity.ambiguous)) {
    result.alternateValue = second.value;
    result.alternateDeltaE = second.deltaE;
    result.alternateConfidence = deltaEToConfidence(second.deltaE, padId, calFactor);
  }

  return result;
}

export function matchPadColorFull(
  padId: string,
  sampledRgb: Rgb,
  calibrationConfidence = 1
): PadMatchResult {
  const match = matchPadColor(padId, sampledRgb, calibrationConfidence);
  return {
    padId,
    proposedValue: match.value,
    confidence: match.confidence,
    confidenceLevel: match.confidenceLevel,
    deltaE: match.deltaE,
    sampledRgb,
    matchedAnchorRgb: match.matchedAnchorRgb,
    alternateValue: match.alternateValue,
    alternateConfidence: match.alternateConfidence,
    alternateDeltaE: match.alternateDeltaE,
    ambiguous: match.ambiguous,
    ambiguityReason: match.ambiguityReason,
    anchorSource: match.anchorSource,
  };
}

export function shouldUseNormalization(padId: string): boolean {
  return getPadMatcherConfig(padId).useNormalization;
}
