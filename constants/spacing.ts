// Shared layout scale from the Boords-inspired Nosh design system.
export const Spacing = {
  xxs: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxx: 48,
  huge: 64,
  page: 80,
  hero: 104,
} as const;

// Legacy typography export kept for components still importing from spacing.
export const Typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 19,
    xxl: 24,
    xxxl: 32,
    display: 60,
  },
  families: {
    title: 'Inter-Bold' as const,
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
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  displayMd: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 19,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 15,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 15,
  },
} as const;

export const Radii = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  level0: {
    boxShadow: 'none',
  },
  sm: {
    boxShadow: '0 10px 28px rgba(23, 22, 20, 0.06)',
  },
  md: {
    boxShadow: '0 12px 34px rgba(23, 22, 20, 0.08)',
  },
  lg: {
    boxShadow: '0 16px 38px rgba(23, 22, 20, 0.14)',
  },
} as const;
