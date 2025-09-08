// Global Design System Colors
// This mapping preserves commonly used keys (primary, background, card, text, lightText, border, etc.)
// while aligning their values to the new palette. New keys are added for accents.
export const Colors = {
  // Brand
  primary: "#5A1846", // brand.primary
  brandPrimary: "#5A1846", // alias for clarity

  // Accents for charts/visualizations and interactive emphasis
  accentPrimary: "#E56B6F", // accent.primary
  accentSecondary: "#FFB4A2", // accent.secondary
  accentTertiary: "#FFE5D9", // accent.tertiary
  // Keep 'secondary' for legacy usage, map to primary accent
  secondary: "#E56B6F",

  // Surfaces
  background: "#FFFFFF", // surface.background
  card: "#FFF0EB", // surface.card
  surfaceMuted: "#FEE8E1", // surface.cardInteractive (slightly darker interactive surface)
  surfaceTile: "#FFE5D9", // light accent surface for tiles/chips
  tabBackground: "#FFFFFF",

  // Text
  text: "#212529", // text.primary
  lightText: "#6C757D", // text.secondary
  subtleText: "#ADB5BD", // text.tertiary
  white: "#FFFFFF",
  textInverse: "#FFFFFF", // on brand

  // Borders and elevation overlay
  border: "#E9ECEF", // light divider
  shadow: "rgba(0,0,0,0.06)",
  lightGray: "#ADB5BD",

  // Status & semantic (unchanged)
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  info: "#2196F3",
  successLight: "#F0FDF4",
  warningLight: "#FFFBEB",
  errorLight: "#FEF2F2",

  // Freshness indicators (kept for inventory features)
  fresh: "#4ECDC4",
  aging: "#F0C75E",
  expiring: "#E07A5F",
  danger: "#E57373",

  // Additional tints
  tints: {
    brandTintSoft: "#FFE5D9",
    brandTintStrong: "#5A1846",
  },

  // Gray scale (mapped to new neutrals where applicable)
  gray: {
    50: "#F8F9FA",
    100: "#F1F3F5",
    200: "#E9ECEF",
    300: "#DEE2E6",
    400: "#CED4DA",
    500: "#ADB5BD",
    600: "#868E96",
    700: "#495057",
    800: "#343A40",
    900: "#212529",
  },

  red: { 500: "#F44336" },
  orange: { 500: "#FFC107" },
  black: "#000000",
};