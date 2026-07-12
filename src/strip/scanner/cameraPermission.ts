export type CameraPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

/** Query camera permission via Permissions API when available */
export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    if (status.state === 'prompt') return 'prompt';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export const IPHONE_CAMERA_SETTINGS_HINT =
  'On iPhone: Settings → Safari → Camera (or Settings → Pool Boy Pro → Camera if installed to Home Screen). Safari controls whether permission is remembered.';
