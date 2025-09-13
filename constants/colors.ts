// Global Design System Colors
// This mapping preserves commonly used keys (primary, background, card, text, lightText, border, etc.)
// while aligning their values to the new palette. New keys are added for accents.
export const Colors = {
  // Brand
  primary: "#5F5A24", // brand.primary (deep olive)
  brandPrimary: "#5F5A24", // alias for clarity
  onPrimary: "#FFFFFF", // on brand primary

  // Accents for charts/visualizations and interactive emphasis
  accentPrimary: "#D6A156", // brand.accent (warm amber)
  onAccent: "#1A1208", // semantic on-accent
  accentSecondary: "#5F5A24", // fallback to brand primary for cohesion
  accentTertiary: "#BEB3A0", // complementary neutral accent
  // Keep 'secondary' for legacy usage, map to earthy olive
  secondary: "#5F5A24",

  // Surfaces
  background: "#FAF6EE", // surface.0 (warm cream)
  card: "#F3EEE4", // surface.1
  surfaceMuted: "#EAE3D6", // surface.2
  surfaceTile: "#E0D6C6", // surface.3
  tabBackground: "#F3EEE4",

  // Text
  text: "#332B23", // text.primary (deep cocoa)
  lightText: "#6A645B", // text.secondary
  subtleText: "#BEB3A0", // light neutral aligning to stroke.hard
  white: "#FFFFFF",
  textInverse: "#F8F5EF", // text.inverse

  // On-surface semantic helpers
  onSurface: {
    high: "#332B23",
    medium: "#6A645B",
    inverse: "#F8F5EF",
  },

  // Borders and elevation overlay
  border: "#D9D0C2", // stroke.soft
  shadow: "rgba(0,0,0,0.06)",
  lightGray: "#BEB3A0", // neutral hard

  // Status & semantic (kept, but you may tune later to palette if desired)
  success: "#4C805E",
  warning: "#B97A28",
  error: "#B6543F", // danger
  info: "#2B68A4",
  onSuccess: "#FFFFFF",
  onWarning: "#1A1208",
  onDanger: "#FFFFFF",
  onInfo: "#FFFFFF",
  successLight: "#E6EFEA",
  warningLight: "#F3E6D6",
  errorLight: "#F2DEDA",

  // Freshness indicators (kept for inventory features)
  fresh: "#4C805E", // align to success
  aging: "#D6A156", // use accent as mid-stage
  expiring: "#B97A28", // warning
  danger: "#B6543F",

  // Additional tints
  tints: {
    brandTintSoft: "#FAF6EE",
    brandTintStrong: "#D6A156",
  },

  // Gray scale (mapped to new neutrals where applicable)
  gray: {
    50: "#FAF6EE", // surface.0
    100: "#F3EEE4", // surface.1
    200: "#EAE3D6", // surface.2
    300: "#E0D6C6", // surface.3
    400: "#D9D0C2", // stroke.soft
    500: "#BEB3A0", // stroke.hard
    600: "#9A8F7C",
    700: "#796F5E",
    800: "#5E5547",
    900: "#332B23", // text.primary
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
    focusRing: { color: "#5F5A24", width: 2, offset: 2, radius: 8 },
  },
};