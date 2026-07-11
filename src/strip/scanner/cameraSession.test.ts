import { describe, expect, it, vi } from 'vitest';
import { stopAllTracks, isCameraSupported } from './cameraSession';

describe('cameraSession', () => {
  it('stops all tracks on a MediaStream', () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }, { stop: vi.fn() }],
    } as unknown as MediaStream;

    stopAllTracks(stream);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('handles null stream safely', () => {
    expect(() => stopAllTracks(null)).not.toThrow();
  });

  it('reports camera unsupported when mediaDevices missing', () => {
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(isCameraSupported()).toBe(false);
    Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true });
  });
});
