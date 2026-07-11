import { BRAND } from '../../constants/branding';

interface LogoProps {
  variant?: 'transparent' | 'solid';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'brand-logo--sm',
  md: 'brand-logo--md',
  lg: 'brand-logo--lg',
  xl: 'brand-logo--xl',
};

/** Pool Boy Pro logo — preserves aspect ratio, never stretched. */
export function Logo({ variant = 'transparent', size = 'md', className = '' }: LogoProps) {
  const src = variant === 'solid' ? BRAND.logos.solid : BRAND.logos.transparent;
  return (
    <img
      src={src}
      alt={BRAND.name}
      className={`brand-logo ${SIZE_CLASS[size]} ${className}`.trim()}
      decoding="async"
    />
  );
}
