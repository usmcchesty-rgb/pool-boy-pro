/** sRGB [0-255] to CIELAB for perceptual color distance */

export type Rgb = [number, number, number];
export type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Convert sRGB to CIE XYZ (D65) */
export function rgbToXyz(rgb: Rgb): [number, number, number] {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ];
}

/** Convert XYZ to CIELAB (D65 reference white) */
export function xyzToLab(xyz: [number, number, number]): Lab {
  const ref: [number, number, number] = [0.95047, 1.0, 1.08883];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(xyz[0] / ref[0]);
  const fy = f(xyz[1] / ref[1]);
  const fz = f(xyz[2] / ref[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToLab(rgb: Rgb): Lab {
  return xyzToLab(rgbToXyz(rgb));
}

/** CIE76 ΔE — lower is a closer perceptual match */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/**
 * CIEDE2000 color difference — more perceptually uniform than CIE76.
 * Reference: Sharma, Wu, Dalal (2005)
 */
export function deltaE2000(a: Lab, b: Lab): number {
  const [L1, a1, b1] = a;
  const [L2, a2, b2] = b;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;

  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  const h1pn = h1p >= 0 ? h1p : h1p + 360;
  const h2pn = h2p >= 0 ? h2p : h2p + 360;

  let dhp = h2pn - h1pn;
  if (Math.abs(dhp) > 180) dhp += dhp > 0 ? -360 : 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  let avgHp = h1pn + h2pn;
  if (Math.abs(h1pn - h2pn) > 180) avgHp += 360;
  avgHp /= 2;
  if (avgHp >= 360) avgHp -= 360;

  const T =
    1 -
    0.17 * Math.cos((avgHp - 30) * (Math.PI / 180)) +
    0.24 * Math.cos(2 * avgHp * (Math.PI / 180)) +
    0.32 * Math.cos((3 * avgHp + 6) * (Math.PI / 180)) -
    0.2 * Math.cos((4 * avgHp - 63) * (Math.PI / 180));

  const SL = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2);
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const RT =
    -2 *
    Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7))) *
    Math.sin(60 * Math.exp(-Math.pow((avgHp - 275) / 25, 2)) * (Math.PI / 180));

  const dLpSL = dLp / SL;
  const dCpSC = dCp / SC;
  const dHpSH = dHp / SH;

  return Math.sqrt(dLpSL ** 2 + dCpSC ** 2 + dHpSH ** 2 + RT * dCpSC * dHpSH);
}

/** Default perceptual distance for strip matching */
export function colorDistance(a: Lab, b: Lab): number {
  return deltaE2000(a, b);
}

/** Relative luminance 0–1 from sRGB */
export function luminance(rgb: Rgb): number {
  const [, y] = rgbToXyz(rgb);
  return y;
}

/** Mean luminance of pixel array (0–1) */
export function meanLuminance(pixels: Uint8ClampedArray): number {
  let sum = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += luminance([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Apply brightness normalization toward a target mid-luminance.
 * Returns adjusted RGB; does not mutate input.
 */
export function normalizeBrightness(rgb: Rgb, factor: number): Rgb {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [clamp(rgb[0] * factor), clamp(rgb[1] * factor), clamp(rgb[2] * factor)];
}

/**
 * White-balance normalize using a neutral reference sample.
 * Scales each channel so the reference averages toward mid-gray.
 */
export function whiteBalanceFromReference(
  rgb: Rgb,
  reference: Rgb
): { normalized: Rgb; confidence: number } {
  const refAvg = (reference[0] + reference[1] + reference[2]) / 3;
  if (refAvg < 20 || refAvg > 235) {
    return { normalized: rgb, confidence: 0.3 };
  }
  const target = 128;
  const scale = target / refAvg;
  const factor = Math.max(0.5, Math.min(2.0, scale));
  const normalized = normalizeBrightness(rgb, factor);
  const spread = Math.max(
    Math.abs(reference[0] - refAvg),
    Math.abs(reference[1] - refAvg),
    Math.abs(reference[2] - refAvg)
  );
  const confidence = spread < 30 ? 0.9 : spread < 60 ? 0.7 : 0.5;
  return { normalized, confidence };
}
