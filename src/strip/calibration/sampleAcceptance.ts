import type { StripCaptureQuality } from '../../models/types';
import type { PadMatchResult } from '../scanner/types';
import { rgbToLab } from '../scanner/colorScience';
import { ADAPTIVE_LEARNING_THRESHOLDS } from './adaptiveConfig';
import type { VerifiedPadSample } from './adaptiveTypes';

export interface LearningCandidateInput {
  brandId: string;
  padId: string;
  match: PadMatchResult;
  confirmedValue: number;
  quality?: StripCaptureQuality;
  lightingEstimate?: number;
  calibrationSource: string;
  timingExpired: boolean;
  timingAcknowledged: boolean;
  scanSessionId: string;
  deviceCalibrationVersion: string;
  userExplicitlyVerified: boolean;
}

export interface SampleRejectionReason {
  padId: string;
  reason: string;
}

const T = ADAPTIVE_LEARNING_THRESHOLDS;

function meetsQuality(quality?: StripCaptureQuality): boolean {
  if (!quality) return false;
  return (
    quality.focusScore >= T.minFocus &&
    quality.lightingScore >= T.minLighting &&
    quality.alignmentScore >= T.minAlignment &&
    quality.stabilityScore >= T.minStability
  );
}

/** Determine if a verified pad reading is suitable for adaptive learning */
export function isSampleEligible(input: LearningCandidateInput): { eligible: boolean; reason?: string } {
  if (!input.userExplicitlyVerified) {
    return { eligible: false, reason: 'Not explicitly verified by user' };
  }

  if (!input.match.sampledRgb) {
    return { eligible: false, reason: 'No color sample from scan' };
  }

  if (input.match.ambiguous && input.confirmedValue === input.match.proposedValue) {
    return { eligible: false, reason: 'Ambiguous result without explicit correction' };
  }

  if (!meetsQuality(input.quality)) {
    return { eligible: false, reason: 'Scan quality below threshold' };
  }

  if (input.timingExpired && !input.timingAcknowledged) {
    return { eligible: false, reason: 'Expired reading window not acknowledged' };
  }

  return { eligible: true };
}

/** Build a verified sample from an eligible candidate */
export function buildVerifiedSample(input: LearningCandidateInput): VerifiedPadSample {
  const userCorrected = input.confirmedValue !== input.match.proposedValue;
  let reliabilityWeight = 1;

  if (input.timingExpired && input.timingAcknowledged) {
    reliabilityWeight *= T.expiredWindowReliability;
  }
  if (userCorrected) {
    reliabilityWeight *= 0.9;
  }
  if (input.match.confidenceLevel === 'low') {
    reliabilityWeight *= 0.85;
  }

  reliabilityWeight *= Math.min(1, (input.quality?.lightingScore ?? 0.5) + 0.2);

  return {
    id: `${input.scanSessionId}-${input.padId}-${Date.now()}`,
    brandId: input.brandId,
    padId: input.padId,
    confirmedValue: input.confirmedValue,
    rawRgb: input.match.sampledRgb,
    normalizedRgb: input.match.sampledRgb,
    lab: rgbToLab(input.match.sampledRgb),
    deltaEToAnchor: input.match.deltaE,
    quality: input.quality!,
    lightingEstimate: input.lightingEstimate ?? (input.quality?.lightingScore ?? 0) * 100,
    calibrationSource: input.calibrationSource,
    timestamp: Date.now(),
    reliabilityWeight,
    deviceCalibrationVersion: input.deviceCalibrationVersion,
    timingExpired: input.timingExpired,
    userCorrected,
    proposedValue: input.match.proposedValue,
    scanSessionId: input.scanSessionId,
  };
}

export function extractEligibleSamples(
  inputs: LearningCandidateInput[]
): { samples: VerifiedPadSample[]; rejections: SampleRejectionReason[] } {
  const samples: VerifiedPadSample[] = [];
  const rejections: SampleRejectionReason[] = [];

  for (const input of inputs) {
    const check = isSampleEligible(input);
    if (!check.eligible) {
      rejections.push({ padId: input.padId, reason: check.reason ?? 'Rejected' });
      continue;
    }
    samples.push(buildVerifiedSample(input));
  }

  return { samples, rejections };
}
