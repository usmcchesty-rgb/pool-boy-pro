import { analyzeTest } from '../chemistry/recommendations';
import type {
  AppSettings,
  PoolInfo,
  StripPadReading,
  StripTestMetadata,
  StripCaptureMethod,
  WaterTest,
} from '../models/types';
import { createWaterTest } from './testService';
import type { StripBrandDefinition, StripPadSelections } from '../strip/types';
import { stripSelectionsToWaterReadings } from '../strip/stripReadings';
import {
  getOverallStripConfidence,
  confidenceToAccuracyLevel,
} from '../strip/stripConfidence';
import type { PadMatchResult, ScanProcessResult } from '../strip/scanner/types';

export interface CreateStripTestOptions {
  notes?: string;
  captureMethod?: StripCaptureMethod;
  limitationsAcknowledged?: boolean;
  scanMatches?: PadMatchResult[];
  captureQuality?: ScanProcessResult['quality'];
  overallConfidence?: number;
}

function buildPadReadings(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  captureMethod: StripCaptureMethod,
  scanMatches?: PadMatchResult[]
): StripPadReading[] {
  if (scanMatches && scanMatches.length > 0) {
    return scanMatches.map((m) => {
      const selected = selections[m.padId] ?? m.proposedValue;
      const manuallyEdited = selected !== m.proposedValue;
      const confidence = manuallyEdited
        ? Math.min(m.confidence, 75)
        : m.confidence;
      return {
        padId: m.padId,
        parameter: brand.pads.find((p) => p.id === m.padId)?.parameter ?? m.padId,
        selectedValue: selected,
        confidence,
        confidenceLevel: confidenceToAccuracyLevel(confidence),
        manuallyEdited,
      };
    });
  }

  const fallbackConfidence =
    captureMethod === 'manual' ? getOverallStripConfidence('manual') : getOverallStripConfidence('camera');
  return brand.pads
    .filter((p) => selections[p.id] !== undefined)
    .map((p) => ({
      padId: p.id,
      parameter: p.parameter,
      selectedValue: selections[p.id]!,
      confidence: fallbackConfidence,
      confidenceLevel: confidenceToAccuracyLevel(fallbackConfidence),
    }));
}

/** Create a water test from strip pad chart selections using the shared chemistry engine */
export function createStripWaterTest(
  brand: StripBrandDefinition,
  selections: StripPadSelections,
  pool: PoolInfo,
  settings: AppSettings,
  options: CreateStripTestOptions = {}
): WaterTest {
  const captureMethod = options.captureMethod ?? 'manual';
  const readings = stripSelectionsToWaterReadings(brand, selections, settings);
  const base = createWaterTest(readings, pool, settings, options.notes);
  const overallConfidence =
    options.overallConfidence ??
    (captureMethod === 'camera_verified'
      ? options.scanMatches
        ? Math.round(
            Math.min(...options.scanMatches.map((m) => m.confidence)) * 0.6 +
              options.scanMatches.reduce((s, m) => s + m.confidence, 0) /
                options.scanMatches.length *
                0.4
          )
        : getOverallStripConfidence('camera')
      : getOverallStripConfidence(captureMethod === 'manual' ? 'manual' : 'camera'));

  const stripMetadata: StripTestMetadata = {
    brandId: brand.id,
    manufacturer: brand.manufacturer,
    productName: brand.productName,
    testSource: 'test_strip',
    captureMethod,
    overallConfidence,
    accuracyLevel: confidenceToAccuracyLevel(overallConfidence),
    limitationsAcknowledged: options.limitationsAcknowledged ?? true,
    padReadings: buildPadReadings(brand, selections, captureMethod, options.scanMatches),
    captureQuality: options.captureQuality,
  };

  return {
    ...base,
    testSource: 'test_strip',
    stripMetadata,
    analysis: analyzeTest(readings, pool, settings.chemicalStrengths),
  };
}
