import type { PoolInfo } from '../../models/types';
import type { TaylorTestInputs, TaylorTestStep } from '../../models/taylorKit';
import { isSaltSanitizer } from '../../models/taylorKit';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { CalculatedResult } from './TaylorGuide';
import {
  getAcidBaseDemandExplanation,
  getAcidBaseDemandOffer,
  getCombinedChlorineClearMessage,
  getFcNoPinkHelpItems,
  shouldShowAcidDemand,
  shouldShowBaseDemand,
} from '../../utilities/taylorGuidance';
import {
  calculateCombinedChlorine,
  calculateFreeChlorine,
  calculateCalciumHardnessFromDrops,
  calculateTotalAlkalinityFromDrops,
  formatFasDpdFormula,
} from '../../chemistry/taylorKit';
import { formatVolume } from '../../utilities/units';
import { formatNumericInputValue, parseNumericInput } from '../../utilities/numericInput';

export interface TaylorStepFieldsProps {
  step: TaylorTestStep;
  inputs: TaylorTestInputs;
  pool: PoolInfo;
  errors: Record<string, string>;
  onUpdateInputs: (patch: Partial<TaylorTestInputs>) => void;
  onUpdatePool: (patch: Partial<PoolInfo>) => void;
  compact?: boolean;
  onRequestHelp?: () => void;
}

function poolVolumeValue(volume: number): number | undefined {
  return Number.isNaN(volume) ? undefined : volume;
}

