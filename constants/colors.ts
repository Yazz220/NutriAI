/**
 * Nosh visual foundation.
 *
 * This branch applies the Boords-style reference to Nosh: creamy Alabaster
 * pages, Charcoal text, compact structure, Butterscotch interaction accents,
 * and quiet workshop-like surfaces. Compatibility aliases remain so older
 * cookbook components can keep importing stable color names.
 */

const carbon = '#000000';
const charcoal = '#121212';
const alabaster = '#fafaf5';
const white = '#ffffff';
const parchment = '#e9e9e7';
const slate = '#4d4d4d';
const ash = '#cecdca';
const duskGrey = '#7d7d7d';
const fadedStone = '#898989';
const peach = '#eb6c00';
const butterscotch = '#e8aa42';
const honeyBronze = '#b77a10';
const skyMist = '#daeef8';
const deepOcean = '#214c70';
const burnishedBronze = '#453d37';
const warmUmber = '#2d2824';

export const Colors = {
  // Boords reference palette
  carbon,
  charcoal,
  alabaster,
  white,
  parchment,
  slate,
  ash,
  duskGrey,
  fadedStone,
  peach,
  butterscotch,
  honeyBronze,
  skyMist,
  deepOcean,
  burnishedBronze,
  warmUmber,

  // Legacy Nosh palette aliases
  paperCream: alabaster,
  inkBlack: charcoal,
  warmGray: duskGrey,
  blush: skyMist,
  bookAccent: butterscotch,

  // Brand and controls
  primary: charcoal,
  primaryLight: slate,
  primaryDark: carbon,
  onPrimary: white,

  secondary: duskGrey,
  secondaryLight: ash,
  secondaryDark: slate,
  onSecondary: charcoal,

  accent: butterscotch,
  accentStrong: butterscotch,
  onAccent: charcoal,

  // Surfaces
  background: alabaster,
  backgroundSecondary: parchment,
  card: white,
  cardSecondary: parchment,
  surface: alabaster,
  surfaceElevated: white,
  surfaceMuted: ash,
  surfaceTile: parchment,
  tabBackground: alabaster,

  // Text
  text: charcoal,
  textSecondary: slate,
  textTertiary: duskGrey,
  textMuted: fadedStone,
  textInverse: white,
  textOnPrimary: white,
  textOnSecondary: charcoal,
  onSurface: {
    high: charcoal,
    medium: slate,
    inverse: white,
  },

  // Semantic feedback kept inside the Boords palette.
  success: deepOcean,
  successLight: skyMist,
  successDark: deepOcean,
  onSuccess: white,

  warning: honeyBronze,
  warningLight: parchment,
  warningDark: honeyBronze,
  onWarning: charcoal,

  error: peach,
  errorLight: parchment,
  errorDark: peach,
  onError: white,
  onDanger: white,

  info: deepOcean,
  infoLight: skyMist,
  infoDark: deepOcean,
  onInfo: white,

  // Borders and dividers
  border: ash,
  borderLight: parchment,
  borderMuted: ash,
  borderStrong: duskGrey,
  divider: ash,
  separator: ash,

  // Shadows and overlays
  shadow: 'rgba(0, 0, 0, 0.10)',
  shadows: {
    light: 'rgba(0, 0, 0, 0.10)',
    medium: 'rgba(0, 0, 0, 0.10)',
    strong: 'rgba(0, 0, 0, 0.14)',
    colored: 'rgba(108, 188, 244, 0.50)',
  },
  overlay: {
    light: 'rgba(18, 18, 18, 0.18)',
    medium: 'rgba(18, 18, 18, 0.38)',
    strong: 'rgba(18, 18, 18, 0.58)',
    colored: 'rgba(232, 170, 66, 0.28)',
  },

  // Book-specific tokens
  book: {
    page: alabaster,
    pageAlt: white,
    pageWarm: parchment,
    edge: ash,
    edgeStrong: duskGrey,
    ink: charcoal,
    charcoal,
    mutedInk: slate,
    caption: fadedStone,
    accent: butterscotch,
    accentSoft: parchment,
    blush: skyMist,
    coverSpine: duskGrey,
    shelfGradient: [alabaster, alabaster, parchment] as const,
    readerGradient: [alabaster, alabaster, parchment] as const,
    darkGradient: [burnishedBronze, warmUmber, '#120e0b'] as const,
    paperShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
    cardShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
    liftedShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
  },

  // Interactive states
  interactive: {
    buttonPrimary: charcoal,
    buttonPrimaryHover: carbon,
    buttonPrimaryPressed: carbon,
    buttonPrimaryDisabled: ash,
    buttonSecondary: alabaster,
    buttonSecondaryHover: parchment,
    buttonSecondaryPressed: ash,
    buttonSecondaryDisabled: parchment,
    link: deepOcean,
    linkHover: charcoal,
    linkPressed: carbon,
    linkVisited: slate,
    focus: deepOcean,
    selection: skyMist,
    highlight: skyMist,
  },

  chart: {
    primary: charcoal,
    secondary: butterscotch,
    tertiary: duskGrey,
    quaternary: peach,
    quinary: ash,
    senary: parchment,
    gradients: {
      primary: [charcoal, slate] as const,
      secondary: [butterscotch, honeyBronze] as const,
      success: [deepOcean, skyMist] as const,
      info: [deepOcean, skyMist] as const,
    },
  },

  // Compatibility aliases
  black: carbon,
  lightText: fadedStone,
  lightGray: ash,
  brandPrimary: charcoal,
  accentPrimary: butterscotch,
  fresh: deepOcean,
  aging: honeyBronze,
  expiring: peach,
  danger: peach,
  tints: {
    brandTintSoft: skyMist,
    brandTintStrong: butterscotch,
  },

  gray: {
    50: alabaster,
    100: parchment,
    200: ash,
    300: ash,
    400: duskGrey,
    500: fadedStone,
    600: slate,
    700: slate,
    800: charcoal,
    900: carbon,
  },

  accessibility: {
    highContrast: {
      text: carbon,
      background: white,
      primary: carbon,
      secondary: charcoal,
    },
    focus: {
      ring: deepOcean,
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
    focusRing: { color: deepOcean, width: 2, offset: 2, radius: 6 },
  },

  alpha: {
    primary: {
      5: 'rgba(18, 18, 18, 0.05)',
      10: 'rgba(18, 18, 18, 0.10)',
      20: 'rgba(18, 18, 18, 0.20)',
      30: 'rgba(18, 18, 18, 0.30)',
      50: 'rgba(18, 18, 18, 0.50)',
    },
    secondary: {
      5: 'rgba(232, 170, 66, 0.05)',
      10: 'rgba(232, 170, 66, 0.10)',
      20: 'rgba(232, 170, 66, 0.20)',
      30: 'rgba(232, 170, 66, 0.30)',
      50: 'rgba(232, 170, 66, 0.50)',
    },
    black: {
      5: 'rgba(18, 18, 18, 0.05)',
      10: 'rgba(18, 18, 18, 0.10)',
      20: 'rgba(18, 18, 18, 0.20)',
      30: 'rgba(18, 18, 18, 0.30)',
      50: 'rgba(18, 18, 18, 0.50)',
    },
    white: {
      5: 'rgba(255, 255, 255, 0.05)',
      10: 'rgba(255, 255, 255, 0.10)',
      20: 'rgba(255, 255, 255, 0.20)',
      30: 'rgba(255, 255, 255, 0.30)',
      50: 'rgba(255, 255, 255, 0.50)',
    },
  },
};
