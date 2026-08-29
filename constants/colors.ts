import { BrandPalette } from './brandTheme';

/**
 * Nosh product color system.
 *
 * Canonical brand values come from brandTheme. Physical-book compatibility
 * values remain here so existing covers and generated pages keep their intended
 * material appearance while the surrounding product adopts the Nosh identity.
 */

const carbon = BrandPalette.black;
const charcoal = BrandPalette.ink;
const alabaster = BrandPalette.paperIvory;
const white = BrandPalette.white;
const parchment = '#F0E9E0';
const slate = '#5F5961';
const ash = '#DED5DF';
const duskGrey = '#777078';
const fadedStone = '#918A92';
const plum = BrandPalette.plum;
const sage = BrandPalette.sage;
const coral = BrandPalette.coral;
const peach = BrandPalette.coral;
const butterscotch = BrandPalette.peach;
const honeyBronze = '#B86B2E';
const skyMist = '#E7EEE2';
const deepOcean = '#627755';
const burnishedBronze = '#453d37';
const warmUmber = '#2d2824';
const blushMist = '#f4ded9';

export const Colors = {
  // Canonical palette and compatibility neutrals
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
  plum,
  sage,
  coral,
  paperIvory: alabaster,
  ink: charcoal,

  // Legacy Nosh palette aliases
  paperCream: alabaster,
  inkBlack: charcoal,
  warmGray: duskGrey,
  blush: skyMist,
  bookAccent: plum,

  // Brand and controls
  primary: plum,
  primaryLight: '#7B5A84',
  primaryDark: '#4D3155',
  onPrimary: alabaster,

  secondary: sage,
  secondaryLight: '#C8D3BE',
  secondaryDark: '#7F916F',
  onSecondary: charcoal,

  accent: coral,
  accentStrong: coral,
  onAccent: charcoal,

  // Surfaces
  background: alabaster,
  backgroundSecondary: parchment,
  card: white,
  cardSecondary: parchment,
  surface: alabaster,
  surfaceElevated: white,
  surfaceMuted: parchment,
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
  errorLight: blushMist,
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
    colored: 'rgba(101, 67, 111, 0.22)',
  },
  overlay: {
    light: 'rgba(18, 18, 18, 0.18)',
    medium: 'rgba(18, 18, 18, 0.38)',
    strong: 'rgba(18, 18, 18, 0.58)',
    colored: 'rgba(101, 67, 111, 0.28)',
  },

  // Compatibility artwork and platform-surface colors retained from the
  // physical-book renderer. Centralized here so visual tuning stays global.
  legacySurface: {
    v01: '#151712',
    v02: '#20241c',
    v03: '#25261f',
    v04: '#252a20',
    v05: '#29251f',
    v06: '#2d2923',
    v07: '#4a4538',
    v08: '#4c4637',
    v09: '#5f6252',
    v10: '#676b52',
    v11: '#6a4a2e',
    v12: '#6d7157',
    v13: '#72775c',
    v14: '#74795e',
    v15: '#786e61',
    v16: '#7a5a3a',
    v17: '#826a45',
    v18: '#8a7d6b',
    v19: '#947a52',
    v20: '#97866a',
    v21: '#a44335',
    v22: '#a88c66',
    v23: '#b39762',
    v24: '#b5a98f',
    v25: '#b89b73',
    v26: '#c4a882',
    v27: '#c4ac7a',
    v28: '#c7bdac',
    v29: '#c9bda8',
    v30: '#d39b84',
    v31: '#d6bd97',
    v32: '#d8d3c8',
    v33: '#d9cfb9',
    v34: '#ded8c8',
    v35: '#e4d1b3',
    v36: '#e8e0cf',
    v37: '#eee7d8',
    v38: '#efe4d3',
    v39: '#f0e7d4',
    v40: '#f0ede7',
    v41: '#f4efe4',
    v42: '#fbfaf6',
    v43: '#fff8ee',
    v44: 'rgba(0,0,0,0.18)',
    v45: 'rgba(0,0,0,0)',
    v46: 'rgba(129,118,99,0.18)',
    v47: 'rgba(19, 18, 14, 0.12)',
    v48: 'rgba(200,193,180,0.22)',
    v49: 'rgba(217, 207, 185, 0.72)',
    v50: 'rgba(220,215,205,0.18)',
    v51: 'rgba(23, 22, 20, 0.18)',
    v52: 'rgba(23, 22, 20, 0.22)',
    v53: 'rgba(23,22,20,0.05)',
    v54: 'rgba(23,22,20,0.055)',
    v55: 'rgba(23,22,20,0.06)',
    v56: 'rgba(23,22,20,0.12)',
    v57: 'rgba(23,22,20,0.13)',
    v58: 'rgba(23,22,20,0.14)',
    v59: 'rgba(23,22,20,0.15)',
    v60: 'rgba(23,22,20,0.18)',
    v61: 'rgba(23,22,20,0)',
    v62: 'rgba(232,225,213,0.98)',
    v63: 'rgba(240,237,231,0)',
    v64: 'rgba(244,240,232,0.90)',
    v65: 'rgba(248,246,240,0.94)',
    v66: 'rgba(250,248,243,0.96)',
    v67: 'rgba(250,248,243,0.97)',
    v68: 'rgba(250,248,243,0.98)',
    v69: 'rgba(251,250,246,0.94)',
    v70: 'rgba(255, 255, 255, 0.35)',
    v71: 'rgba(255,248,235,0.3)',
    v72: 'rgba(255,250,240,0.25)',
    v73: 'rgba(255,250,240,0.7)',
    v74: 'rgba(255,250,240,0)',
    v75: 'rgba(255,252,240,0.7)',
    v76: 'rgba(255,252,240,0)',
    v77: 'rgba(255,255,255,0.13)',
    v78: 'rgba(255,255,255,0.18)',
    v79: 'rgba(255,255,255,0.52)',
    v80: 'rgba(255,255,255,0.55)',
    v81: 'rgba(255,255,255,0.58)',
    v82: 'rgba(255,255,255,0.6)',
    v83: 'rgba(255,255,255,0)',
    v84: 'rgba(28,24,18,0.85)',
    v85: 'rgba(28,24,18,0)',
    v86: 'rgba(35,33,28,0.1)',
    v87: 'rgba(35,33,28,0.16)',
    v88: 'rgba(35,33,28,0.18)',
    v89: 'rgba(35,33,28,0.2)',
    v90: 'rgba(56, 48, 36, 0.32)',
    v91: 'rgba(56, 48, 36, 0)',
    v92: 'rgba(60,42,28,0.08)',
    v93: 'rgba(60,42,28,0.22)',
    v94: 'rgba(60,42,28,0)',
    v95: 'rgba(80,56,36,0.18)',
    v96: 'rgba(91,82,68,0.22)',
    v97: 'rgba(91,82,68,0.28)',
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
    accent: plum,
    accentSoft: '#F0E7F2',
    blush: skyMist,
    coverSpine: duskGrey,
    shelfGradient: [alabaster, alabaster, parchment] as const,
    readerGradient: [alabaster, alabaster, parchment] as const,
    darkGradient: [burnishedBronze, warmUmber, '#120e0b'] as const,
    paperShadow: '0 12px 34px rgba(23, 22, 20, 0.08)',
    cardShadow: '0 10px 28px rgba(23, 22, 20, 0.06)',
    liftedShadow: '0 16px 38px rgba(23, 22, 20, 0.14)',
  },

  // Interactive states
  interactive: {
    buttonPrimary: plum,
    buttonPrimaryHover: '#593B62',
    buttonPrimaryPressed: '#4D3155',
    buttonPrimaryDisabled: ash,
    buttonSecondary: alabaster,
    buttonSecondaryHover: parchment,
    buttonSecondaryPressed: ash,
    buttonSecondaryDisabled: parchment,
    link: plum,
    linkHover: '#593B62',
    linkPressed: '#4D3155',
    linkVisited: '#7B5A84',
    focus: plum,
    selection: '#F0E7F2',
    highlight: '#F0E7F2',
  },

  chart: {
    primary: plum,
    secondary: coral,
    tertiary: sage,
    quaternary: duskGrey,
    quinary: ash,
    senary: parchment,
    gradients: {
      primary: [plum, '#7B5A84'] as const,
      secondary: [coral, butterscotch] as const,
      success: [deepOcean, skyMist] as const,
      info: [deepOcean, skyMist] as const,
    },
  },

  // Compatibility aliases
  black: carbon,
  lightText: fadedStone,
  lightGray: ash,
  brandPrimary: plum,
  accentPrimary: coral,
  fresh: deepOcean,
  aging: honeyBronze,
  expiring: peach,
  danger: peach,
  tints: {
    brandTintSoft: '#F0E7F2',
    brandTintStrong: plum,
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
      primary: plum,
      secondary: sage,
    },
    focus: {
      ring: plum,
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
    focusRing: { color: plum, width: 2, offset: 2, radius: 6 },
  },

  alpha: {
    primary: {
      5: 'rgba(101, 67, 111, 0.05)',
      10: 'rgba(101, 67, 111, 0.10)',
      20: 'rgba(101, 67, 111, 0.20)',
      30: 'rgba(101, 67, 111, 0.30)',
      50: 'rgba(101, 67, 111, 0.50)',
    },
    secondary: {
      5: 'rgba(255, 138, 91, 0.05)',
      10: 'rgba(255, 138, 91, 0.10)',
      20: 'rgba(255, 138, 91, 0.20)',
      30: 'rgba(255, 138, 91, 0.30)',
      50: 'rgba(255, 138, 91, 0.50)',
    },
    black: {
      0: 'rgba(0, 0, 0, 0)',
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
