import type { TaylorReagentGuide } from '../../constants/taylorStepGuides';

export interface TaylorGuideProps {
  title: string;
  purpose: string;
  steps: string[];
  reagents?: TaylorReagentGuide[];
  expectedColors?: string[];
  endpoint?: string;
  commonMistakes?: string[];
  troubleshooting: string[];
  /** When true, open the troubleshooting section (e.g. user tapped Help) */
  expandTroubleshooting?: boolean;
}

/** Beginner-friendly Taylor kit procedure guide with collapsible troubleshooting. */
export function TaylorGuide({
  title,
  purpose,
  steps,
  reagents,
  expectedColors,
  endpoint,
  commonMistakes,
  troubleshooting,
  expandTroubleshooting = false,
}: TaylorGuideProps) {
  return (
    <aside className="taylor-guide" aria-label={`${title} procedure`}>
      <h3 className="taylor-guide__title">{title}</h3>
      <p className="taylor-guide__purpose">{purpose}</p>

      {reagents && reagents.length > 0 && (
        <div className="taylor-guide__section">
          <h4 className="taylor-guide__heading">What each reagent does</h4>
          <ul className="taylor-guide__reagent-list">
            {reagents.map((r) => (
              <li key={r.name}>
                <strong>{r.name}</strong> — {r.role}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="taylor-guide__section">
        <h4 className="taylor-guide__heading">What to do</h4>
        <ol className="taylor-guide__steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      {expectedColors && expectedColors.length > 0 && (
        <div className="taylor-guide__section">
          <h4 className="taylor-guide__heading">What you should see</h4>
          <ul className="taylor-guide__bullets">
            {expectedColors.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {endpoint && (
        <div className="taylor-guide__section">
          <h4 className="taylor-guide__heading">When the test is finished</h4>
          <p className="taylor-guide__text">{endpoint}</p>
        </div>
      )}

      {commonMistakes && commonMistakes.length > 0 && (
        <div className="taylor-guide__section">
          <h4 className="taylor-guide__heading">Common mistakes</h4>
          <ul className="taylor-guide__bullets">
            {commonMistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {troubleshooting.length > 0 && (
        <details
          className="taylor-guide__troubleshooting"
          open={expandTroubleshooting || undefined}
        >
          <summary>What if something doesn&apos;t look right?</summary>
          <ul className="taylor-guide__bullets">
            {troubleshooting.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );
}

interface CalculatedResultProps {
  label: string;
  value: string;
  formula?: string;
}

export function CalculatedResult({ label, value, formula }: CalculatedResultProps) {
  return (
    <div className="taylor-result" role="status">
      <span className="taylor-result__label">{label}</span>
      <span className="taylor-result__value">{value}</span>
      {formula && <span className="taylor-result__formula">{formula}</span>}
    </div>
  );
}

interface TaylorSuccessMessageProps {
  message: string;
}

/** Plain-language explanation of what the result means */
export function TaylorSuccessMessage({ message }: TaylorSuccessMessageProps) {
  return (
    <div className="taylor-success" role="status">
      {message.split('\n\n').map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}
