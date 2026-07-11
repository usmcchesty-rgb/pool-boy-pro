import type { PoolInfo } from '../models/types';
import { isSaltSanitizer, TAYLOR_STEP_ORDER, type TaylorTestStep } from '../models/taylorKit';

/** Step order; omits salt when skipped on non-salt pools. */
export function getTaylorStepOrder(pool: PoolInfo, saltSkipped: boolean): TaylorTestStep[] {
  if (!isSaltSanitizer(pool.sanitizerType) && saltSkipped) {
    return TAYLOR_STEP_ORDER.filter((s) => s !== 'salt');
  }
  return TAYLOR_STEP_ORDER;
}

export function getNextTaylorStep(
  current: TaylorTestStep,
  pool: PoolInfo,
  saltSkipped: boolean
): TaylorTestStep | null {
  const order = getTaylorStepOrder(pool, saltSkipped);
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

export function getPrevTaylorStep(
  current: TaylorTestStep,
  pool: PoolInfo,
  saltSkipped: boolean
): TaylorTestStep | null {
  const order = getTaylorStepOrder(pool, saltSkipped);
  const idx = order.indexOf(current);
  if (idx <= 0) return null;
  return order[idx - 1];
}

export function getTaylorStepIndex(
  step: TaylorTestStep,
  pool: PoolInfo,
  saltSkipped: boolean
): number {
  return getTaylorStepOrder(pool, saltSkipped).indexOf(step);
}
