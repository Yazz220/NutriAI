// Global Design System Colors
// This mapping preserves commonly used keys (primary, background, card, text, lightText, border, etc.)
// while aligning their values to the new palette. New keys are added for accents.
export const Colors = {
  // Brand
  primary: "#1C2A4B", // Primary - Navy
  brandPrimary: "#1C2A4B", // alias for clarity
  onPrimary: "#FFFFFF", // on brand primary

  // Accents for charts/visualizations and interactive emphasis
  accentPrimary: "#B5EAD7", // Accent - Mint Green
  onAccent: "#1C2A4B", // readable on mint
  accentSecondary: "#FFCB77", // Secondary - Gold/Champagne
  accentTertiary: "#BFC4C9", // Neutral accent
  // Keep 'secondary' for legacy usage, map to earthy olive
  secondary: "#FFCB77",

  // Surfaces
  background: "#FAF9F6", // Background - Ivory/Stone
  card: "#FFFFFF", // elevated surface on ivory background
  surfaceMuted: "#F3F2EF", // subtle surface
  surfaceTile: "#ECEBE7", // tiles
  tabBackground: "#FFFFFF",

  // Text
  text: "#1C2A4B", // primary text - Navy
  lightText: "#667085", // secondary text
  subtleText: "#BFC4C9", // Neutral
  white: "#FFFFFF",
  textInverse: "#FAF9F6", // on dark surfaces

  // On-surface semantic helpers
  onSurface: {
    high: "#1C2A4B",
    medium: "#667085",
    inverse: "#FAF9F6",
  },

  // Borders and elevation overlay
  border: "#BFC4C9", // Neutral
  shadow: "rgba(0,0,0,0.06)",
  lightGray: "#BFC4C9", // Neutral

  // Status & semantic (kept, but you may tune later to palette if desired)
  success: "#4C805E",
  warning: "#B97A28",
  error: "#B6543F", // danger
  info: "#2B68A4",
  onSuccess: "#FFFFFF",
  onWarning: "#1C2A4B",
  onDanger: "#FFFFFF",
  onInfo: "#FFFFFF",
  successLight: "#E6EFEA",
  warningLight: "#F3E6D6",
  errorLight: "#F2DEDA",

  // Freshness indicators (kept for inventory features)
  fresh: "#4C805E", // align to success
  aging: "#B5EAD7", // use accent as mid-stage
  expiring: "#B97A28", // warning
  danger: "#B6543F",

  // Additional tints
  tints: {
    brandTintSoft: "#E8EBF3", // soft navy tint
    brandTintStrong: "#FFCB77", // strong brand accent
  },

  // Gray scale (mapped to new neutrals where applicable)
  gray: {
    50: "#FAF9F6", // background ivory
    100: "#F3F4F6", // light surface
    200: "#E5E7EB", // subtle surface
    300: "#D1D5DB", // neutral light
    400: "#BFC4C9", // neutral
    500: "#9AA1A8", // neutral hard
    600: "#6B7280",
    700: "#4B5563",
    800: "#374151",
    900: "#1C2A4B", // navy
  },

  red: { 500: "#B6543F" },
  orange: { 500: "#B97A28" },
  black: "#000000",

  // Alpha (no new hues, just base references for overlays)
  alpha: {
    black: "#000000",
    white: "#FFFFFF",
  },

  // Interaction/state tokens
  state: {
    hoverOpacity: 0.06,
    pressedOpacity: 0.12,
    dragOpacity: 0.08,
    disabledOpacity: 0.38,
    focusRing: { color: "#1C2A4B", width: 2, offset: 2, radius: 8 },
  },
};