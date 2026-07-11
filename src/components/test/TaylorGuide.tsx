interface TaylorGuideProps {
  title: string;
  steps: string[];
  reagents?: string[];
}

/** Short Taylor kit procedure reminder shown during each test step. */
export function TaylorGuide({ title, steps, reagents }: TaylorGuideProps) {
  return (
    <aside className="taylor-guide" aria-label={`${title} procedure`}>
      <h3 className="taylor-guide__title">{title}</h3>
      {reagents && reagents.length > 0 && (
        <p className="taylor-guide__reagents">
          <strong>Reagents:</strong> {reagents.join(', ')}
        </p>
      )}
      <ol className="taylor-guide__steps">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
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
