import type { StripCaptureQuality } from '../../models/types';
import type { QualityStatus } from '../../strip/scanner/types';

interface StripQualityIndicatorsProps {
  scores: StripCaptureQuality | null;
  status: QualityStatus;
  /** Show numeric bars — developer mode only */
  showRawScores?: boolean;
}

const LABELS: Record<keyof StripCaptureQuality, string> = {
  alignmentScore: 'Alignment',
  lightingScore: 'Lighting',
  focusScore: 'Focus',
  stabilityScore: 'Stability',
};

export function StripQualityIndicators({ scores, status, showRawScores = false }: StripQualityIndicatorsProps) {
  if (!scores || !showRawScores) return null;

  const items = (Object.keys(LABELS) as (keyof StripCaptureQuality)[]).map((key) => ({
    key,
    label: LABELS[key],
    value: scores[key],
    active:
      (key === 'alignmentScore' && status === 'align') ||
      (key === 'lightingScore' && status === 'lighting') ||
      (key === 'stabilityScore' && status === 'steady') ||
      (key === 'focusScore' && status === 'steady'),
  }));

  return (
    <ul className="strip-quality-indicators" aria-label="Scan quality">
      {items.map((item) => (
        <li
          key={item.key}
          className={`strip-quality-indicators__item ${item.active ? 'strip-quality-indicators__item--warn' : ''} ${item.value >= 0.65 ? 'strip-quality-indicators__item--ok' : ''}`}
        >
          <span className="strip-quality-indicators__label">{item.label}</span>
          <span className="strip-quality-indicators__bar">
            <span
              className="strip-quality-indicators__fill"
              style={{ width: `${Math.round(item.value * 100)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
