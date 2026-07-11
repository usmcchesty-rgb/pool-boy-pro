const DEV_MODE_KEY = 'poolBoyPro_developerMode';

/** Developer mode unlocks hidden calibration/validation tools */
export function isDeveloperMode(): boolean {
  try {
    const stored = localStorage.getItem(DEV_MODE_KEY);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch {
    // fall through
  }
  return import.meta.env.DEV;
}

export function enableDeveloperMode(): void {
  localStorage.setItem(DEV_MODE_KEY, 'true');
}

export function disableDeveloperMode(): void {
  localStorage.setItem(DEV_MODE_KEY, 'false');
}
