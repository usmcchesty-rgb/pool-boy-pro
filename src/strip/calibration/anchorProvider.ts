import { CLOROX_COLOR_ANCHORS } from '../scanner/cloroxCalibration';
import { rgbToLab, type Rgb } from '../scanner/colorScience';
import {
  getBlendedAnchorRgb,
  getLearnedAnchorState,
  getAdaptiveProfileSummary,
  getFalseHighConfidencePenalty,
} from './adaptiveLearning';
import { isAdaptiveLearningEnabled } from './adaptiveStorage';
import { loadImportedCalibration } from './storage';
import type { ActiveAnchorInfo, CalibrationAnchorEntry } from './types';
import type { AdaptiveProfileSummary } from './adaptiveTypes';

export interface RuntimeColorAnchor {
  value: number;
  rgb: Rgb;
  lab: [number, number, number];
  reliability: 'approximate' | 'measured' | 'validated';
  sampleCount: number;
  learnedSampleCount?: number;
  varianceLab?: number;
  highVariance?: boolean;
  baselineWeight?: number;
  learnedWeight?: number;
}

let cachedImported: ReturnType<typeof loadImportedCalibration> | undefined;

function getImportedCalibration() {
  if (cachedImported === undefined) {
    cachedImported = loadImportedCalibration();
  }
  return cachedImported;
}

/** Clear cached calibration (call after import/clear/adaptive update) */
export function invalidateAnchorCache(): void {
  cachedImported = undefined;
}

export function getActiveAnchorInfo(): ActiveAnchorInfo {
  const summary = getAdaptiveProfileSummary();
  const imported = getImportedCalibration();

  if (summary.learnedAnchorCount > 0 && isAdaptiveLearningEnabled()) {
    return {
      source: summary.activeSource as ActiveAnchorInfo['source'],
      calibrationVersion: summary.calibrationVersion,
      label: summary.activeSourceLabel,
      baselineWeight: summary.baselineWeight,
      learnedWeight: summary.learnedWeight,
      learnedSampleCount: summary.totalSamples,
    };
  }

  if (imported) {
    return {
      source: 'developer_calibrated',
      calibrationVersion: imported.calibrationVersion,
      label: `Developer calibrated (${imported.calibrationVersion})`,
      baselineWeight: 1,
      learnedWeight: 0,
    };
  }

  return {
    source: 'builtin_approximate',
    label: 'Built-in approximate anchors',
    baselineWeight: 1,
    learnedWeight: 0,
  };
}

export function getAnchorSourceType(): string {
  return getActiveAnchorInfo().source;
}

function getBaselineAnchors(padId: string): RuntimeColorAnchor[] {
  const imported = getImportedCalibration();
  if (imported) {
    const pad = imported.pads.find((p) => p.padId === padId);
    if (pad && pad.anchors.length > 0) {
      return pad.anchors.map((a: CalibrationAnchorEntry) => ({
        value: a.value,
        rgb: a.referenceRgb,
        lab: a.referenceLab,
        reliability: a.reliability,
        sampleCount: a.sampleCount,
      }));
    }
  }

  const builtin = CLOROX_COLOR_ANCHORS[padId] ?? [];
  return builtin.map((a) => ({
    value: a.value,
    rgb: a.rgb,
    lab: rgbToLab(a.rgb),
    reliability: 'approximate' as const,
    sampleCount: 0,
  }));
}

/** Get runtime anchors for a pad — baseline blended with adaptive learning when active */
export function getActiveColorAnchors(padId: string): RuntimeColorAnchor[] {
  const baseline = getBaselineAnchors(padId);

  return baseline.map((anchor) => {
    const blendedRgb = getBlendedAnchorRgb(padId, anchor.value);
    const learnedState = getLearnedAnchorState(padId, anchor.value);

    return {
      ...anchor,
      rgb: blendedRgb,
      lab: rgbToLab(blendedRgb),
      learnedSampleCount: learnedState?.reliableSampleCount,
      varianceLab: learnedState?.varianceLab,
      highVariance: learnedState?.highVariance,
      baselineWeight: learnedState?.baselineWeight ?? 1,
      learnedWeight: learnedState?.learnedWeight ?? 0,
      sampleCount: learnedState?.sampleCount ?? anchor.sampleCount,
    };
  });
}

export function getActiveAnchorsForMatching(padId: string): Array<{ value: number; rgb: Rgb }> {
  return getActiveColorAnchors(padId).map((a) => ({ value: a.value, rgb: a.rgb }));
}

export function getAnchorConfidenceCaps(
  padId: string,
  value: number
): { lowSampleCap?: number; highVarianceCap?: number; falseHighPenalty: number } {
  const state = getLearnedAnchorState(padId, value);
  const falseHighPenalty = getFalseHighConfidencePenalty();

  return {
    lowSampleCap:
      state?.active && state.reliableSampleCount < 5 ? 74 : undefined,
    highVarianceCap: state?.highVariance ? 49 : undefined,
    falseHighPenalty,
  };
}

export { getAdaptiveProfileSummary };
export type { AdaptiveProfileSummary };
