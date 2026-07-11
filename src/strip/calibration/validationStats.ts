import type { PadMatchResult } from '../scanner/types';

export interface ValidationRecord {
  id: string;
  padId: string;
  proposedValue: number;
  confirmedValue: number;
  confidence: number;
  confidenceLevel: string;
  deltaE: number;
  alternateValue?: number;
  alternateDeltaE?: number;
  ambiguous?: boolean;
  anchorSource: string;
  recordedAt: number;
}

export interface PadValidationSummary {
  padId: string;
  totalSamples: number;
  exactMatchPercent: number;
  withinOneStepPercent: number;
  averageConfidence: number;
  falseHighConfidenceCount: number;
  confusionPairs: Array<{ proposed: number; confirmed: number; count: number }>;
}

const VALIDATION_STORAGE_KEY = 'poolBoyPro_stripValidationRecords';

export function loadValidationRecords(): ValidationRecord[] {
  try {
    const raw = localStorage.getItem(VALIDATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ValidationRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveValidationRecord(record: ValidationRecord): void {
  const records = loadValidationRecords();
  records.push(record);
  localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(records));
}

export function clearValidationRecords(): void {
  localStorage.removeItem(VALIDATION_STORAGE_KEY);
}

function chartStepDistance(scaleValues: number[], a: number, b: number): number {
  const ia = scaleValues.indexOf(a);
  const ib = scaleValues.indexOf(b);
  if (ia < 0 || ib < 0) return Infinity;
  return Math.abs(ia - ib);
}

export function computePadValidationSummary(
  padId: string,
  records: ValidationRecord[],
  scaleValues: number[]
): PadValidationSummary {
  const padRecords = records.filter((r) => r.padId === padId);
  if (padRecords.length === 0) {
    return {
      padId,
      totalSamples: 0,
      exactMatchPercent: 0,
      withinOneStepPercent: 0,
      averageConfidence: 0,
      falseHighConfidenceCount: 0,
      confusionPairs: [],
    };
  }

  const exact = padRecords.filter((r) => r.proposedValue === r.confirmedValue).length;
  const withinOne = padRecords.filter(
    (r) => chartStepDistance(scaleValues, r.proposedValue, r.confirmedValue) <= 1
  ).length;

  const falseHigh = padRecords.filter(
    (r) => r.confidenceLevel === 'high' && r.proposedValue !== r.confirmedValue
  ).length;

  const confusionMap = new Map<string, number>();
  for (const r of padRecords) {
    if (r.proposedValue !== r.confirmedValue) {
      const key = `${r.proposedValue}→${r.confirmedValue}`;
      confusionMap.set(key, (confusionMap.get(key) ?? 0) + 1);
    }
  }

  const confusionPairs = [...confusionMap.entries()]
    .map(([key, count]) => {
      const [proposed, confirmed] = key.split('→').map(Number);
      return { proposed, confirmed, count };
    })
    .sort((a, b) => b.count - a.count);

  return {
    padId,
    totalSamples: padRecords.length,
    exactMatchPercent: Math.round((exact / padRecords.length) * 100),
    withinOneStepPercent: Math.round((withinOne / padRecords.length) * 100),
    averageConfidence: Math.round(
      padRecords.reduce((s, r) => s + r.confidence, 0) / padRecords.length
    ),
    falseHighConfidenceCount: falseHigh,
    confusionPairs,
  };
}

export function validationRecordFromMatch(
  match: PadMatchResult,
  confirmedValue: number,
  anchorSource: string
): ValidationRecord {
  return {
    id: `${Date.now()}-${match.padId}`,
    padId: match.padId,
    proposedValue: match.proposedValue,
    confirmedValue,
    confidence: match.confidence,
    confidenceLevel: match.confidenceLevel,
    deltaE: match.deltaE,
    alternateValue: match.alternateValue,
    alternateDeltaE: match.alternateDeltaE,
    ambiguous: match.ambiguous,
    anchorSource,
    recordedAt: Date.now(),
  };
}

export function exportValidationCsv(records: ValidationRecord[]): string {
  const header =
    'padId,proposedValue,confirmedValue,confidence,confidenceLevel,deltaE,ambiguous,anchorSource,recordedAt';
  const rows = records.map(
    (r) =>
      `${r.padId},${r.proposedValue},${r.confirmedValue},${r.confidence},${r.confidenceLevel},${r.deltaE},${r.ambiguous ?? false},${r.anchorSource},${r.recordedAt}`
  );
  return [header, ...rows].join('\n');
}

export function detectFalseHighConfidence(records: ValidationRecord[]): ValidationRecord[] {
  return records.filter(
    (r) => r.confidenceLevel === 'high' && r.proposedValue !== r.confirmedValue
  );
}
