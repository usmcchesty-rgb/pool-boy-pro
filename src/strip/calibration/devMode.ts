const DEV_MODE_KEY = 'poolBoyPro_developerMode';

/** Developer mode unlocks hidden calibration/validation tools */
export function isDeveloperMode(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enableDeveloperMode(): void {
  localStorage.setItem(DEV_MODE_KEY, 'true');
}

export function disableDeveloperMode(): void {
  localStorage.removeItem(DEV_MODE_KEY);
}
