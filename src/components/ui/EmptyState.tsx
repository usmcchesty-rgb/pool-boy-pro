import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <div className="empty-state__content">
        {icon && (
          <span className="empty-state__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 className="empty-state__title">{title}</h2>
        {description && <p className="empty-state__description">{description}</p>}
        {action && <div className="empty-state__actions">{action}</div>}
      </div>
    </div>
  );
}
