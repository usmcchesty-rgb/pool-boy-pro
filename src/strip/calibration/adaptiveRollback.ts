import { ADAPTIVE_HEALTH_THRESHOLDS } from './adaptiveHealthConfig';
import type {
  AnchorRollbackRecord,
  AnchorSafetyOverride,
  LearnedAnchorState,
  VerifiedPadSample,
} from './adaptiveTypes';
import { computeCorrectionRate } from './adaptiveHealth';

const H = ADAPTIVE_HEALTH_THRESHOLDS;

export interface RegressionAssessment {
  padId: string;
  value: number;
  correctionRate: number;
  correctionCount: number;
  shouldReduce: boolean;
  shouldDisable: boolean;
  reason: string;
}

/** Detect performance regression for a learned anchor from verified corrections */
export function assessAnchorRegression(
  state: LearnedAnchorState,
  samples: VerifiedPadSample[],
  existingOverride?: AnchorSafetyOverride
): RegressionAssessment | null {
  if (!state.active) return null;

  const correctionRate = computeCorrectionRate(
    samples,
    state.padId,
    state.value,
    H.regressionWindow
  );

  const recent = samples
    .filter((s) => s.padId === state.padId && s.confirmedValue === state.value)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, H.regressionWindow);
  const correctionCount = recent.filter((s) => s.userCorrected).length;

  if (correctionCount < H.minCorrectionsForRegression) return null;
  if (correctionRate < H.regressionCorrectionRate) return null;

  const regressionCount = (existingOverride?.regressionCount ?? 0) + 1;

  if (regressionCount >= H.regressionDisableAfter || existingOverride?.learnedWeightMultiplier === H.regressionWeightMultiplier) {
    return {
      padId: state.padId,
      value: state.value,
      correctionRate,
      correctionCount,
      shouldReduce: false,
      shouldDisable: true,
      reason: `Correction rate ${(correctionRate * 100).toFixed(0)}% (${correctionCount}/${recent.length}) exceeds threshold after prior rollback`,
    };
  }

  return {
    padId: state.padId,
    value: state.value,
    correctionRate,
    correctionCount,
    shouldReduce: true,
    shouldDisable: false,
    reason: `Correction rate ${(correctionRate * 100).toFixed(0)}% (${correctionCount}/${recent.length}) — reducing learned weight`,
  };
}

/** Apply rollback to safety override list */
export function applyRollback(
  overrides: AnchorSafetyOverride[],
  assessment: RegressionAssessment,
  state: LearnedAnchorState
): { overrides: AnchorSafetyOverride[]; record: AnchorRollbackRecord } {
  const existing = overrides.find((o) => o.padId === assessment.padId && o.value === assessment.value);
  const previousWeight = state.learnedWeight * (existing?.learnedWeightMultiplier ?? 1);
  const regressionCount = (existing?.regressionCount ?? 0) + 1;

  const updated: AnchorSafetyOverride = {
    padId: assessment.padId,
    value: assessment.value,
    learnedWeightMultiplier: assessment.shouldDisable ? 0 : H.regressionWeightMultiplier,
    disabled: assessment.shouldDisable,
    rollbackReason: assessment.reason,
    regressionCount,
    updatedAt: new Date().toISOString(),
  };

  const next = overrides.filter((o) => !(o.padId === assessment.padId && o.value === assessment.value));
  next.push(updated);

  const record: AnchorRollbackRecord = {
    padId: assessment.padId,
    value: assessment.value,
    reason: assessment.reason,
    previousLearnedWeight: previousWeight,
    currentLearnedWeight: assessment.shouldDisable ? 0 : previousWeight * H.regressionWeightMultiplier,
    disabled: assessment.shouldDisable,
    recordedAt: new Date().toISOString(),
    regressionCount,
  };

  return { overrides: next, record };
}

/** Get effective learned weight after safety override */
export function getEffectiveLearnedWeight(
  state: LearnedAnchorState,
  override?: AnchorSafetyOverride
): number {
  if (!state.active || !state.learnedRgb) return 0;
  if (override?.disabled) return 0;
  const mult = override?.learnedWeightMultiplier ?? 1;
  return state.learnedWeight * mult;
}
