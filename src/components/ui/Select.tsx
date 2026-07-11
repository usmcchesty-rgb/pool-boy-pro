import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Select({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const describedBy = [
    error ? `${selectId}-error` : null,
    hint ? `${selectId}-hint` : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      <label htmlFor={selectId} className="field__label">
        {label}
      </label>
      {hint && (
        <p id={`${selectId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      <select
        id={selectId}
        className="field__select"
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
