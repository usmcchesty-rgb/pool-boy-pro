import { getActiveAnchorsForMatching } from '../calibration/anchorProvider';
import type { Rgb } from './colorScience';
import type { PadRoi, ScanTargetConfig } from './types';

/**
 * Approximate bottle-chart anchor colors for Clorox Salt Pool strips.
 * Used for camera color matching — not laboratory calibration.
 */
export const CLOROX_COLOR_ANCHORS: Record<string, Array<{ value: number; rgb: Rgb }>> = {
  totalHardness: [
    { value: 0, rgb: [240, 248, 255] },
    { value: 100, rgb: [180, 210, 240] },
    { value: 250, rgb: [100, 160, 220] },
    { value: 500, rgb: [50, 100, 180] },
    { value: 1000, rgb: [20, 50, 120] },
  ],
  totalChlorine: [
    { value: 0, rgb: [255, 255, 255] },
    { value: 1, rgb: [255, 230, 240] },
    { value: 3, rgb: [255, 170, 200] },
    { value: 5, rgb: [240, 100, 150] },
    { value: 10, rgb: [200, 40, 100] },
  ],
  freeChlorine: [
    { value: 0, rgb: [255, 255, 255] },
    { value: 1, rgb: [255, 225, 235] },
    { value: 3, rgb: [255, 160, 190] },
    { value: 5, rgb: [235, 90, 140] },
    { value: 10, rgb: [190, 35, 95] },
  ],
  ph: [
    { value: 6.8, rgb: [220, 60, 50] },
    { value: 7.2, rgb: [230, 120, 50] },
    { value: 7.5, rgb: [240, 180, 60] },
    { value: 7.8, rgb: [230, 210, 80] },
    { value: 8.4, rgb: [200, 220, 100] },
  ],
  totalAlkalinity: [
    { value: 0, rgb: [240, 250, 200] },
    { value: 40, rgb: [200, 230, 120] },
    { value: 80, rgb: [140, 200, 80] },
    { value: 120, rgb: [80, 160, 60] },
    { value: 180, rgb: [40, 120, 40] },
    { value: 240, rgb: [20, 80, 30] },
  ],
  cyanuricAcid: [
    { value: 0, rgb: [255, 250, 240] },
    { value: 30, rgb: [240, 220, 180] },
    { value: 50, rgb: [220, 190, 140] },
    { value: 80, rgb: [190, 150, 100] },
    { value: 100, rgb: [160, 120, 70] },
    { value: 150, rgb: [120, 80, 40] },
  ],
  salt: [
    { value: 500, rgb: [240, 230, 210] },
    { value: 1000, rgb: [220, 200, 170] },
    { value: 2000, rgb: [190, 160, 120] },
    { value: 3000, rgb: [150, 120, 80] },
    { value: 4000, rgb: [110, 85, 55] },
    { value: 5000, rgb: [70, 50, 30] },
  ],
};

/** Six-way strip pad ROIs within the alignment guide (normalized 0–1) */
const SIX_WAY_PAD_ROIS: PadRoi[] = [
  { padId: 'totalHardness', x: 0.32, y: 0.04, w: 0.36, h: 0.13 },
  { padId: 'totalChlorine', x: 0.32, y: 0.19, w: 0.36, h: 0.13 },
  { padId: 'freeChlorine', x: 0.32, y: 0.34, w: 0.36, h: 0.13 },
  { padId: 'ph', x: 0.32, y: 0.49, w: 0.36, h: 0.13 },
  { padId: 'totalAlkalinity', x: 0.32, y: 0.64, w: 0.36, h: 0.13 },
  { padId: 'cyanuricAcid', x: 0.32, y: 0.79, w: 0.36, h: 0.13 },
];

/** Salt strip — single pad ROI */
const SALT_PAD_ROIS: PadRoi[] = [
  { padId: 'salt', x: 0.25, y: 0.35, w: 0.5, h: 0.3 },
];

export const CLOROX_SIX_WAY_SCAN_TARGET: ScanTargetConfig = {
  stripType: 'six_way',
  aspectRatio: 0.22,
  padRois: SIX_WAY_PAD_ROIS,
  neutralRoi: { x: 0.05, y: 0.02, w: 0.12, h: 0.08 },
};

export const CLOROX_SALT_SCAN_TARGET: ScanTargetConfig = {
  stripType: 'salt',
  aspectRatio: 0.45,
  padRois: SALT_PAD_ROIS,
  neutralRoi: { x: 0.05, y: 0.05, w: 0.12, h: 0.1 },
};

export function getCloroxScanTarget(stripType: 'six_way' | 'salt'): ScanTargetConfig {
  return stripType === 'salt' ? CLOROX_SALT_SCAN_TARGET : CLOROX_SIX_WAY_SCAN_TARGET;
}

export function getCloroxColorAnchors(padId: string): Array<{ value: number; rgb: Rgb }> {
  return getActiveAnchorsForMatching(padId);
}
