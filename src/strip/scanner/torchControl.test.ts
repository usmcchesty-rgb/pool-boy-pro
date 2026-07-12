import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  detectTorchSupport,
  getVideoTrack,
  isTorchAvailable,
  releaseTorch,
  setTorchEnabled,
} from './torchControl';

function mockTrack(capabilities: Record<string, unknown> = {}) {
  return {
    getCapabilities: vi.fn(() => capabilities),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  } as unknown as MediaStreamTrack;
}

function mockStream(track: MediaStreamTrack | null) {
  return {
    getVideoTracks: () => (track ? [track] : []),
  } as unknown as MediaStream;
}

describe('torch capability detection', () => {
  it('reports supported when torch capability is true', () => {
    const track = mockTrack({ torch: true });
    expect(detectTorchSupport(track)).toBe('supported');
    expect(isTorchAvailable(track)).toBe(true);
  });

  it('reports unsupported when torch capability is false', () => {
    const track = mockTrack({ torch: false });
    expect(detectTorchSupport(track)).toBe('unsupported');
    expect(isTorchAvailable(track)).toBe(false);
  });

  it('handles missing getCapabilities safely', () => {
    const track = {} as MediaStreamTrack;
    expect(detectTorchSupport(track)).toBe('unknown');
  });

  it('returns null video track for empty stream', () => {
    expect(getVideoTrack(mockStream(null))).toBeNull();
  });
});

describe('torch control', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('enables torch via advanced constraints', async () => {
    const track = mockTrack({ torch: true });
    const ok = await setTorchEnabled(track, true);
    expect(ok).toBe(true);
    expect(track.applyConstraints).toHaveBeenCalled();
  });

  it('returns false for unsupported devices without throwing', async () => {
    const track = mockTrack({ torch: false });
    const ok = await setTorchEnabled(track, true);
    expect(ok).toBe(false);
  });

  it('falls back when advanced constraints fail', async () => {
    const track = mockTrack({ torch: true });
    vi.mocked(track.applyConstraints)
      .mockRejectedValueOnce(new Error('unsupported'))
      .mockResolvedValueOnce(undefined);
    const ok = await setTorchEnabled(track, true);
    expect(ok).toBe(true);
    expect(track.applyConstraints).toHaveBeenCalledTimes(2);
  });

  it('never throws when all constraint attempts fail', async () => {
    const track = mockTrack({ torch: true });
    vi.mocked(track.applyConstraints).mockRejectedValue(new Error('fail'));
    await expect(setTorchEnabled(track, true)).resolves.toBe(false);
  });
});

describe('torch cleanup', () => {
  it('releases torch on scanner exit', async () => {
    const track = mockTrack({ torch: true });
    const stream = mockStream(track);
    await releaseTorch(stream);
    expect(track.applyConstraints).toHaveBeenCalled();
  });

  it('releaseTorch is safe with null stream', async () => {
    await expect(releaseTorch(null)).resolves.toBeUndefined();
  });
});

describe('scanner settings defaults', () => {
  it('default settings enable relaxed quality and disable auto flashlight', async () => {
    const { DEFAULT_SETTINGS } = await import('../../models/defaults');
    expect(DEFAULT_SETTINGS.scannerRelaxQuality).toBe(true);
    expect(DEFAULT_SETTINGS.scannerAutoFlashlight).toBe(false);
  });
});
