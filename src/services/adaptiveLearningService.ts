import type { StripBrandDefinition, StripPadSelections } from '../strip/types';
import type { PadMatchResult, ScanProcessResult } from '../strip/scanner/types';
import { getActiveAnchorInfo, invalidateAnchorCache } from '../strip/calibration/anchorProvider';
import { addVerifiedSamples } from '../strip/calibration/adaptiveLearning';
import { isAdaptiveLearningEnabled as getEnabledPref } from '../strip/calibration/adaptiveStorage';
import {
  extractEligibleSamples,
  type LearningCandidateInput,
} from '../strip/calibration/sampleAcceptance';
import type { VerifiedPadSample } from '../strip/calibration/adaptiveTypes';

export interface ScanTimingMeta {
  expired: boolean;
  acknowledged: boolean;
}

export interface ProcessLearningInput {
  brand: StripBrandDefinition;
  scanMatches: PadMatchResult[];
  selections: StripPadSelections;
  captureQuality?: ScanProcessResult['quality'];
  timingMeta: Record<string, ScanTimingMeta>;
  verifiedPadIds: Set<string>;
  scanSessionId: string;
  learningEnabled: boolean;
}

export interface ProcessLearningResult {
  added: number;
  rejected: Array<{ padId: string; reason: string }>;
  eligibleCount: number;
}

/** Build learning candidates from a verified camera scan */
export function buildLearningCandidates(input: ProcessLearningInput): LearningCandidateInput[] {
  const anchorInfo = getActiveAnchorInfo();
  const deviceVersion = anchorInfo.calibrationVersion ?? 'baseline';

  return input.scanMatches.map((match) => {
    const phase = match.padId === 'salt' ? 'salt' : 'six_way';
    const timing = input.timingMeta[phase] ?? { expired: false, acknowledged: false };

    return {
      brandId: input.brand.id,
      padId: match.padId,
      match,
      confirmedValue: input.selections[match.padId] ?? match.proposedValue,
      quality: input.captureQuality,
      lightingEstimate: (input.captureQuality?.lightingScore ?? 0.5) * 100,
      calibrationSource: anchorInfo.source,
      timingExpired: timing.expired,
      timingAcknowledged: timing.acknowledged,
      scanSessionId: input.scanSessionId,
      deviceCalibrationVersion: deviceVersion,
      userExplicitlyVerified: input.verifiedPadIds.has(match.padId),
    };
  });
}

/** Process verified scan for adaptive learning */
export function processVerifiedScanLearning(
  input: ProcessLearningInput
): ProcessLearningResult {
  if (!input.learningEnabled || !getEnabledPref()) {
    return { added: 0, rejected: [], eligibleCount: 0 };
  }

  const candidates = buildLearningCandidates(input);
  const { samples, rejections } = extractEligibleSamples(candidates);

  if (samples.length === 0) {
    return { added: 0, rejected: rejections, eligibleCount: 0 };
  }

  const falseHighCount = candidates.filter(
    (c) =>
      c.confirmedValue !== c.match.proposedValue && c.match.confidenceLevel === 'high'
  ).length;

  const { added } = addVerifiedSamples(samples, falseHighCount, rejections, input.captureQuality);
  invalidateAnchorCache();

  return { added, rejected: rejections, eligibleCount: samples.length };
}

export function countEligibleLearningSamples(input: ProcessLearningInput): number {
  const candidates = buildLearningCandidates(input);
  return extractEligibleSamples(candidates).samples.length;
}

export function getVerifiedPadIdsFromMatches(
  matches: PadMatchResult[],
  selections: Record<string, number>
): Set<string> {
  const verified = new Set<string>();
  for (const m of matches) {
    if (selections[m.padId] !== undefined) {
      verified.add(m.padId);
    }
  }
  return verified;
}

export type { VerifiedPadSample };
