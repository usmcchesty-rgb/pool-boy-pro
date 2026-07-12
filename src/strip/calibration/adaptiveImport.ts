import { rgbToLab, type Rgb, type Lab } from '../scanner/colorScience';
import { ADAPTIVE_SCHEMA_VERSION } from './adaptiveConfig';
import type { AdaptiveLearningProfile, VerifiedPadSample } from './adaptiveTypes';
import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';

export interface AdaptiveImportError {
  path: string;
  message: string;
}

const VALID_PAD_IDS = new Set(CLOROX_SALT_POOL_STRIP.pads.map((p) => p.id));
const IMAGE_KEYS = ['image', 'photo', 'frame', 'blob', 'base64', 'screenshot', 'video'];

function isValidRgb(v: unknown): v is Rgb {
  return Array.isArray(v) && v.length === 3 && v.every((c) => typeof c === 'number' && c >= 0 && c <= 255);
}

function isValidLab(v: unknown): v is Lab {
  return Array.isArray(v) && v.length === 3 && v.every((c) => typeof c === 'number' && Number.isFinite(c));
}

function containsImageData(obj: unknown, path = ''): string | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const found = containsImageData(obj[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (IMAGE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      return `${path}.${key}`;
    }
    if (typeof val === 'string' && val.length > 500 && /^[A-Za-z0-9+/=]+$/.test(val.slice(0, 100))) {
      return `${path}.${key} (possible base64)`;
    }
    const found = containsImageData(val, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function validateSample(sample: unknown, index: number, errors: AdaptiveImportError[]): VerifiedPadSample | null {
  const path = `samples[${index}]`;
  if (!sample || typeof sample !== 'object') {
    errors.push({ path, message: 'Sample must be an object' });
    return null;
  }

  const s = sample as Record<string, unknown>;
  const padId = s.padId;
  if (typeof padId !== 'string' || !VALID_PAD_IDS.has(padId)) {
    errors.push({ path: `${path}.padId`, message: 'Invalid padId' });
    return null;
  }

  const padDef = CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === padId)!;
  const confirmedValue = s.confirmedValue;
  if (typeof confirmedValue !== 'number' || !padDef.scaleValues.includes(confirmedValue)) {
    errors.push({ path: `${path}.confirmedValue`, message: 'Invalid chart value' });
    return null;
  }

  if (!isValidRgb(s.rawRgb) || !isValidRgb(s.normalizedRgb)) {
    errors.push({ path, message: 'Invalid RGB values' });
    return null;
  }

  const lab = isValidLab(s.lab) ? s.lab : rgbToLab(s.normalizedRgb as Rgb);
  const reliabilityWeight = typeof s.reliabilityWeight === 'number' ? s.reliabilityWeight : 1;
  if (reliabilityWeight < 0 || reliabilityWeight > 1) {
    errors.push({ path: `${path}.reliabilityWeight`, message: 'Invalid reliability weight' });
    return null;
  }

  return {
    id: typeof s.id === 'string' ? s.id : `imported-${index}`,
    brandId: 'clorox_salt_pool',
    padId,
    confirmedValue,
    rawRgb: s.rawRgb as Rgb,
    normalizedRgb: s.normalizedRgb as Rgb,
    lab,
    deltaEToAnchor: typeof s.deltaEToAnchor === 'number' ? s.deltaEToAnchor : 0,
    quality: (s.quality as VerifiedPadSample['quality']) ?? {
      focusScore: 1,
      lightingScore: 1,
      alignmentScore: 1,
      stabilityScore: 1,
    },
    lightingEstimate: typeof s.lightingEstimate === 'number' ? s.lightingEstimate : 50,
    calibrationSource: typeof s.calibrationSource === 'string' ? s.calibrationSource : 'imported',
    timestamp: typeof s.timestamp === 'number' ? s.timestamp : Date.now(),
    reliabilityWeight,
    deviceCalibrationVersion:
      typeof s.deviceCalibrationVersion === 'string' ? s.deviceCalibrationVersion : 'imported',
    timingExpired: Boolean(s.timingExpired),
    userCorrected: Boolean(s.userCorrected),
    scanSessionId: typeof s.scanSessionId === 'string' ? s.scanSessionId : 'imported',
  };
}

export function validateAdaptiveImport(raw: unknown): {
  valid: boolean;
  errors: AdaptiveImportError[];
  data?: AdaptiveLearningProfile;
} {
  const errors: AdaptiveImportError[] = [];

  const imagePath = containsImageData(raw);
  if (imagePath) {
    errors.push({ path: imagePath, message: 'Image data is not allowed in learning import' });
    return { valid: false, errors };
  }

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: [{ path: '', message: 'Must be a JSON object' }] };
  }

  const data = raw as Record<string, unknown>;
  if (data.version !== ADAPTIVE_SCHEMA_VERSION) {
    errors.push({ path: 'version', message: `Unsupported version (expected ${ADAPTIVE_SCHEMA_VERSION})` });
  }
  if (data.brandId !== 'clorox_salt_pool') {
    errors.push({ path: 'brandId', message: 'Only clorox_salt_pool supported' });
  }
  if (!Array.isArray(data.samples)) {
    errors.push({ path: 'samples', message: 'samples must be an array' });
    return { valid: false, errors };
  }

  const samples: VerifiedPadSample[] = [];
  for (let i = 0; i < data.samples.length; i++) {
    const sample = validateSample(data.samples[i], i, errors);
    if (sample) samples.push(sample);
  }

  if (errors.length > 0) return { valid: false, errors };

  const sessionIds = [
    ...new Set(samples.map((s) => s.scanSessionId).filter(Boolean)),
  ];
  const verifiedScanCount =
    typeof data.verifiedScanCount === 'number'
      ? data.verifiedScanCount
      : sessionIds.length;

  return {
    valid: true,
    errors: [],
    data: {
      version: ADAPTIVE_SCHEMA_VERSION,
      brandId: 'clorox_salt_pool',
      enabled: data.enabled !== false,
      calibrationVersion:
        typeof data.calibrationVersion === 'string' ? data.calibrationVersion : 'imported',
      lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : new Date().toISOString(),
      verifiedScanCount,
      verifiedScanSessionIds: Array.isArray(data.verifiedScanSessionIds)
        ? (data.verifiedScanSessionIds as string[])
        : sessionIds,
      dateLastImproved:
        typeof data.dateLastImproved === 'string'
          ? data.dateLastImproved
          : samples.length > 0
            ? (typeof data.lastUpdated === 'string' ? data.lastUpdated : new Date().toISOString())
            : null,
      samples,
      rejectedOutlierCount:
        typeof data.rejectedOutlierCount === 'number' ? data.rejectedOutlierCount : 0,
      falseHighConfidenceCount:
        typeof data.falseHighConfidenceCount === 'number' ? data.falseHighConfidenceCount : 0,
      totalRejectedSamples:
        typeof data.totalRejectedSamples === 'number' ? data.totalRejectedSamples : 0,
      activityLog: Array.isArray(data.activityLog) ? (data.activityLog as AdaptiveLearningProfile['activityLog']) : [],
      rollbackRecords: Array.isArray(data.rollbackRecords)
        ? (data.rollbackRecords as AdaptiveLearningProfile['rollbackRecords'])
        : [],
      safetyOverrides: Array.isArray(data.safetyOverrides)
        ? (data.safetyOverrides as AdaptiveLearningProfile['safetyOverrides'])
        : [],
    },
  };
}

export function importAdaptiveLearning(raw: unknown): { ok: true; data: AdaptiveLearningProfile } | { ok: false; errors: string[] } {
  const result = validateAdaptiveImport(raw);
  if (!result.valid || !result.data) {
    return { ok: false, errors: result.errors.map((e) => `${e.path}: ${e.message}`) };
  }
  return { ok: true, data: result.data };
}
