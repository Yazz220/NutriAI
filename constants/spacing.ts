// Unified spacing system tuned for the Nosh aesthetic
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  // terminal value per design scale
  xxxx: 48,
} as const;

// Typography system
export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,      // caption
    md: 15,      // body
    lg: 16,      // subtitle
    xl: 20,      // title
    xxl: 22,     // reserved
    xxxl: 28,    // displayLg
    display: 28,
  },
  families: {
    // Font family tokens (can be mapped to installed fonts later)
    title: 'serif' as const,
    body: undefined as unknown as string | undefined, // default system sans
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.38,
    relaxed: 1.45,
  },
  // Typography styles for components
  displayLg: { // 28/36 600
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  displayMd: { // keep for compatibility
    fontSize: 24,
    fontWeight: '500' as const,
    lineHeight: 32,
  },
  h2: { // title 20/28 600
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h3: { // subtitle 16/22 500
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  body: { // 15/22 400
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySm: { // 13/18 400
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: { // 13/18 400
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  overline: { // 11/16 600
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    // tracking handled at component usage level if needed
  },
} as const;

// Corner radius system softened for the Nosh brand
export const Radii = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

// Shadow system with herbaceous tints
export const Shadows = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: 'rgba(63, 109, 42, 0.10)',
    shadowOffset: { width: 0, height: 2 }, // elevation.card offsetY 2
    shadowOpacity: 1,
    shadowRadius: 8, // blur 8
    elevation: 3,
  },
  md: {
    shadowColor: 'rgba(63, 109, 42, 0.14)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  lg: {
    shadowColor: 'rgba(47, 58, 31, 0.18)', // elevated sheet tint
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 12,
  },
} as const;
