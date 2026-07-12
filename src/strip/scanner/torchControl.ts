export type TorchSupport = 'supported' | 'unsupported' | 'unknown';

export interface TorchState {
  supported: TorchSupport;
  enabled: boolean;
}

/** Detect whether the video track supports torch / flashlight control */
export function detectTorchSupport(track: MediaStreamTrack | null | undefined): TorchSupport {
  if (!track || typeof track.getCapabilities !== 'function') {
    return 'unknown';
  }

  try {
    const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    if (caps.torch === true) return 'supported';
    if (caps.torch === false) return 'unsupported';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getVideoTrack(stream: MediaStream | null | undefined): MediaStreamTrack | null {
  if (!stream || typeof stream.getVideoTracks !== 'function') return null;
  return stream.getVideoTracks()[0] ?? null;
}

/**
 * Enable or disable flashlight on the active video track.
 * Returns true when applied; false when unsupported or failed — never throws.
 */
export async function setTorchEnabled(
  track: MediaStreamTrack | null | undefined,
  enabled: boolean
): Promise<boolean> {
  if (!track) return false;

  const support = detectTorchSupport(track);
  if (support === 'unsupported') return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled }],
    } as unknown as MediaTrackConstraints);
    return true;
  } catch {
    try {
      await track.applyConstraints({ torch: enabled } as unknown as MediaTrackConstraints);
      return true;
    } catch {
      return false;
    }
  }
}

/** Turn off torch before releasing camera — safe no-op when unavailable */
export async function releaseTorch(stream: MediaStream | null | undefined): Promise<void> {
  const track = getVideoTrack(stream);
  if (!track) return;
  await setTorchEnabled(track, false);
}

export function isTorchAvailable(track: MediaStreamTrack | null | undefined): boolean {
  return detectTorchSupport(track) === 'supported';
}
