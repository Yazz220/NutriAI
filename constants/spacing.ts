// Shared layout scale from the Nosh design system.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxx: 48,
  huge: 64,
} as const;

// Legacy typography export kept for components still importing from spacing.
export const Typography = {
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 32,
  },
  families: {
    title: 'PlayfairDisplay-SemiBold' as const,
    body: 'Inter' as const,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
  displayLg: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
  },
  displayMd: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
} as const;

export const Radii = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const Shadows = {
  level0: {
    boxShadow: 'none',
  },
  sm: {
    boxShadow: '0 2px 8px rgba(17, 17, 17, 0.06)',
  },
  md: {
    boxShadow: '0 10px 24px rgba(17, 17, 17, 0.08)',
  },
  lg: {
    boxShadow: '0 18px 36px rgba(17, 17, 17, 0.12)',
  },
} as const;
