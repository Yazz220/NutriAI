/**
 * Nosh visual foundation.
 *
 * The palette follows the attached design system: paper cream surfaces,
 * ink-first controls, charcoal text, warm gray UI, and blush accents.
 * Legacy aliases stay in place so older components can migrate without
 * breaking imports.
 */

const paperCream = '#FEF8F2';
const inkBlack = '#111111';
const charcoal = '#333333';
const warmGray = '#9A9488';
const blush = '#F6E6E2';
const parchment = '#F6EFE6';
const parchmentDeep = '#E8DCCD';
const bookAccent = '#C7A46B';

export const Colors = {
  // Reference palette
  paperCream,
  inkBlack,
  charcoal,
  warmGray,
  blush,
  bookAccent,

  // Brand and controls
  primary: inkBlack,
  primaryLight: charcoal,
  primaryDark: '#000000',
  onPrimary: paperCream,

  secondary: warmGray,
  secondaryLight: '#CFC8BD',
  secondaryDark: '#6F6961',
  onSecondary: inkBlack,

  accent: blush,
  accentStrong: bookAccent,
  onAccent: inkBlack,

  // Surfaces
  background: paperCream,
  backgroundSecondary: parchment,
  card: '#FFFDFC',
  cardSecondary: parchment,
  surface: '#FFFDF8',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: parchmentDeep,
  surfaceTile: '#F4EBDD',
  tabBackground: '#FFFDFC',

  // Text
  text: inkBlack,
  textSecondary: charcoal,
  textTertiary: '#625C54',
  textMuted: warmGray,
  textInverse: paperCream,
  textOnPrimary: paperCream,
  textOnSecondary: inkBlack,
  onSurface: {
    high: inkBlack,
    medium: charcoal,
    inverse: paperCream,
  },

  // Semantic feedback tuned to the quiet paper palette
  success: '#5D7A56',
  successLight: '#E8F0E3',
  successDark: '#314B2F',
  onSuccess: paperCream,

  warning: '#B8874A',
  warningLight: '#F8E8D0',
  warningDark: '#7D562D',
  onWarning: inkBlack,

  error: '#A9544A',
  errorLight: '#F5DDD9',
  errorDark: '#7E342F',
  onError: paperCream,
  onDanger: paperCream,

  info: '#6F7F88',
  infoLight: '#E7ECEF',
  infoDark: '#394B55',
  onInfo: paperCream,

  // Borders and dividers
  border: '#DDD2C4',
  borderLight: '#EEE6DC',
  borderMuted: '#CFC4B6',
  borderStrong: '#B7AA98',
  divider: '#E7DED3',
  separator: '#D8CDBE',

  // Shadows and overlays
  shadow: 'rgba(17, 17, 17, 0.10)',
  shadows: {
    light: 'rgba(17, 17, 17, 0.06)',
    medium: 'rgba(17, 17, 17, 0.10)',
    strong: 'rgba(17, 17, 17, 0.16)',
    colored: 'rgba(199, 164, 107, 0.20)',
  },
  overlay: {
    light: 'rgba(17, 17, 17, 0.22)',
    medium: 'rgba(17, 17, 17, 0.42)',
    strong: 'rgba(17, 17, 17, 0.64)',
    colored: 'rgba(199, 164, 107, 0.28)',
  },

  // Book-specific tokens
  book: {
    page: '#FFFDF8',
    pageAlt: '#FEF8F2',
    pageWarm: '#F6EFE6',
    edge: '#D9CDBE',
    edgeStrong: '#BFAF9A',
    ink: inkBlack,
    charcoal,
    mutedInk: '#625C54',
    caption: warmGray,
    accent: bookAccent,
    accentSoft: '#EFE1CB',
    blush,
    coverSpine: '#9E9587',
    shelfGradient: ['#FEF8F2', '#F7F1EA', '#EEE4D8'] as const,
    readerGradient: ['#FDF7F1', '#F4ECE2', '#E9DED0'] as const,
    darkGradient: ['#3A352E', '#6F675D', '#D6CAB9'] as const,
    paperShadow: '0 18px 34px rgba(17, 17, 17, 0.14)',
    cardShadow: '0 10px 24px rgba(17, 17, 17, 0.08)',
    liftedShadow: '0 18px 36px rgba(17, 17, 17, 0.12)',
  },

  // Interactive states
  interactive: {
    buttonPrimary: inkBlack,
    buttonPrimaryHover: charcoal,
    buttonPrimaryPressed: '#000000',
    buttonPrimaryDisabled: '#C7BFB4',
    buttonSecondary: paperCream,
    buttonSecondaryHover: '#F6EFE6',
    buttonSecondaryPressed: '#E8DCCD',
    buttonSecondaryDisabled: '#F2EAE0',
    link: inkBlack,
    linkHover: charcoal,
    linkPressed: '#000000',
    linkVisited: charcoal,
    focus: bookAccent,
    selection: '#EFE1CB',
    highlight: blush,
  },

  chart: {
    primary: inkBlack,
    secondary: bookAccent,
    tertiary: warmGray,
    quaternary: blush,
    quinary: '#D8CDBE',
    senary: '#F1E6DA',
    gradients: {
      primary: ['#111111', '#333333'] as const,
      secondary: ['#C7A46B', '#E3CFAD'] as const,
      success: ['#5D7A56', '#8CA486'] as const,
      info: ['#6F7F88', '#A9B2B8'] as const,
    },
  },

  // Compatibility aliases
  white: '#FFFFFF',
  black: '#000000',
  lightText: warmGray,
  lightGray: '#D8CDBE',
  brandPrimary: inkBlack,
  accentPrimary: bookAccent,
  fresh: '#5D7A56',
  aging: '#B8874A',
  expiring: '#A9544A',
  danger: '#A9544A',
  tints: {
    brandTintSoft: '#F3E8D8',
    brandTintStrong: '#E4CDA8',
  },

  gray: {
    50: '#FEF8F2',
    100: '#F6EFE6',
    200: '#E8DCCD',
    300: '#D8CDBE',
    400: '#BFB4A6',
    500: '#9A9488',
    600: '#756F66',
    700: '#625C54',
    800: '#333333',
    900: '#111111',
  },

  accessibility: {
    highContrast: {
      text: '#000000',
      background: '#FFFFFF',
      primary: '#000000',
      secondary: '#333333',
    },
    focus: {
      ring: bookAccent,
      width: 2,
      offset: 2,
    },
  },

  state: {
    hoverOpacity: 0.06,
    pressedOpacity: 0.10,
    dragOpacity: 0.08,
    focusOpacity: 0.16,
    disabledOpacity: 0.42,
    selectedOpacity: 0.12,
    focusRing: { color: bookAccent, width: 2, offset: 2, radius: 8 },
  },

  alpha: {
    primary: {
      5: 'rgba(17, 17, 17, 0.05)',
      10: 'rgba(17, 17, 17, 0.10)',
      20: 'rgba(17, 17, 17, 0.20)',
      30: 'rgba(17, 17, 17, 0.30)',
      50: 'rgba(17, 17, 17, 0.50)',
    },
    secondary: {
      5: 'rgba(199, 164, 107, 0.05)',
      10: 'rgba(199, 164, 107, 0.10)',
      20: 'rgba(199, 164, 107, 0.20)',
      30: 'rgba(199, 164, 107, 0.30)',
      50: 'rgba(199, 164, 107, 0.50)',
    },
    black: {
      5: 'rgba(17, 17, 17, 0.05)',
      10: 'rgba(17, 17, 17, 0.10)',
      20: 'rgba(17, 17, 17, 0.20)',
      30: 'rgba(17, 17, 17, 0.30)',
      50: 'rgba(17, 17, 17, 0.50)',
    },
    white: {
      5: 'rgba(254, 248, 242, 0.05)',
      10: 'rgba(254, 248, 242, 0.10)',
      20: 'rgba(254, 248, 242, 0.20)',
      30: 'rgba(254, 248, 242, 0.30)',
      50: 'rgba(254, 248, 242, 0.50)',
    },
  },
};
