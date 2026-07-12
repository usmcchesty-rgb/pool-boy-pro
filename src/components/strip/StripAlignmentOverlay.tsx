import type { PadRoi, ScanTargetConfig } from '../../strip/scanner/types';

interface StripAlignmentOverlayProps {
  config: ScanTargetConfig;
  ready: boolean;
  statusMessage: string;
  /** Show per-pad regions (post-capture preview only) */
  showPadMarkers?: boolean;
  padRegions?: PadRoi[];
}

export function StripAlignmentOverlay({
  config,
  ready,
  statusMessage,
  showPadMarkers = false,
  padRegions,
}: StripAlignmentOverlayProps) {
  const regions = padRegions ?? (showPadMarkers ? config.padRois : []);

  return (
    <div className="strip-scanner-overlay" aria-hidden="true">
      <div
        className={`strip-scanner-overlay__guide strip-scanner-overlay__guide--whole ${ready ? 'strip-scanner-overlay__guide--ready' : ''}`}
        style={{ aspectRatio: String(config.aspectRatio) }}
      >
        {showPadMarkers &&
          regions.map((roi) => (
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
          ? 'Place the full six-way strip inside the box'
          : 'Place the full salt strip inside the box'}
      </p>
    </div>
  );
}

function PadMarker({ roi }: { roi: PadRoi }) {
  return (
    <span
      className="strip-scanner-overlay__pad strip-scanner-overlay__pad--detected"
      style={{
        left: `${roi.x * 100}%`,
        top: `${roi.y * 100}%`,
        width: `${roi.w * 100}%`,
        height: `${roi.h * 100}%`,
      }}
    />
  );
}
