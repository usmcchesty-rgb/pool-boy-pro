import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  calcBakingSoda,
  calcCalciumChloride,
  calcCyanuricAcid,
  calcDryAcid,
  calcHouseholdBleach,
  calcLiquidChlorine,
  calcMuriaticAcidPh,
  calcMuriaticAcidTa,
  calcSalt,
  calcSodaAsh,
  getVolumeGallons,
} from '../chemistry/calculator';
import { getCalculatorGuidance } from '../chemistry/calcGuidance';
import { getCalcStrengthInfo, STRENGTH_FIELD_META } from '../chemistry/strengthConfig';
import { poolFromSettings } from '../services/testService';
import { PageHeader } from '../components/layout/PageHeader';

type CalcType =
  | 'liquidChlorine'
  | 'householdBleach'
  | 'bakingSoda'
  | 'sodaAsh'
  | 'muriaticAcidPh'
  | 'muriaticAcidTa'
  | 'dryAcid'
  | 'calciumChloride'
  | 'cyanuricAcid'
  | 'salt';

const CALC_OPTIONS: { value: CalcType; label: string; currentLabel: string; targetLabel: string; unit: string }[] = [
  { value: 'liquidChlorine', label: 'Liquid Chlorine', currentLabel: 'Current Free Chlorine', targetLabel: 'Target Free Chlorine', unit: 'ppm' },
  { value: 'householdBleach', label: 'Household Bleach', currentLabel: 'Current Free Chlorine', targetLabel: 'Target Free Chlorine', unit: 'ppm' },
  { value: 'bakingSoda', label: 'Baking Soda', currentLabel: 'Current Alkalinity', targetLabel: 'Target Alkalinity', unit: 'ppm' },
  { value: 'sodaAsh', label: 'Soda Ash', currentLabel: 'Current pH', targetLabel: 'Target pH', unit: '' },
  { value: 'muriaticAcidPh', label: 'Muriatic Acid (pH)', currentLabel: 'Current pH', targetLabel: 'Target pH', unit: '' },
  { value: 'muriaticAcidTa', label: 'Muriatic Acid (TA)', currentLabel: 'Current Alkalinity', targetLabel: 'Target Alkalinity', unit: 'ppm' },
  { value: 'dryAcid', label: 'Dry Acid', currentLabel: 'Current pH', targetLabel: 'Target pH', unit: '' },
  { value: 'calciumChloride', label: 'Calcium Chloride', currentLabel: 'Current Hardness', targetLabel: 'Target Hardness', unit: 'ppm' },
  { value: 'cyanuricAcid', label: 'Cyanuric Acid / Stabilizer', currentLabel: 'Current CYA', targetLabel: 'Target CYA', unit: 'ppm' },
  { value: 'salt', label: 'Pool Salt', currentLabel: 'Current Salt', targetLabel: 'Target Salt', unit: 'ppm' },
];

