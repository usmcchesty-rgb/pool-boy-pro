import { useMemo, useState } from 'react';
import type {
  ChemicalInventoryItem,
  DosingRecommendation,
  PoolEquipment,
  PriorityLevel,
  TreatmentPlanStep,
  WaterReadings,
} from '../../models/types';
import { buildTreatmentPlanFromRecommendations, enrichLegacyRecommendation } from '../../chemistry/treatmentPlan';
import {
  enrichRecommendations,
  formatRunPumpTitle,
  getRecommendationEquipmentRefs,
  suggestMaintenanceFromTreatmentStep,
} from '../../integrations/systemIntegration';
import { formatPriority } from '../../utilities/format';
import { InventoryAvailabilityBadge } from '../integrations/InventoryAvailabilityBadge';
import { EquipmentReferenceList } from '../integrations/EquipmentReferenceList';
import { CreateMaintenanceButton } from '../integrations/CreateMaintenanceButton';

interface RecommendationListProps {
  recommendations: DosingRecommendation[];
  treatmentPlan?: TreatmentPlanStep[];
  readings?: WaterReadings;
  compact?: boolean;
  inventory?: ChemicalInventoryItem[];
  equipment?: PoolEquipment[];
}

function recPriority(rec: DosingRecommendation): PriorityLevel {
  return rec.priority ?? 'medium';
}

function stepIcon(kind: TreatmentPlanStep['kind']): string {
  switch (kind) {
    case 'treatment':
      return '✓';
    case 'wait':
      return '⏱';
    case 'pump':
      return '↻';
    case 'retest':
      return '🧪';
    case 'warning':
      return '⚠';
  }
}

