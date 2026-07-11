import { rgbToLab, type Lab, type Rgb } from '../scanner/colorScience';
import type { CalibrationSample, CalibrationSampleStats } from './types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function channelVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

/** Compute aggregate color statistics from accepted calibration samples */
export function aggregateCalibrationSamples(samples: CalibrationSample[]): CalibrationSampleStats | null {
  const accepted = samples.filter((s) => s.accepted);
  if (accepted.length === 0) return null;

  const rs = accepted.map((s) => s.normalizedRgb[0]);
  const gs = accepted.map((s) => s.normalizedRgb[1]);
  const bs = accepted.map((s) => s.normalizedRgb[2]);

  const averageRgb: Rgb = [
    Math.round(rs.reduce((s, v) => s + v, 0) / rs.length),
    Math.round(gs.reduce((s, v) => s + v, 0) / gs.length),
    Math.round(bs.reduce((s, v) => s + v, 0) / bs.length),
  ];

  const medianRgb: Rgb = [median(rs), median(gs), median(bs)];

  const labs = accepted.map((s) => s.lab);
  const avgLab: Lab = [
    labs.reduce((s, l) => s + l[0], 0) / labs.length,
    labs.reduce((s, l) => s + l[1], 0) / labs.length,
    labs.reduce((s, l) => s + l[2], 0) / labs.length,
  ];

  const spreadLab = Math.sqrt(
    labs.reduce((s, l) => s + (l[0] - avgLab[0]) ** 2 + (l[1] - avgLab[1]) ** 2 + (l[2] - avgLab[2]) ** 2, 0) /
      labs.length
  );

  return {
    sampleCount: accepted.length,
    averageRgb,
    medianRgb,
    averageLab: avgLab,
    varianceRgb: [channelVariance(rs), channelVariance(gs), channelVariance(bs)],
    spreadLab,
  };
}

/** Build a calibration anchor entry from aggregated samples */
export function buildAnchorFromSamples(
  _padId: string,
  _chartValue: number,
  samples: CalibrationSample[],
  _sourceDescription: string,
  _deviceNotes?: string
): { referenceRgb: Rgb; referenceLab: Lab; sampleCount: number } | null {
  const stats = aggregateCalibrationSamples(samples);
  if (!stats) return null;

  const referenceRgb = stats.medianRgb;
  return {
    referenceRgb,
    referenceLab: rgbToLab(referenceRgb),
    sampleCount: stats.sampleCount,
  };
}