export function CalculatorPage() {
  const { settings } = useApp();
  const pool = poolFromSettings(settings);
  const [calcType, setCalcType] = useState<CalcType>('liquidChlorine');
  const [volume, setVolume] = useState(pool.volume);
  const [volumeUnit, setVolumeUnit] = useState(pool.volumeUnit);
  const [current, setCurrent] = useState(0);
  const [target, setTarget] = useState(0);

  const option = CALC_OPTIONS.find((o) => o.value === calcType)!;
  const gallons = getVolumeGallons({ volume, volumeUnit, strengths: settings.chemicalStrengths });
  const s = settings.chemicalStrengths;

  function calculate() {
    switch (calcType) {
      case 'liquidChlorine':
        return calcLiquidChlorine(current, target, gallons, s.liquidChlorine);
      case 'householdBleach':
        return calcHouseholdBleach(current, target, gallons, s.householdBleach);
      case 'bakingSoda':
        return calcBakingSoda(current, target, gallons, s.bakingSoda);
      case 'sodaAsh':
        return calcSodaAsh(current, target, gallons, s.sodaAsh);
      case 'muriaticAcidPh':
        return calcMuriaticAcidPh(current, target, gallons, s.muriaticAcid);
      case 'muriaticAcidTa':
        return calcMuriaticAcidTa(current, target, gallons, s.muriaticAcid);
      case 'dryAcid':
        return calcDryAcid(current, target, gallons, s.dryAcid);
      case 'calciumChloride':
        return calcCalciumChloride(current, target, gallons, s.calciumChloride);
      case 'cyanuricAcid':
        return calcCyanuricAcid(current, target, gallons, s.cyanuricAcid);
      case 'salt':
        return calcSalt(current, target, gallons, s.salt);
    }
  }

  const result = calculate();
  const guidance = getCalculatorGuidance(calcType);
  const strengthInfo = getCalcStrengthInfo(calcType, s);
  const isLowering =
    calcType.includes('Acid') || calcType === 'muriaticAcidTa';
  const targetValid = isLowering ? target < current : target > current;
  const formatValue = (value: number) =>
    option.unit ? `${value} ${option.unit}` : value.toFixed(1);

  return (
    <div className="page calculator">
      <PageHeader
        title="Chemical Calculator"
        subtitle="Calculate precise dosing amounts"
      />

      <div className="calculator-layout">
        <Card title="Calculator">
          <div className="form-grid">
            <Select
              label="Chemical"
              value={calcType}
              onChange={(e) => setCalcType(e.target.value as CalcType)}
            >
              {CALC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Input
              label="Pool Volume"
              type="number"
              min={1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <Select
              label="Volume Unit"
              value={volumeUnit}
              onChange={(e) => setVolumeUnit(e.target.value as typeof volumeUnit)}
            >
              <option value="gallons">Gallons</option>
              <option value="liters">Liters</option>
            </Select>
            <Input
              label={option.currentLabel}
              type="number"
              step={calcType.includes('ph') || calcType === 'sodaAsh' || calcType === 'muriaticAcidPh' || calcType === 'dryAcid' ? 0.1 : 1}
              value={current}
              onChange={(e) => setCurrent(Number(e.target.value))}
              unit={option.unit}
            />
            <Input
              label={option.targetLabel}
              type="number"
              step={calcType.includes('ph') || calcType === 'sodaAsh' || calcType === 'muriaticAcidPh' || calcType === 'dryAcid' ? 0.1 : 1}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              unit={option.unit}
            />
          </div>
        </Card>

        <Card title="Result">
          {strengthInfo?.validation.level !== 'ok' && (
            <p
              className={`calc-result__strength-warning calc-result__strength-warning--${strengthInfo?.validation.level}`}
              role="alert"
            >
              {strengthInfo?.validation.message}
            </p>
          )}
          {result ? (
            <div className="calc-result">
              <p className="calc-result__amount">{result.displayAmount}</p>
              <p className="calc-result__unit">{result.unit}</p>
              <p className="calc-result__chemical">{result.chemical}</p>
              <dl className="calc-result__guidance">
                <div>
                  <dt>Target adjustment</dt>
                  <dd>
                    {formatValue(current)} → {formatValue(target)}
                  </dd>
                </div>
                {strengthInfo && (
                  <div>
                    <dt>Product strength used</dt>
                    <dd>
                      {strengthInfo.label}: {strengthInfo.value}%
                      {strengthInfo.formulaReference !== strengthInfo.value && (
                        <> (scaled from {strengthInfo.formulaReference}% reference)</>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Expected result</dt>
                  <dd>
                    {guidance.expectedResult} Target: {formatValue(target)}.
                  </dd>
                </div>
                <div>
                  <dt>Pump runtime</dt>
                  <dd>{guidance.pumpRuntime}</dd>
                </div>
                <div>
                  <dt>Wait time</dt>
                  <dd>{guidance.waitTime}</dd>
                </div>
                <div>
                  <dt>Retest</dt>
                  <dd>{guidance.retestNote}</dd>
                </div>
              </dl>
              {guidance.safetyNote && (
                <p className="calc-result__safety">{guidance.safetyNote}</p>
              )}
              <p className="calc-result__note">
                Based on {volume.toLocaleString()} {volumeUnit}.
                Adjust strengths in Settings to match your product labels.
              </p>
            </div>
          ) : (
            <p className="calc-result__empty">
              {strengthInfo?.validation.level === 'missing'
                ? 'Set a valid product strength in Settings to calculate dosing.'
                : targetValid
                  ? 'No dose needed — current already meets or exceeds target.'
                  : `Target must be ${isLowering ? 'lower' : 'higher'} than current value.`}
            </p>
          )}
        </Card>

        <Card title="Chemical Strengths" className="calculator-strengths">
          <p className="field__hint">Customize in Settings. Saved values used by calculator and recommendations:</p>
          <dl className="strength-dl">
            {STRENGTH_FIELD_META.map(({ key, label }) => (
              <div key={key}>
                <dt>{label.replace(' (%)', '')}</dt>
                <dd>{s[key]}%</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
