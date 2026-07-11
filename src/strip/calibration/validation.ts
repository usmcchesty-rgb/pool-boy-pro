import { CLOROX_SALT_POOL_STRIP } from '../brands/cloroxSaltPool';
import { rgbToLab, type Rgb } from '../scanner/colorScience';
import {
  CALIBRATION_SCHEMA_VERSION,
  type CalibrationAnchorEntry,
  type CalibrationPadData,
  type StripCalibrationData,
} from './types';

export interface CalibrationValidationError {
  path: string;
  message: string;
}

export interface CalibrationValidationResult {
  valid: boolean;
  errors: CalibrationValidationError[];
  data?: StripCalibrationData;
}

const VALID_PAD_IDS = new Set(CLOROX_SALT_POOL_STRIP.pads.map((p) => p.id));

function isValidRgb(value: unknown): value is Rgb {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((c) => typeof c === 'number' && c >= 0 && c <= 255 && Number.isFinite(c))
  );
}

function isValidLab(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((c) => typeof c === 'number' && Number.isFinite(c))
  );
}

function validateAnchor(
  anchor: unknown,
  padId: string,
  scaleValues: number[],
  path: string,
  errors: CalibrationValidationError[]
): CalibrationAnchorEntry | null {
  if (!anchor || typeof anchor !== 'object') {
    errors.push({ path, message: 'Anchor must be an object' });
    return null;
  }

  const a = anchor as Record<string, unknown>;
  const value = a.value;
  if (typeof value !== 'number' || !scaleValues.includes(value)) {
    errors.push({ path: `${path}.value`, message: `Invalid chart value for pad ${padId}` });
    return null;
  }

  if (!isValidRgb(a.referenceRgb)) {
    errors.push({ path: `${path}.referenceRgb`, message: 'Invalid referenceRgb' });
    return null;
  }

  let referenceLab = a.referenceLab;
  if (!isValidLab(referenceLab)) {
    referenceLab = rgbToLab(a.referenceRgb as Rgb);
  }

  const sampleCount = typeof a.sampleCount === 'number' ? a.sampleCount : 0;
  const source = typeof a.source === 'string' ? a.source : 'unknown';
  const reliability = a.reliability;
  if (reliability !== 'approximate' && reliability !== 'measured' && reliability !== 'validated') {
    errors.push({ path: `${path}.reliability`, message: 'Invalid reliability' });
    return null;
  }

  return {
    value,
    referenceRgb: a.referenceRgb as Rgb,
    referenceLab: referenceLab as [number, number, number],
    sampleCount,
    source,
    reliability,
    lightingProfile:
      a.lightingProfile && typeof a.lightingProfile === 'object'
        ? (a.lightingProfile as CalibrationAnchorEntry['lightingProfile'])
        : undefined,
    deviceNotes: typeof a.deviceNotes === 'string' ? a.deviceNotes : undefined,
  };
}

/** Validate imported developer calibration JSON */
export function validateCalibrationImport(raw: unknown): CalibrationValidationResult {
  const errors: CalibrationValidationError[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: [{ path: '', message: 'Calibration data must be a JSON object' }] };
  }

  const data = raw as Record<string, unknown>;

  if (data.version !== CALIBRATION_SCHEMA_VERSION) {
    errors.push({
      path: 'version',
      message: `Unsupported version (expected ${CALIBRATION_SCHEMA_VERSION})`,
    });
  }

  if (data.brandId !== 'clorox_salt_pool') {
    errors.push({ path: 'brandId', message: 'Only clorox_salt_pool is supported' });
  }

  if (typeof data.calibrationVersion !== 'string' || !data.calibrationVersion.trim()) {
    errors.push({ path: 'calibrationVersion', message: 'calibrationVersion is required' });
  }

  if (typeof data.sourceDescription !== 'string') {
    errors.push({ path: 'sourceDescription', message: 'sourceDescription is required' });
  }

  if (!Array.isArray(data.pads)) {
    errors.push({ path: 'pads', message: 'pads must be an array' });
    return { valid: false, errors };
  }

  const seenPads = new Set<string>();
  const pads: CalibrationPadData[] = [];

  for (let i = 0; i < data.pads.length; i++) {
    const padRaw = data.pads[i];
    const path = `pads[${i}]`;
    if (!padRaw || typeof padRaw !== 'object') {
      errors.push({ path, message: 'Pad entry must be an object' });
      continue;
    }

    const pad = padRaw as Record<string, unknown>;
    const padId = pad.padId;
    if (typeof padId !== 'string' || !VALID_PAD_IDS.has(padId)) {
      errors.push({ path: `${path}.padId`, message: `Unknown or missing padId: ${padId}` });
      continue;
    }

    if (seenPads.has(padId)) {
      errors.push({ path: `${path}.padId`, message: `Duplicate pad: ${padId}` });
      continue;
    }
    seenPads.add(padId);

    const padDef = CLOROX_SALT_POOL_STRIP.pads.find((p) => p.id === padId)!;
    if (!Array.isArray(pad.anchors)) {
      errors.push({ path: `${path}.anchors`, message: 'anchors must be an array' });
      continue;
    }

    const anchors: CalibrationAnchorEntry[] = [];
    const seenValues = new Set<number>();

    for (let j = 0; j < pad.anchors.length; j++) {
      const entry = validateAnchor(
        pad.anchors[j],
        padId,
        padDef.scaleValues,
        `${path}.anchors[${j}]`,
        errors
      );
      if (entry) {
        if (seenValues.has(entry.value)) {
          errors.push({
            path: `${path}.anchors[${j}].value`,
            message: `Duplicate chart value ${entry.value}`,
          });
        } else {
          seenValues.add(entry.value);
          anchors.push(entry);
        }
      }
    }

    pads.push({ padId, anchors });
  }

  for (const padDef of CLOROX_SALT_POOL_STRIP.pads) {
    if (!seenPads.has(padDef.id)) {
      errors.push({ path: 'pads', message: `Missing pad: ${padDef.id}` });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      version: CALIBRATION_SCHEMA_VERSION,
      brandId: 'clorox_salt_pool',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
      calibrationVersion: data.calibrationVersion as string,
      sourceDescription: data.sourceDescription as string,
      pads,
    },
  };
}
