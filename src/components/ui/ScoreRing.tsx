import type { ReadingStatus } from '../../models/types';

interface ScoreRingProps {
  score: number;
  status: ReadingStatus | 'mixed';
  size?: number;
}

export function ScoreRing({ score, status, size = 120 }: ScoreRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`Water quality score: ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="score-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={`score-ring__fill score-ring__fill--${status}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring__label">
        <span className="score-ring__value">{score}</span>
        <span className="score-ring__unit">/100</span>
      </div>
    </div>
  );
}
