import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  unit?: string;
}

export function Input({ label, hint, error, unit, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const describedBy = [
    error ? `${inputId}-error` : null,
    hint ? `${inputId}-hint` : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      <label htmlFor={inputId} className="field__label">
        {label}
        {unit && <span className="field__unit">({unit})</span>}
      </label>
      {hint && (
        <p id={`${inputId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      <input
        id={inputId}
        className="field__input"
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
