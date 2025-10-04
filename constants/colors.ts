/**
 * Nosh Design System - Color Palette
 *
 * Warm, organic palette inspired by the Nosh mascot.
 * Emphasises cream backgrounds, herbaceous greens, and sunlit accents.
 *
 * Color Philosophy:
 * - Leafy greens echo Nosh’s outline and calm guidance
 * - Sun-baked oranges provide friendly energy and emphasis
 * - Creamy neutrals create breathable, paper-like surfaces
 * - Muted sages and herbs add depth while staying gentle on the eyes
 */

export const Colors = {
  // === BRAND COLORS ===
  // Primary brand colors inspired by Nosh’s leafy outline
  primary: "#3F6D2A", // Herb green
  primaryLight: "#5D8C3C", // Fresh sprout green
  primaryDark: "#27471D", // Deep leaf shadow
  onPrimary: "#FFF9EC", // Cream for legible text on greens

  // Secondary brand colors echoing Nosh’s sunlit accents
  secondary: "#F0A44B", // Warm squash orange
  secondaryLight: "#F5BC6D", // Honeyed apricot
  secondaryDark: "#D6812C", // Toasted amber
  onSecondary: "#2F3A1F", // Earthy olive text on warm accents

  // === SURFACE COLORS ===
  // Creamy papers and soft neutrals for relaxed layouts
  background: "#FBFCF4", // Soft oat milk (updated)
  backgroundSecondary: "#F1E6CE", // Toasted almond

  card: "#FFFAEE", // Lifted card surface
  cardSecondary: "#F5ECD8", // Alt card warmth

  surface: "#FFFDF6", // Primary surface layer
  surfaceElevated: "#F6EBD6", // Slight elevation tint
  surfaceMuted: "#E6DAC5", // Muted backdrop for subdued sections

  // === TEXT COLORS ===
  // Friendly olives for calm readability
  text: "#2F3A1F", // Primary text – dark olive
  textSecondary: "#4B5C33", // Secondary text – mossy green
  textTertiary: "#687646", // Supporting text – muted sage
  textMuted: "#89936A", // Muted captions – herb dust
  textInverse: "#FFFDF6", // Cream text for dark fills
  textOnPrimary: "#FFF9EC", // Alias for on-primary clarity
  textOnSecondary: "#2F3A1F", // Earth tone on warm accents

  // === SEMANTIC COLORS ===
  // Organic feedback colors tuned to the palette
  success: "#6AA245", // Garden success green
  successLight: "#E4F2D9", // Sprout wash
  successDark: "#417729", // Deep fern
  onSuccess: "#FFFDF6",

  warning: "#F0A44B", // Sunlit caution
  warningLight: "#FFF1DA", // Golden mist
  warningDark: "#C67F2B", // Toasted amber edge
  onWarning: "#2F3A1F",

  error: "#D56B5A", // Heirloom tomato
  errorLight: "#F8E2DC", // Blushed clay
  errorDark: "#B74E3E", // Fired terracotta
  onError: "#FFF9F6",

  info: "#6AA7A2", // Calm eucalyptus
  infoLight: "#E3F1EF", // Misty teal
  infoDark: "#4A7D78", // Deep eucalyptus
  onInfo: "#0F2823",

  // === NUTRITION-SPECIFIC COLORS ===
  // Meal tracking cues harmonised with brand palette
  nutrition: {
    // Macronutrients
    protein: "#D56B5A", // Tomato red
    carbs: "#F0A44B", // Squash orange
    fats: "#6AA7A2", // Eucalyptus teal
    fiber: "#4F7B2F", // Tender stem green

    // Calorie tracking
    calories: "#3F6D2A", // Brand green
    caloriesOver: "#D56B5A", // Tomato alert
    caloriesUnder: "#F0A44B", // Sunny caution
    caloriesGood: "#6AA245", // Balanced leaf

    // Food freshness (for inventory features)
    fresh: "#6AA245", // Fresh produce
    aging: "#F0A44B", // Ripening produce
    expiring: "#D56B5A", // Needs attention

    // Meal types
    breakfast: "#F2BB4C", // Morning sunlight
    lunch: "#E58E2E", // Midday glow
    dinner: "#6B8C4F", // Dusky herb
    snack: "#76B19C", // Crisp cucumber
  },

  // === CHART & DATA VISUALIZATION ===
  // Harmonised palette for analytics & insights
  chart: {
    primary: "#3F6D2A", // Brand green
    secondary: "#F0A44B", // Warm accent
    tertiary: "#6AA7A2", // Calm teal
    quaternary: "#D56B5A", // Tomato
    quinary: "#A7C96A", // Soft lime
    senary: "#F7D07A", // Golden oat

    // Gradient combinations
    gradients: {
      primary: ["#3F6D2A", "#5D8C3C"] as const, // Leaf gradient
      secondary: ["#F0A44B", "#F5BC6D"] as const, // Honey gradient
      success: ["#6AA245", "#8ECF67"] as const, // Garden success
      info: ["#6AA7A2", "#8FC7C2"] as const, // Misty teal
    },
  },

  // === INTERACTIVE STATES ===
  // Buttons, links, focus rings, and highlights
  interactive: {
    // Primary button states
    buttonPrimary: "#3F6D2A",
    buttonPrimaryHover: "#4F7F36",
    buttonPrimaryPressed: "#2C491E",
    buttonPrimaryDisabled: "#C9D9BB",

    // Secondary button states
    buttonSecondary: "#F0A44B",
    buttonSecondaryHover: "#F5BC6D",
    buttonSecondaryPressed: "#D6812C",
    buttonSecondaryDisabled: "#F4D8B4",

    // Link states
    link: "#3F6D2A",
    linkHover: "#4F7F36",
    linkPressed: "#2C491E",
    linkVisited: "#6B8C4F",

    // Focus and selection
    focus: "#6AA7A2", // Soft eucalyptus focus ring
    selection: "#F5E8C8", // Warm parchment selection
    highlight: "#FDE9C6", // Gentle highlight wash
  },

  // === BORDERS & DIVIDERS ===
  // Subtle borders and dividers for clean separation
  border: "#E3D7C1", // Light parchment
  borderLight: "#F2E7D3", // Whisper border
  borderMuted: "#D7CBB3", // Muted paper fibre
  borderStrong: "#C3B89C", // Defined edge

  divider: "#EADFC9", // Soft divider
  separator: "#D9CEB4", // Stronger separator

  // === SHADOWS & ELEVATION ===
  // Legacy flat shadow color (used widely as shadowColor: Colors.shadow)
  shadow: "rgba(63, 109, 42, 0.08)",
  // Detailed shadow variants for themes (new)
  shadows: {
    light: "rgba(63, 109, 42, 0.08)",
    medium: "rgba(63, 109, 42, 0.12)",
    strong: "rgba(63, 109, 42, 0.16)",
    colored: "rgba(240, 164, 75, 0.22)",
  },

  // === OVERLAY & BACKDROP ===
  // Overlay colors for modals and backdrops
  overlay: {
    light: "rgba(47, 58, 31, 0.35)", // Light olive overlay
    medium: "rgba(47, 58, 31, 0.55)", // Medium overlay
    strong: "rgba(47, 58, 31, 0.72)", // Strong overlay
    colored: "rgba(240, 164, 75, 0.35)", // Warm accent overlay
  },

  // === LEGACY SUPPORT ===
  // Maintaining backward compatibility with existing code
  white: "#FFFFFF",
  black: "#000000",
  lightText: "#687646", // Maps to textTertiary
  lightGray: "#D7CBB3", // Maps to borderMuted
  // Legacy aliases/props referenced across the app
  brandPrimary: "#3F6D2A", // alias to primary
  tabBackground: "#FFFAEE", // Subtle surface for tabs and inputs
  // onSurface grouping used by tokens and badges
  onSurface: {
    high: "#2F3A1F",      // equals text
    medium: "#4B5C33",    // equals textSecondary
    inverse: "#FFFDF6",    // equals textInverse
  },
  // Danger text color on danger backgrounds (alias to onError)
  onDanger: "#FFF9F6",
  // Accent aliases used by tokens
  accentPrimary: "#6AA7A2", // Eucalyptus accent
  onAccent: "#10342E",
  // Surface tile (older components expect this)
  surfaceTile: "#EFE3CC",
  // Freshness/status legacy flat keys
  fresh: "#6AA245",
  aging: "#F0A44B",
  expiring: "#D56B5A",
  danger: "#D56B5A",

  // Legacy tints (for components still referencing Colors.tints.brandTintSoft/brandTintStrong)
  tints: {
    brandTintSoft: "#EEF4DE",   // Soft herb tint
    brandTintStrong: "#F7CE92", // Toasted honey tint
  },

  // Gray scale for compatibility
  gray: {
    50: "#F8F3E3",
    100: "#F3E8D1",
    200: "#E9DDC2",
    300: "#DCCFB1",
    400: "#CFC19F",
    500: "#B3A883",
    600: "#998F6C",
    700: "#7A7255",
    800: "#5C5640",
    900: "#3E3A2B",
  },

  // === ACCESSIBILITY ===
  // High contrast colors for accessibility compliance
  accessibility: {
    highContrast: {
      text: "#000000",
      background: "#FFFFFF",
      primary: "#27471D",
      secondary: "#8C5410",
    },
    focus: {
      ring: "#6AA7A2",
      width: 2,
      offset: 2,
    },
  },

  // === STATE MANAGEMENT ===
  // Opacity values and state colors
  state: {
    hoverOpacity: 0.08,
    pressedOpacity: 0.12,
    dragOpacity: 0.08,
    focusOpacity: 0.16,
    disabledOpacity: 0.4,
    selectedOpacity: 0.14,
    // Legacy focus ring token expected by Tokens (constants/tokens.ts)
    focusRing: { color: "#6AA7A2", width: 2, offset: 2, radius: 8 },
  },

  // === ALPHA VARIANTS ===
  // Transparent versions of key colors
  alpha: {
    primary: {
      5: "rgba(63, 109, 42, 0.05)",
      10: "rgba(63, 109, 42, 0.10)",
      20: "rgba(63, 109, 42, 0.20)",
      30: "rgba(63, 109, 42, 0.30)",
      50: "rgba(63, 109, 42, 0.50)",
    },
    secondary: {
      5: "rgba(240, 164, 75, 0.05)",
      10: "rgba(240, 164, 75, 0.10)",
      20: "rgba(240, 164, 75, 0.20)",
      30: "rgba(240, 164, 75, 0.30)",
      50: "rgba(240, 164, 75, 0.50)",
    },
    black: {
      5: "rgba(47, 58, 31, 0.05)",
      10: "rgba(47, 58, 31, 0.10)",
      20: "rgba(47, 58, 31, 0.20)",
      30: "rgba(47, 58, 31, 0.30)",
      50: "rgba(47, 58, 31, 0.50)",
    },
    white: {
      5: "rgba(255, 253, 246, 0.05)",
      10: "rgba(255, 253, 246, 0.10)",
      20: "rgba(255, 253, 246, 0.20)",
      30: "rgba(255, 253, 246, 0.30)",
      50: "rgba(255, 253, 246, 0.50)",
    },
  },
};
