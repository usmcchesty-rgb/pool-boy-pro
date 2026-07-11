/** Pool Boy Pro brand assets and copy */
export const BRAND = {
  name: 'Pool Boy Pro',
  tagline: 'Test. Balance. Perfect.',
  logos: {
    /** Official transparent logo — sidebar, loading screen, mobile header, PWA icon source */
    transparent: '/assets/logos/logo%20transparent.png',
    /** Official solid-background logo — reports and light surfaces */
    solid: '/assets/logos/logo.png',
  },
  /** PWA / favicon icons generated from logos.transparent via npm run icons */
  pwaIcon: '/icons/icon-192x192.png',
  themeColor: '#0b7377',
} as const;
