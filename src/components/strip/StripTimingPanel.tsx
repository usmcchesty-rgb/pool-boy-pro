import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { StripBrandDefinition } from '../../strip/types';
import {
  acknowledgeExpiredWindow,
  advanceStripTiming,
  createInitialTimingState,
  getStripTimingConfig,
  getTimingMessage,
  startStripTiming,
  type StripTimingState,
} from '../../strip/calibration/timing';

interface StripTimingPanelProps {
  brand: StripBrandDefinition;
  stripLabel: string;
  timing: StripTimingState;
  onTimingChange: (state: StripTimingState) => void;
}

export function StripTimingPanel({
  brand,
  stripLabel,
  timing,
  onTimingChange,
}: StripTimingPanelProps) {
  const config = getStripTimingConfig(brand);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (timing.phase === 'not_started') return;
    const id = window.setInterval(() => {
      onTimingChange(advanceStripTiming(timing, config));
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(id);
  }, [timing, config, onTimingChange]);

  const message = getTimingMessage(timing, config);

  return (
    <div className={`strip-timing strip-timing--${timing.phase}`}>
      <p className="strip-timing__label">
        <strong>{stripLabel}</strong> timing
        {!config.timingVerified && (
          <span className="strip-timing__unverified" title={config.timingNotes}>
            {' '}(requires product verification)
          </span>
        )}
      </p>
      <p className="strip-timing__message">{message}</p>

      {timing.phase === 'not_started' && (
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => onTimingChange(startStripTiming(config))}
        >
          I Dipped the Strip — Start Timer
        </Button>
      )}

      {timing.phase === 'dip_wait' && (
        <div className="strip-timing__countdown" aria-live="polite">
          {Math.ceil(timing.dipWaitRemaining)}s
        </div>
      )}

      {timing.phase === 'reading_window' && (
        <div className="strip-timing__countdown strip-timing__countdown--ready" aria-live="polite">
          {Math.ceil(timing.readingWindowRemaining)}s left
        </div>
      )}

      {timing.phase === 'window_expired' && !timing.expiredAcknowledged && (
        <div className="strip-timing__expired">
          <p className="taylor-note">
            The recommended reading window ({config.readWithinSeconds}s) may have passed.
            Strip colors can fade — verify readings carefully.
          </p>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() => onTimingChange(acknowledgeExpiredWindow(timing))}
          >
            Continue Anyway (lower accuracy)
          </Button>
        </div>
      )}
    </div>
  );
}

export function createStripTiming(): StripTimingState {
  return createInitialTimingState();
}

export type { StripTimingState };
