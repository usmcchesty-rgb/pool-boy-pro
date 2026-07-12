/**
 * Clorox salt strip scale reading → ppm conversion.
 *
 * Chart ppm anchors match CLOROX_SALT_POOL_STRIP salt pad scaleValues.
 * Scale numbers (2, 4, 6, 8, 10) correspond to bottle chart positions.
 *
 * REQUIRES PHYSICAL BOTTLE VERIFICATION for intermediate interpolated values.
 */
export interface SaltScaleAnchor {
  scale: number;
  ppm: number;
  /** True when confirmed against physical bottle chart */
  bottleVerified: boolean;
}

export const CLOROX_SALT_SCALE_ANCHORS: SaltScaleAnchor[] = [
  { scale: 0, ppm: 500, bottleVerified: false },
  { scale: 2, ppm: 1000, bottleVerified: true },
  { scale: 4, ppm: 2000, bottleVerified: true },
  { scale: 6, ppm: 3000, bottleVerified: true },
  { scale: 8, ppm: 4000, bottleVerified: true },
  { scale: 10, ppm: 5000, bottleVerified: true },
];

export const SALT_SCALE_REQUIRES_BOTTLE_VERIFICATION = CLOROX_SALT_SCALE_ANCHORS.some(
  (a) => !a.bottleVerified
);

/** Convert a salt strip scale reading to ppm using linear interpolation between anchors */
export function saltScaleToPpm(scaleReading: number): number {
  const anchors = [...CLOROX_SALT_SCALE_ANCHORS].sort((a, b) => a.scale - b.scale);
  if (scaleReading <= anchors[0].scale) return anchors[0].ppm;
  if (scaleReading >= anchors[anchors.length - 1].scale) return anchors[anchors.length - 1].ppm;

  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (scaleReading >= lo.scale && scaleReading <= hi.scale) {
      const t = (scaleReading - lo.scale) / (hi.scale - lo.scale);
      return Math.round(lo.ppm + t * (hi.ppm - lo.ppm));
    }
  }

  return anchors[anchors.length - 1].ppm;
}

/** Nearest bottle chart ppm for direct picker fallback */
export function nearestSaltChartPpm(ppm: number): number {
  const chart = CLOROX_SALT_SCALE_ANCHORS.map((a) => a.ppm);
  return chart.reduce((best, v) => (Math.abs(v - ppm) < Math.abs(best - ppm) ? v : best), chart[0]);
}