export function RecommendationList({
  recommendations,
  treatmentPlan,
  readings,
  compact,
  inventory = [],
  equipment = [],
}: RecommendationListProps) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const enriched = useMemo(
    () => recommendations.map(enrichLegacyRecommendation),
    [recommendations]
  );

  const integrated = useMemo(
    () => enrichRecommendations(enriched, inventory, equipment),
    [enriched, inventory, equipment]
  );

  const integratedByOrder = useMemo(
    () => Object.fromEntries(integrated.map((entry) => [entry.recommendation.order, entry])),
    [integrated]
  );

  const plan = useMemo(() => {
    if (treatmentPlan && treatmentPlan.length > 0) return treatmentPlan;
    if (readings && enriched.length > 0) {
      return buildTreatmentPlanFromRecommendations(enriched, readings);
    }
    return [];
  }, [treatmentPlan, readings, enriched]);

  const recByOrder = useMemo(
    () => Object.fromEntries(enriched.map((r) => [r.order, r])),
    [enriched]
  );

  function toggleStep(order: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      return next;
    });
  }

  function renderIntegrationExtras(
    rec: DosingRecommendation,
    options?: { compact?: boolean; showMaintenance?: boolean }
  ) {
    const entry = integratedByOrder[rec.order];
    if (!entry) return null;

    return (
      <div className="recommendation-integrations">
        <InventoryAvailabilityBadge
          recommendation={rec}
          status={entry.inventory}
          compact={options?.compact}
        />
        <EquipmentReferenceList refs={entry.equipmentRefs} compact={options?.compact} />
        {options?.showMaintenance !== false && entry.maintenanceSuggestion && (
          <CreateMaintenanceButton
            suggestion={entry.maintenanceSuggestion}
            compact={options?.compact}
          />
        )}
      </div>
    );
  }

  if (enriched.length === 0) {
    return (
      <p className="recommendations-empty">
        No chemical adjustments needed — your water is balanced.
      </p>
    );
  }

  if (compact) {
    return (
      <ol className="recommendations recommendations--compact">
        {enriched.map((rec) => (
          <li key={rec.order} className="recommendation">
            <div className="recommendation__step">{rec.order}</div>
            <div className="recommendation__content">
              <header className="recommendation__header">
                <strong>{rec.chemical}</strong>
                <span className="recommendation__amount">{rec.amount}</span>
              </header>
              <p className="recommendation__reason">{rec.reason}</p>
              {renderIntegrationExtras(rec, { compact: true, showMaintenance: false })}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (plan.length > 0) {
    return (
      <div className="treatment-plan">
        <ol className="treatment-plan__steps">
          {plan.map((step, index) => {
            const rec =
              step.kind === 'treatment' && step.recommendationOrder
                ? recByOrder[step.recommendationOrder]
                : undefined;
            const isCheckable = step.kind === 'treatment';
            const isDone = completed.has(step.order);
            const pumpRefs =
              step.kind === 'pump' ? getRecommendationEquipmentRefs(
                {
                  order: step.order,
                  chemical: step.title,
                  amount: '',
                  unit: '',
                  reason: step.description,
                  expectedResult: '',
                  priority: 'medium',
                  pumpRuntime: step.description,
                  waitTime: '',
                  retestNote: '',
                },
                equipment
              ) : [];
            const pumpTitle =
              step.kind === 'pump' ? formatRunPumpTitle(pumpRefs[0]?.equipment) : step.title;
            const maintenanceSuggestion =
              step.kind === 'pump'
                ? suggestMaintenanceFromTreatmentStep(step, equipment)
                : null;

            return (
              <li
                key={`${step.kind}-${step.order}`}
                className={`treatment-plan__step treatment-plan__step--${step.kind} ${isDone ? 'treatment-plan__step--done' : ''}`}
              >
                {isCheckable ? (
                  <label className="treatment-plan__check">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleStep(step.order)}
                      aria-label={`Mark step ${step.order} complete: ${step.title}`}
                    />
                    <span className="treatment-plan__check-box" aria-hidden="true" />
                  </label>
                ) : (
                  <span className="treatment-plan__icon" aria-hidden="true">
                    {stepIcon(step.kind)}
                  </span>
                )}

                <div className="treatment-plan__body">
                  <header className="treatment-plan__header">
                    <span className="treatment-plan__step-label">Step {step.order}</span>
                    <h3 className="treatment-plan__title">{pumpTitle}</h3>
                  </header>
                  <p className="treatment-plan__description">{step.description}</p>

                  {step.kind === 'pump' && pumpRefs.length > 0 && (
                    <EquipmentReferenceList refs={pumpRefs} />
                  )}
                  {maintenanceSuggestion && (
                    <CreateMaintenanceButton suggestion={maintenanceSuggestion} />
                  )}

                  {rec && (
                    <div className="treatment-plan__treatment-detail">
                      <div className="treatment-plan__dose">
                        <span className="treatment-plan__dose-amount">{rec.amount}</span>
                        {rec.unit && <span className="treatment-plan__dose-unit">{rec.unit}</span>}
                      </div>
                      <dl className="treatment-plan__meta">
                        <div>
                          <dt>Why</dt>
                          <dd>{rec.reason}</dd>
                        </div>
                        <div>
                          <dt>Expected result</dt>
                          <dd>{rec.expectedResult}</dd>
                        </div>
                        <div>
                          <dt>Priority</dt>
                          <dd>
                            <span className={`recommendation__priority recommendation__priority--${recPriority(rec)}`}>
                              {formatPriority(recPriority(rec))}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>Pump</dt>
                          <dd>{rec.pumpRuntime}</dd>
                        </div>
                        <div>
                          <dt>Wait</dt>
                          <dd>{rec.waitTime}</dd>
                        </div>
                        <div>
                          <dt>Retest</dt>
                          <dd>{rec.retestNote}</dd>
                        </div>
                      </dl>
                      {renderIntegrationExtras(rec)}
                      {rec.warnings?.map((warning) => (
                        <p key={warning} className="treatment-plan__warning">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {index < plan.length - 1 && (
                  <span className="treatment-plan__connector" aria-hidden="true">
                    ↓
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <ol className="recommendations">
      {enriched.map((rec) => (
        <li key={rec.order} className="recommendation">
          <label className="recommendation__check">
            <input
              type="checkbox"
              checked={completed.has(rec.order)}
              onChange={() => toggleStep(rec.order)}
              aria-label={`Mark recommendation ${rec.order} complete`}
            />
          </label>
          <div className="recommendation__step">{rec.order}</div>
          <div className="recommendation__content">
            <header className="recommendation__header">
              <div>
                <strong>{rec.chemical}</strong>
                <span className={`recommendation__priority recommendation__priority--${recPriority(rec)}`}>
                  {formatPriority(recPriority(rec))} priority
                </span>
              </div>
              <span className="recommendation__amount">
                {rec.amount}
                {rec.unit ? ` ${rec.unit}` : ''}
              </span>
            </header>
            <p className="recommendation__reason">{rec.reason}</p>
            <p className="recommendation__expected">
              <strong>Expected:</strong> {rec.expectedResult}
            </p>
            {renderIntegrationExtras(rec)}
            <dl className="recommendation__meta">
              <div>
                <dt>Wait time</dt>
                <dd>{rec.waitTime}</dd>
              </div>
              <div>
                <dt>Pump runtime</dt>
                <dd>{rec.pumpRuntime}</dd>
              </div>
              <div>
                <dt>Retest</dt>
                <dd>{rec.retestNote}</dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}
