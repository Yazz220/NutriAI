// Global Design System Colors
// This mapping preserves commonly used keys (primary, background, card, text, lightText, border, etc.)
// while aligning their values to the new palette. New keys are added for accents.
export const Colors = {
  // Brand
  primary: "#746a2e", // Friendly & Organic: brand.primary (muted olive green)
  brandPrimary: "#746a2e", // alias for clarity

  // Accents for charts/visualizations and interactive emphasis
  accentPrimary: "#746a2e", // align accents to brand primary for cohesion
  accentSecondary: "#7C8C56", // earthy olive as secondary accent
  accentTertiary: "#C9A788", // muted brown as tertiary accent
  // Keep 'secondary' for legacy usage, map to earthy olive
  secondary: "#7C8C56",

  // Surfaces
  background: "#f8edd9", // surface.background (warm cream)
  card: "#F8F2E2", // surface.card (slightly lighter cream)
  surfaceMuted: "#F5EFE3", // use background for muted surfaces
  surfaceTile: "#F8F2E2", // tiles/chips match card
  tabBackground: "#F8F2E2",

  // Text
  text: "#4f301d", // text.primary (deep brown)
  lightText: "#898681", // text.secondary (muted gray)
  subtleText: "#BDBAAE", // text.tertiary (light neutral)
  white: "#FFFFFF",
  textInverse: "#FFFFFF", // on brand

  // Borders and elevation overlay
  border: "#DCD4C6", // warm light divider derived from palette
  shadow: "rgba(0,0,0,0.06)",
  lightGray: "#BDBAAE", // neutral.primary

  // Status & semantic (kept, but you may tune later to palette if desired)
  success: "#7C8C56", // map success to earthy olive
  warning: "#FFC107",
  error: "#F44336",
  info: "#2196F3",
  successLight: "#EEF2E6",
  warningLight: "#FFF7D6",
  errorLight: "#FDE7E7",

  // Freshness indicators (kept for inventory features)
  fresh: "#7C8C56", // reuse earthy olive for freshness
  aging: "#C9A788", // muted brown
  expiring: "#B87B4B", // warm earthy brown
  danger: "#E57373",

  // Additional tints
  tints: {
    brandTintSoft: "#F8F2E2",
    brandTintStrong: "#F5824B",
  },

  // Gray scale (mapped to new neutrals where applicable)
  gray: {
    50: "#FAF6EE",
    100: "#F5EFE3",
    200: "#EAE2D6",
    300: "#E0D6C6",
    400: "#D6CCBC",
    500: "#BDBAAE", // neutral.primary
    600: "#A29D93",
    700: "#7C746A",
    800: "#5D5248",
    900: "#47392E", // text.primary
  },

  red: { 500: "#F44336" },
  orange: { 500: "#F5824B" },
  black: "#000000",
};