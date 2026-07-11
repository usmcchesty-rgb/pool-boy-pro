import type { ParameterAnalysis } from '../../models/types';
import { LevelBadge } from '../ui/LevelBadge';
import { formatPpm } from '../../utilities/units';
import { formatLevel, formatPriority } from '../../utilities/format';

interface ParameterRowProps {
  param: ParameterAnalysis;
  compact?: boolean;
  detail?: boolean;
}

function resolveLevel(param: ParameterAnalysis) {
  return param.level ?? (param.status === 'ideal' ? 'ideal' : param.status === 'too_low' ? 'low' : 'high');
}

export function ParameterRow({ param, compact, detail }: ParameterRowProps) {
  const level = resolveLevel(param);
  const displayValue =
    param.parameter === 'ph'
      ? param.value.toFixed(1)
      : param.parameter === 'temperature'
        ? `${param.value.toFixed(0)}°F`
        : formatPpm(param.value);

  if (compact) {
    return (
      <div className="param-row param-row--compact">
        <span className="param-row__name">{param.label}</span>
        <span className="param-row__value">{displayValue}</span>
        <LevelBadge level={level} size="sm" />
      </div>
    );
  }

  const showExpandedDetails = detail;

  return (
    <article className={`param-row ${detail ? 'param-row--detail' : ''}`}>
      <header className="param-row__header">
        <h3 className="param-row__name">{param.label}</h3>
        <div className="param-row__meta">
          <span className="param-row__value">{displayValue}</span>
          <LevelBadge level={level} />
          {param.priority && (
            <span className={`param-row__priority param-row__priority--${param.priority}`}>
              {formatPriority(param.priority)} priority
            </span>
          )}
        </div>
      </header>
      <p className="param-row__ideal">
        Ideal: {param.idealMin}–{param.idealMax} {param.unit} · Status: {formatLevel(level)}
      </p>
      <p className="param-row__why">{param.whyItMatters}</p>
      {showExpandedDetails ? (
        <div className="param-row__detail-grid param-row__detail-grid--open">
          <div>
            <h4>Possible causes</h4>
            <ul>
              {param.possibleCauses.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Possible effects</h4>
            <ul>
              {param.possibleEffects.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <details className="param-row__details">
          <summary>Possible causes & effects</summary>
          <div className="param-row__detail-grid">
            <div>
              <h4>Causes</h4>
              <ul>
                {param.possibleCauses.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Effects</h4>
              <ul>
                {param.possibleEffects.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
      <p className="param-row__correction">
        <strong>Recommended correction:</strong> {param.suggestedCorrection}
      </p>
    </article>
  );
}
