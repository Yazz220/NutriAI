/**
 * Runtime expression of the approved tokens in brand/tokens/brand.tokens.json.
 * Product code should prefer these semantic roles over raw color values.
 */
export const BrandPalette = {
  plum: '#65436F',
  paperIvory: '#F7F2EA',
  sage: '#A8B89A',
  coral: '#FF8A5B',
  peach: '#FFB185',
  palePeach: '#FFD9C2',
  ink: '#2B2B2B',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const BrandThemeLight = {
  brand: {
    primary: BrandPalette.plum,
    onPrimary: BrandPalette.paperIvory,
    accent: BrandPalette.coral,
    onAccent: BrandPalette.ink,
    support: BrandPalette.sage,
  },
  surface: {
    canvas: BrandPalette.paperIvory,
    card: '#FFFCF8',
    elevated: BrandPalette.white,
    secondary: '#F0E9E0',
    muted: '#E9E0EA',
  },
  text: {
    primary: BrandPalette.ink,
    secondary: '#5F5961',
    tertiary: '#777078',
    muted: '#918A92',
    inverse: BrandPalette.paperIvory,
  },
  border: {
    subtle: '#EEE7E0',
    default: '#DED5DF',
    strong: '#B9ACBC',
  },
  status: {
    success: '#627755',
    warning: '#B86B2E',
    danger: '#B95050',
    info: '#596F8E',
  },
} as const;

export const BrandThemeDark = {
  brand: {
    primary: '#D5B8DC',
    onPrimary: '#2B1F2E',
    accent: BrandPalette.peach,
    onAccent: BrandPalette.ink,
    support: '#B9C8AC',
  },
  surface: {
    canvas: '#211C22',
    card: '#2D2630',
    elevated: '#382F3B',
    secondary: '#332B30',
    muted: '#463A49',
  },
  text: {
    primary: BrandPalette.paperIvory,
    secondary: '#D1C7D2',
    tertiary: '#B0A5B1',
    muted: '#918792',
    inverse: BrandPalette.ink,
  },
  border: {
    subtle: '#3C323E',
    default: '#514355',
    strong: '#75627A',
  },
  status: {
    success: '#A9C39A',
    warning: '#F0B37D',
    danger: '#EE9A9A',
    info: '#A9BDDA',
  },
} as const;

export const BrandTheme = {
  light: BrandThemeLight,
  dark: BrandThemeDark,
} as const;

export type BrandThemeMode = keyof typeof BrandTheme;
