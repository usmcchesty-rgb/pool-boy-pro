import { useState } from 'react';
import { StripPrivacyNotice } from './StripPrivacyNotice';
import { StripCapturePreview } from './StripCapturePreview';
import {
  getPreviewSession,
  getCurrentStripBox,
} from '../../strip/scanner/temporaryPreview';
import type { StripBoundingBox } from '../../strip/scanner/stripDetector';
import { requiresStripCorrection } from '../../strip/scanner/stripGeometry';

interface StripCorrectionViewProps {
  /** Actions are rendered in the workflow sticky footer */
}

export function StripCorrectionView(_props: StripCorrectionViewProps) {
  const session = getPreviewSession();
  const [showPadRegions, setShowPadRegions] = useState(true);
  const [stripBox, setStripBox] = useState<StripBoundingBox>(
    () => session?.geometry.stripBox ?? { x: 0, y: 0, w: 100, h: 100, rotation: 0, detected: false, confidence: 0 }
  );

  if (!session) {
    return (
      <p className="field__error" role="alert">
        Preview expired. Rescan the strip to continue.
      </p>
    );
  }

  const lowConfidence = requiresStripCorrection(session.geometry.originalStripBox);

  return (
    <div className="strip-correction">
      <p className="field__hint" role="status">
        {lowConfidence
          ? 'Strip detection was uncertain. Drag the box to cover the full test strip, then apply.'
          : 'Review the detected strip area. Adjust if needed before continuing.'}
      </p>

      <StripCapturePreview
        stripBox={stripBox}
        onStripBoxChange={setStripBox}
        showPadRegions={showPadRegions}
        config={session.config}
        frameWidth={session.geometry.frameWidth}
        frameHeight={session.geometry.frameHeight}
      />

      <label className="strip-correction__toggle">
        <input
          type="checkbox"
          checked={showPadRegions}
          onChange={(e) => setShowPadRegions(e.target.checked)}
        />
        Show pad sample regions
      </label>

      <StripPrivacyNotice />
    </div>
  );
}

export type { StripCorrectionViewProps };

/** Read-only preview for verification "View Sample Area" */
export function StripSampleAreaView({ onClose }: { onClose: () => void }) {
  const session = getPreviewSession();
  const [showPadRegions, setShowPadRegions] = useState(true);

  if (!session) {
    return (
      <div className="strip-sample-area">
        <p className="field__hint">Sample preview is no longer available.</p>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  const stripBox = getCurrentStripBox() ?? session.geometry.stripBox;

  return (
    <div className="strip-sample-area">
      <h3 className="strip-sample-area__title">Sample Area Preview</h3>
      <p className="field__hint">
        Outlined boxes show where each pad color was sampled. Not saved.
      </p>
      <StripCapturePreview
        stripBox={stripBox}
        onStripBoxChange={() => {}}
        showPadRegions={showPadRegions}
        readOnly
        config={session.config}
        frameWidth={session.geometry.frameWidth}
        frameHeight={session.geometry.frameHeight}
      />
      <label className="strip-correction__toggle">
        <input
          type="checkbox"
          checked={showPadRegions}
          onChange={(e) => setShowPadRegions(e.target.checked)}
        />
        Show pad sample regions
      </label>
      <button type="button" className="btn btn--secondary" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
