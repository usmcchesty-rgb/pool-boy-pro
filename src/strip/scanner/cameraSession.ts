export type CameraErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'not_found'
  | 'unknown';

export interface CameraSessionOptions {
  facingMode?: 'environment' | 'user';
}

export interface CameraSessionHandle {
  stream: MediaStream;
  stop: () => void;
}

/** Check if getUserMedia is available */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Request camera access — rear-facing preferred on phones */
export async function startCameraSession(
  options: CameraSessionOptions = {}
): Promise<CameraSessionHandle> {
  if (!isCameraSupported()) {
    throw Object.assign(new Error('Camera not supported'), { code: 'unsupported' as CameraErrorCode });
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: options.facingMode ?? 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    return {
      stream,
      stop: () => {
        stopAllTracks(stream);
        if (activeStream === stream) activeStream = null;
      },
    };
  } catch (err) {
    const domErr = err as DOMException;
    if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
      throw Object.assign(new Error('Camera permission denied'), {
        code: 'permission_denied' as CameraErrorCode,
      });
    }
    if (domErr.name === 'NotFoundError' || domErr.name === 'DevicesNotFoundError') {
      throw Object.assign(new Error('No camera found'), { code: 'not_found' as CameraErrorCode });
    }
    throw Object.assign(new Error('Camera error'), { code: 'unknown' as CameraErrorCode });
  }
}

/** Stop every track on a MediaStream */
export function stopAllTracks(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function getCameraErrorMessage(code: CameraErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'Your browser does not support camera access. Use manual entry instead.';
    case 'permission_denied':
      return 'Camera permission was denied. Allow camera access in your browser settings, or use manual entry.';
    case 'not_found':
      return 'No camera was found on this device. Use manual entry instead.';
    default:
      return 'Could not start the camera. Try again or use manual entry.';
  }
}

/** Shared camera stream — reused within a scanner session */
let activeStream: MediaStream | null = null;

export function getActiveCameraStream(): MediaStream | null {
  return activeStream;
}

export function setActiveCameraStream(stream: MediaStream | null): void {
  if (activeStream && activeStream !== stream) {
    stopAllTracks(activeStream);
  }
  activeStream = stream;
}

export function releaseActiveCameraStream(): void {
  stopAllTracks(activeStream);
  activeStream = null;
}
