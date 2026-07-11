import { ADAPTIVE_SCHEMA_VERSION } from './adaptiveConfig';
import type { AdaptiveLearningProfile, VerifiedPadSample } from './adaptiveTypes';

const PROFILE_KEY = 'poolBoyPro_adaptiveLearning';
const ENABLED_KEY = 'poolBoyPro_adaptiveLearningEnabled';

function createEmptyProfile(): AdaptiveLearningProfile {
  return {
    version: ADAPTIVE_SCHEMA_VERSION,
    brandId: 'clorox_salt_pool',
    enabled: true,
    calibrationVersion: 'adaptive-v1',
    lastUpdated: new Date().toISOString(),
    samples: [],
    rejectedOutlierCount: 0,
    falseHighConfidenceCount: 0,
    totalRejectedSamples: 0,
    activityLog: [],
    rollbackRecords: [],
    safetyOverrides: [],
  };
}

function migrateProfile(parsed: AdaptiveLearningProfile): AdaptiveLearningProfile {
  return {
    ...createEmptyProfile(),
    ...parsed,
    totalRejectedSamples: parsed.totalRejectedSamples ?? 0,
    activityLog: parsed.activityLog ?? [],
    rollbackRecords: parsed.rollbackRecords ?? [],
    safetyOverrides: parsed.safetyOverrides ?? [],
  };
}

export function isAdaptiveLearningEnabled(): boolean {
  try {
    const stored = localStorage.getItem(ENABLED_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setAdaptiveLearningEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export function loadAdaptiveProfile(): AdaptiveLearningProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return createEmptyProfile();
    const parsed = JSON.parse(raw) as AdaptiveLearningProfile;
    if (parsed.version !== ADAPTIVE_SCHEMA_VERSION || parsed.brandId !== 'clorox_salt_pool') {
      return createEmptyProfile();
    }
    return migrateProfile(parsed);
  } catch {
    return createEmptyProfile();
  }
}

export function saveAdaptiveProfile(profile: AdaptiveLearningProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Unavailable in non-browser test environments
  }
}

export function resetLearnedCalibration(): void {
  const profile = loadAdaptiveProfile();
  saveAdaptiveProfile({
    ...createEmptyProfile(),
    enabled: profile.enabled,
  });
}

export function getRecentSamples(limit = 20): VerifiedPadSample[] {
  const profile = loadAdaptiveProfile();
  return [...profile.samples]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function removeSample(sampleId: string): boolean {
  const profile = loadAdaptiveProfile();
  const before = profile.samples.length;
  profile.samples = profile.samples.filter((s) => s.id !== sampleId);
  if (profile.samples.length === before) return false;
  profile.lastUpdated = new Date().toISOString();
  saveAdaptiveProfile(profile);
  return true;
}

/** Remove all samples for one pad/chart value */
export function resetLearnedPadValue(padId: string, value: number): number {
  const profile = loadAdaptiveProfile();
  const before = profile.samples.length;
  profile.samples = profile.samples.filter(
    (s) => !(s.padId === padId && s.confirmedValue === value)
  );
  profile.safetyOverrides = profile.safetyOverrides.filter(
    (o) => !(o.padId === padId && o.value === value)
  );
  profile.lastUpdated = new Date().toISOString();
  saveAdaptiveProfile(profile);
  return before - profile.samples.length;
}

/** Remove all samples and overrides for one pad */
export function resetLearnedPad(padId: string): number {
  const profile = loadAdaptiveProfile();
  const before = profile.samples.length;
  profile.samples = profile.samples.filter((s) => s.padId !== padId);
  profile.safetyOverrides = profile.safetyOverrides.filter((o) => o.padId !== padId);
  profile.lastUpdated = new Date().toISOString();
  saveAdaptiveProfile(profile);
  return before - profile.samples.length;
}
