import type { PadRoi, ScanTargetConfig } from '../../strip/scanner/types';

interface StripAlignmentOverlayProps {
  config: ScanTargetConfig;
  ready: boolean;
  statusMessage: string;
}

export function StripAlignmentOverlay({ config, ready, statusMessage }: StripAlignmentOverlayProps) {
  return (
    <div className="strip-scanner-overlay" aria-hidden="true">
      <div
        className={`strip-scanner-overlay__guide ${ready ? 'strip-scanner-overlay__guide--ready' : ''}`}
        style={{ aspectRatio: String(config.aspectRatio) }}
      >
        <div className="strip-scanner-overlay__neutral" />
        {config.padRois.map((roi) => (
          <PadMarker key={roi.padId} roi={roi} />
        ))}
      </div>
      <p
        className={`strip-scanner-overlay__status ${ready ? 'strip-scanner-overlay__status--ready' : ''}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>
      <p className="strip-scanner-overlay__hint">
        {config.stripType === 'six_way'
          ? 'Hold six-way strip vertically inside the box'
          : 'Hold salt strip inside the box'}
      </p>
    </div>
  );
}

function PadMarker({ roi }: { roi: PadRoi }) {
  return (
    <span
      className="strip-scanner-overlay__pad"
      style={{
        left: `${roi.x * 100}%`,
        top: `${roi.y * 100}%`,
        width: `${roi.w * 100}%`,
        height: `${roi.h * 100}%`,
      }}
    />
  );
}