/** Shared field groups for wizard steps and inline review editing. */
export function TaylorStepFields({
  step,
  inputs,
  pool,
  errors,
  onUpdateInputs,
  onUpdatePool,
  compact,
  onRequestHelp,
}: TaylorStepFieldsProps) {
  const fcPpm =
    inputs.fcDropCount !== undefined
      ? calculateFreeChlorine(inputs.fcDropCount, inputs.sampleSizeMl)
      : null;
  const ccPpm =
    inputs.ccDropCount !== undefined
      ? calculateCombinedChlorine(inputs.ccDropCount, inputs.sampleSizeMl)
      : null;
  const taPpm =
    inputs.totalAlkalinityMode === 'drops'
      ? inputs.totalAlkalinityDrops !== undefined
        ? calculateTotalAlkalinityFromDrops(inputs.totalAlkalinityDrops)
        : null
      : inputs.totalAlkalinityPpm ?? null;
  const chPpm =
    inputs.calciumHardnessMode === 'drops'
      ? inputs.calciumHardnessDrops !== undefined
        ? calculateCalciumHardnessFromDrops(inputs.calciumHardnessDrops)
        : null
      : inputs.calciumHardnessPpm ?? null;

  switch (step) {
    case 'pool':
      return (
        <div className="form-grid">
          <Input
            label="Pool Volume"
            type="number"
            min={1}
            value={formatNumericInputValue(poolVolumeValue(pool.volume))}
            onChange={(e) => {
              const value = parseNumericInput(e.target.value);
              onUpdatePool({ volume: value === undefined ? NaN : value });
            }}
            unit={pool.volumeUnit}
            error={errors.volume}
          />
          <Select
            label="Volume Unit"
            value={pool.volumeUnit}
            onChange={(e) => onUpdatePool({ volumeUnit: e.target.value as PoolInfo['volumeUnit'] })}
          >
            <option value="gallons">Gallons</option>
            <option value="liters">Liters</option>
          </Select>
          <Select
            label="Pool Type"
            value={pool.poolType}
            onChange={(e) => onUpdatePool({ poolType: e.target.value as PoolInfo['poolType'] })}
          >
            <option value="inground">In-Ground</option>
            <option value="above_ground">Above Ground</option>
            <option value="spa">Spa / Hot Tub</option>
          </Select>
          <Select
            label="Sanitizer Type"
            value={pool.sanitizerType}
            onChange={(e) => {
              const sanitizerType = e.target.value as PoolInfo['sanitizerType'];
              onUpdatePool({ sanitizerType });
              if (isSaltSanitizer(sanitizerType)) {
                onUpdateInputs({ saltSkipped: false });
              } else {
                onUpdateInputs({ salt: undefined, saltSkipped: false });
              }
            }}
          >
            <option value="salt">Salt (SWG)</option>
            <option value="chlorine">Traditional Chlorine</option>
            <option value="bromine">Bromine</option>
          </Select>
          <Input
            label="Water Temperature"
            type="number"
            step={0.5}
            min={inputs.temperatureUnit === 'celsius' ? 0 : 32}
            max={inputs.temperatureUnit === 'celsius' ? 43 : 110}
            value={formatNumericInputValue(inputs.temperature)}
            onChange={(e) => onUpdateInputs({ temperature: parseNumericInput(e.target.value) })}
            error={errors.temperature}
          />
          <Select
            label="Temperature Unit"
            value={inputs.temperatureUnit}
            onChange={(e) =>
              onUpdateInputs({ temperatureUnit: e.target.value as TaylorTestInputs['temperatureUnit'] })
            }
          >
            <option value="fahrenheit">Fahrenheit (°F)</option>
            <option value="celsius">Celsius (°C)</option>
          </Select>
        </div>
      );

    case 'freeChlorine':
      return (
        <>
          <div className="form-grid">
            <Select
              label="Sample Size"
              value={inputs.sampleSizeMl}
              onChange={(e) =>
                onUpdateInputs({ sampleSizeMl: Number(e.target.value) as TaylorTestInputs['sampleSizeMl'] })
              }
              hint="Use the same sample size for free and combined chlorine."
            >
              <option value={10}>10 mL (each drop = 0.5 ppm)</option>
              <option value={25}>25 mL (each drop = 0.2 ppm)</option>
            </Select>
            <Input
              label="R-0871 Drop Count"
              type="number"
              min={0}
              step={1}
              value={formatNumericInputValue(inputs.fcDropCount)}
              onChange={(e) => onUpdateInputs({ fcDropCount: parseNumericInput(e.target.value) })}
              unit="drops"
              error={errors.fcDropCount}
              hint="Keep adding one drop at a time while gently swirling the tube after each drop."
            />
          </div>
          {!compact && (
            <div className="taylor-interactive">
              <p className="taylor-interactive__prompt">
                Sample never turned pink after adding R-0870 powder?
              </p>
              <ul className="taylor-interactive__help-list">
                {getFcNoPinkHelpItems().map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="taylor-interactive__actions">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => onUpdateInputs({ fcDropCount: undefined })}
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => onUpdateInputs({ fcDropCount: 0 })}
                >
                  Continue with 0 ppm
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={onRequestHelp}>
                  Help
                </Button>
              </div>
            </div>
          )}
          {!compact && fcPpm !== null && (
            <CalculatedResult
              label="Calculated Free Chlorine"
              value={`${fcPpm.toFixed(fcPpm % 1 === 0 ? 0 : 1)} ppm`}
              formula={`${inputs.fcDropCount} drops × ${inputs.sampleSizeMl === 10 ? 0.5 : 0.2} = ${fcPpm.toFixed(1)} ppm`}
            />
          )}
        </>
      );

    case 'combinedChlorine':
      return (
        <>
          {!compact && (
            <p className="taylor-note">
              Using the same {inputs.sampleSizeMl} mL sample ({formatFasDpdFormula(inputs.sampleSizeMl)}).
            </p>
          )}
          {!compact && (
            <div className="taylor-interactive">
              <p className="taylor-interactive__prompt">
                After adding 5 drops R-0003 and mixing for 10 seconds, did the sample turn pink?
              </p>
              <div className="taylor-interactive__actions">
                <Button
                  size="sm"
                  variant={!inputs.ccSampleStayedClear ? 'primary' : 'secondary'}
                  type="button"
                  onClick={() =>
                    onUpdateInputs({ ccSampleStayedClear: false, ccDropCount: inputs.ccDropCount ?? undefined })
                  }
                >
                  Yes — continue titrating
                </Button>
                <Button
                  size="sm"
                  variant={inputs.ccSampleStayedClear ? 'primary' : 'secondary'}
                  type="button"
                  onClick={() => onUpdateInputs({ ccSampleStayedClear: true, ccDropCount: 0 })}
                >
                  No — stayed clear
                </Button>
              </div>
            </div>
          )}
          {inputs.ccSampleStayedClear && !compact && (
            <div className="taylor-success taylor-success--inline" role="status">
              {getCombinedChlorineClearMessage().split('\n\n').map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {!inputs.ccSampleStayedClear && (
            <div className="form-grid">
              <Input
                label="Additional R-0871 Drops (after R-0003)"
                type="number"
                min={0}
                step={1}
                value={formatNumericInputValue(inputs.ccDropCount)}
                onChange={(e) =>
                  onUpdateInputs({
                    ccSampleStayedClear: false,
                    ccDropCount: parseNumericInput(e.target.value),
                  })
                }
                unit="drops"
                error={errors.ccDropCount}
                hint="Count only drops added after R-0003, swirling after each drop."
              />
            </div>
          )}
          {!compact && !inputs.ccSampleStayedClear && ccPpm !== null && (
            <CalculatedResult
              label="Calculated Combined Chlorine"
              value={`${ccPpm.toFixed(ccPpm % 1 === 0 ? 0 : 1)} ppm`}
              formula={`${inputs.ccDropCount} drops × ${inputs.sampleSizeMl === 10 ? 0.5 : 0.2} = ${ccPpm.toFixed(1)} ppm`}
            />
          )}
        </>
      );

    case 'ph': {
      const demandOffer = getAcidBaseDemandOffer(inputs.ph, pool);
      return (
        <>
          <div className="form-grid">
            <Input
              label="Measured pH"
              type="number"
              step={0.1}
              min={6.8}
              max={8.4}
              value={formatNumericInputValue(inputs.ph)}
              onChange={(e) => {
                const ph = parseNumericInput(e.target.value);
                const offer = getAcidBaseDemandOffer(ph, pool);
                const patch: Partial<TaylorTestInputs> = { ph };
                if (offer === 'in_range') {
                  patch.acidDemand = undefined;
                  patch.baseDemand = undefined;
                } else if (offer === 'acid') {
                  patch.baseDemand = undefined;
                } else if (offer === 'base') {
                  patch.acidDemand = undefined;
                }
                onUpdateInputs(patch);
              }}
              error={errors.ph}
            />
          </div>
          {demandOffer === 'in_range' && !compact && (
            <div className="taylor-info-banner" role="status">
              {getAcidBaseDemandExplanation('in_range').split('\n\n').map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {shouldShowBaseDemand(demandOffer) && (
            <>
              {!compact && (
                <p className="taylor-note">{getAcidBaseDemandExplanation('base')}</p>
              )}
              <div className="form-grid">
                <Input
                  label="Base Demand (optional)"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={formatNumericInputValue(inputs.baseDemand)}
                  onChange={(e) => onUpdateInputs({ baseDemand: parseNumericInput(e.target.value) })}
                  unit="drops R-0016"
                  error={errors.baseDemand}
                  hint="Optional — estimates soda ash needed to raise pH."
                />
              </div>
            </>
          )}
          {shouldShowAcidDemand(demandOffer) && (
            <>
              {!compact && (
                <p className="taylor-note">{getAcidBaseDemandExplanation('acid')}</p>
              )}
              <div className="form-grid">
                <Input
                  label="Acid Demand (optional)"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={formatNumericInputValue(inputs.acidDemand)}
                  onChange={(e) => onUpdateInputs({ acidDemand: parseNumericInput(e.target.value) })}
                  unit="drops R-0015"
                  error={errors.acidDemand}
                  hint="Optional — estimates muriatic acid needed to lower pH."
                />
              </div>
            </>
          )}
        </>
      );
    }

    case 'totalAlkalinity':
      return (
        <>
          <Select
            label="Entry Method"
            value={inputs.totalAlkalinityMode}
            onChange={(e) =>
              onUpdateInputs({ totalAlkalinityMode: e.target.value as TaylorTestInputs['totalAlkalinityMode'] })
            }
          >
            <option value="drops">From R-0009 drop count</option>
            <option value="ppm">Enter ppm directly</option>
          </Select>
          <div className="form-grid">
            {inputs.totalAlkalinityMode === 'drops' ? (
              <Input
                label="R-0009 Drop Count"
                type="number"
                min={1}
                step={1}
                value={formatNumericInputValue(inputs.totalAlkalinityDrops)}
                onChange={(e) =>
                  onUpdateInputs({ totalAlkalinityDrops: parseNumericInput(e.target.value) })
                }
                unit="drops"
                error={errors.totalAlkalinityDrops}
              />
            ) : (
              <Input
                label="Total Alkalinity"
                type="number"
                min={0}
                max={300}
                step={10}
                value={formatNumericInputValue(inputs.totalAlkalinityPpm)}
                onChange={(e) =>
                  onUpdateInputs({ totalAlkalinityPpm: parseNumericInput(e.target.value) })
                }
                unit="ppm"
                error={errors.totalAlkalinityPpm}
              />
            )}
          </div>
          {!compact && inputs.totalAlkalinityMode === 'drops' && taPpm !== null && (
            <CalculatedResult
              label="Calculated Total Alkalinity"
              value={`${taPpm} ppm`}
              formula={`${inputs.totalAlkalinityDrops} drops × 10 = ${taPpm} ppm`}
            />
          )}
        </>
      );

    case 'calciumHardness':
      return (
        <>
          <Select
            label="Entry Method"
            value={inputs.calciumHardnessMode}
            onChange={(e) =>
              onUpdateInputs({ calciumHardnessMode: e.target.value as TaylorTestInputs['calciumHardnessMode'] })
            }
          >
            <option value="drops">From R-0012 drop count</option>
            <option value="ppm">Enter ppm directly</option>
          </Select>
          <div className="form-grid">
            {inputs.calciumHardnessMode === 'drops' ? (
              <Input
                label="R-0012 Drop Count"
                type="number"
                min={1}
                step={1}
                value={formatNumericInputValue(inputs.calciumHardnessDrops)}
                onChange={(e) =>
                  onUpdateInputs({ calciumHardnessDrops: parseNumericInput(e.target.value) })
                }
                unit="drops"
                error={errors.calciumHardnessDrops}
              />
            ) : (
              <Input
                label="Calcium Hardness"
                type="number"
                min={0}
                max={1000}
                step={10}
                value={formatNumericInputValue(inputs.calciumHardnessPpm)}
                onChange={(e) =>
                  onUpdateInputs({ calciumHardnessPpm: parseNumericInput(e.target.value) })
                }
                unit="ppm"
                error={errors.calciumHardnessPpm}
              />
            )}
          </div>
          {!compact && inputs.calciumHardnessMode === 'drops' && chPpm !== null && (
            <CalculatedResult
              label="Calculated Calcium Hardness"
              value={`${chPpm} ppm`}
              formula={`${inputs.calciumHardnessDrops} drops × 25 = ${chPpm} ppm`}
            />
          )}
        </>
      );

    case 'cyanuricAcid':
      return (
        <div className="form-grid">
          <Input
            label="Cyanuric Acid"
            type="number"
            min={0}
            max={150}
            step={5}
            value={formatNumericInputValue(inputs.cyanuricAcid)}
            onChange={(e) => onUpdateInputs({ cyanuricAcid: parseNumericInput(e.target.value) })}
            unit="ppm"
            error={errors.cyanuricAcid}
          />
        </div>
      );

    case 'salt':
      return (
        <div className="form-grid">
          {!isSaltSanitizer(pool.sanitizerType) && (
            <p className="taylor-note taylor-note--optional">
              Salt testing is optional for {pool.sanitizerType} pools. Enter a value or leave skipped.
            </p>
          )}
          {inputs.saltSkipped && (
            <div className="salt-skipped-banner">
              <p>Salt test was skipped.</p>
              <button
                type="button"
                className="salt-skipped-banner__action"
                onClick={() => onUpdateInputs({ saltSkipped: false })}
              >
                Add salt reading
              </button>
            </div>
          )}
          <Input
            label={isSaltSanitizer(pool.sanitizerType) ? 'Salt Level' : 'Salt Level (optional)'}
            type="number"
            min={0}
            max={6000}
            step={100}
            value={inputs.saltSkipped ? '' : formatNumericInputValue(inputs.salt)}
            onChange={(e) => {
              const value = parseNumericInput(e.target.value);
              if (value === undefined) {
                onUpdateInputs({ salt: undefined, saltSkipped: false });
                return;
              }
              onUpdateInputs({ salt: value, saltSkipped: false });
            }}
            hint={
              inputs.saltSkipped
                ? 'Click “Add salt reading” or enter a value to record salt.'
                : 'Ideal for salt pools: 2700–3400 ppm.'
            }
            unit="ppm"
            error={errors.salt}
          />
        </div>
      );

    default:
      return null;
  }
}

export function getReviewSummaryValue(
  step: TaylorTestStep,
  inputs: TaylorTestInputs,
  pool: PoolInfo,
  readings: ReturnType<typeof import('../../chemistry/taylorKit').buildReadingsFromTaylorInputs>
): string {
  switch (step) {
    case 'pool':
      return `${formatVolume(pool.volume, pool.volumeUnit)} · ${pool.sanitizerType}`;
    case 'freeChlorine':
      return `${readings.freeChlorine.toFixed(1)} ppm`;
    case 'combinedChlorine':
      return `${readings.combinedChlorine.toFixed(1)} ppm`;
    case 'ph':
      return readings.ph.toFixed(1);
    case 'totalAlkalinity':
      return `${readings.totalAlkalinity} ppm`;
    case 'calciumHardness':
      return `${readings.calciumHardness} ppm`;
    case 'cyanuricAcid':
      return `${readings.cyanuricAcid} ppm`;
    case 'salt':
      if (inputs.saltSkipped) {
        return 'Skipped — tap Edit to add a reading';
      }
      return `${readings.salt} ppm`;
    default:
      return '';
  }
}
