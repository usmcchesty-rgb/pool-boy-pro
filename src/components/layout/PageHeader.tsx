import type { ReactNode } from 'react';
import { Logo } from '../ui/Logo';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  beforeTitle?: ReactNode;
  className?: string;
  logoVariant?: 'transparent' | 'solid';
}

export function PageHeader({
  title,
  subtitle,
  actions,
  beforeTitle,
  className = '',
  logoVariant = 'transparent',
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__intro">
        <Logo variant={logoVariant} size="sm" className="page-header__logo" />
        <div className="page-header__text">
          {beforeTitle}
          <h1 className="page-title">{title}</h1>
          {subtitle != null && subtitle !== '' && (
            <p className="page-subtitle">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
