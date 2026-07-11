import { Link, type LinkProps } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavButtonProps extends Omit<LinkProps, 'className'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

export function NavButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: NavButtonProps) {
  return (
    <Link
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}
