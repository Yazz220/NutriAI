/**
 * NutriAI Design System - Color Palette
 * 
 * A comprehensive color system designed for nutrition and wellness apps.
 * Features natural, harmonious colors that promote health and well-being.
 * 
 * Color Philosophy:
 * - Fresh greens for growth, health, and nutrition
 * - Warm earth tones for comfort and natural feel
 * - Clean whites and soft grays for clarity
 * - Vibrant accents for energy and motivation
 */

export const Colors = {
  // === BRAND COLORS ===
  // Primary brand colors inspired by fresh, healthy living
  primary: "#2D5A3D", // Deep Forest Green - trust, growth, health
  primaryLight: "#4A7C59", // Medium Forest Green
  primaryDark: "#1E3D2A", // Dark Forest Green
  onPrimary: "#FFFFFF", // White text on primary

  // Secondary brand colors for warmth and energy
  secondary: "#F4A261", // Warm Amber - energy, vitality, warmth
  secondaryLight: "#F7B885", // Light Amber
  secondaryDark: "#E8944A", // Dark Amber
  onSecondary: "#1A1A1A", // Dark text on secondary

  // === SURFACE COLORS ===
  // Background and surface colors for a clean, fresh feel
  background: "#FAFBFA", // Soft White Green - clean, fresh
  backgroundSecondary: "#F5F8F5", // Very Light Green - subtle depth
  
  card: "#FFFFFF", // Pure White - clean cards and elevated surfaces
  cardSecondary: "#F8FBF8", // Soft Green White - alternative cards
  
  surface: "#FFFFFF", // Primary surface
  surfaceElevated: "#FCFEFC", // Slightly elevated surface
  surfaceMuted: "#F0F4F0", // Muted surface for less emphasis

  // === TEXT COLORS ===
  // Hierarchical text colors for excellent readability
  text: "#1A1A1A", // Primary text - near black for maximum readability
  textSecondary: "#4A5A4A", // Secondary text - dark green gray
  textTertiary: "#6B7B6B", // Tertiary text - medium green gray
  textMuted: "#8A9A8A", // Muted text - light green gray
  textInverse: "#FFFFFF", // White text for dark backgrounds
  textOnPrimary: "#FFFFFF", // White text on primary green
  textOnSecondary: "#1A1A1A", // Dark text on amber

  // === SEMANTIC COLORS ===
  // Status and feedback colors aligned with nutrition themes
  success: "#27AE60", // Vibrant Green - achievements, goals met
  successLight: "#E8F5E8", // Light green background
  successDark: "#1E8449", // Dark green for emphasis
  onSuccess: "#FFFFFF",

  warning: "#F39C12", // Orange - caution, attention needed
  warningLight: "#FEF3E2", // Light orange background
  warningDark: "#D68910", // Dark orange for emphasis
  onWarning: "#1A1A1A",

  error: "#E74C3C", // Red - errors, over limits
  errorLight: "#FDEAEA", // Light red background
  errorDark: "#C0392B", // Dark red for emphasis
  onError: "#FFFFFF",

  info: "#3498DB", // Blue - information, tips
  infoLight: "#EBF3FD", // Light blue background
  infoDark: "#2980B9", // Dark blue for emphasis
  onInfo: "#FFFFFF",

  // === NUTRITION-SPECIFIC COLORS ===
  // Colors specifically for nutrition tracking and food categories
  nutrition: {
    // Macronutrients
    protein: "#E74C3C", // Red - protein
    carbs: "#F39C12", // Orange - carbohydrates
    fats: "#9B59B6", // Purple - fats
    fiber: "#27AE60", // Green - fiber
    
    // Calorie tracking
    calories: "#3498DB", // Blue - calories
    caloriesOver: "#E74C3C", // Red - over calorie goal
    caloriesUnder: "#F39C12", // Orange - under calorie goal
    caloriesGood: "#27AE60", // Green - on target
    
    // Food freshness (for inventory features)
    fresh: "#27AE60", // Green - fresh foods
    aging: "#F39C12", // Orange - aging foods
    expiring: "#E74C3C", // Red - expiring foods
    
    // Meal types
    breakfast: "#F1C40F", // Yellow - morning energy
    lunch: "#E67E22", // Orange - midday fuel
    dinner: "#8E44AD", // Purple - evening nourishment
    snack: "#1ABC9C", // Teal - light refreshment
  },

  // === CHART & DATA VISUALIZATION ===
  // Harmonious colors for charts and data visualization
  chart: {
    primary: "#2D5A3D", // Forest Green
    secondary: "#F4A261", // Warm Amber
    tertiary: "#3498DB", // Blue
    quaternary: "#E74C3C", // Red
    quinary: "#9B59B6", // Purple
    senary: "#1ABC9C", // Teal
    
    // Gradient combinations
    gradients: {
      primary: ["#2D5A3D", "#4A7C59"], // Green gradient
      secondary: ["#F4A261", "#F7B885"], // Amber gradient
      success: ["#27AE60", "#58D68D"], // Success gradient
      info: ["#3498DB", "#85C1E9"], // Info gradient
    },
  },

  // === INTERACTIVE STATES ===
  // Colors for buttons, links, and interactive elements
  interactive: {
    // Primary button states
    buttonPrimary: "#2D5A3D",
    buttonPrimaryHover: "#4A7C59",
    buttonPrimaryPressed: "#1E3D2A",
    buttonPrimaryDisabled: "#A8C8A8",
    
    // Secondary button states
    buttonSecondary: "#F4A261",
    buttonSecondaryHover: "#F7B885",
    buttonSecondaryPressed: "#E8944A",
    buttonSecondaryDisabled: "#F4D1A7",
    
    // Link states
    link: "#2D5A3D",
    linkHover: "#4A7C59",
    linkPressed: "#1E3D2A",
    linkVisited: "#6B4C93",
    
    // Focus and selection
    focus: "#3498DB", // Blue focus ring
    selection: "#E8F5E8", // Light green selection
    highlight: "#FFF3CD", // Light yellow highlight
  },

  // === BORDERS & DIVIDERS ===
  // Subtle borders and dividers for clean separation
  border: "#E0E8E0", // Light green gray
  borderLight: "#F0F4F0", // Very light green gray
  borderMuted: "#D0D8D0", // Muted green gray
  borderStrong: "#C0C8C0", // Strong green gray
  
  divider: "#E8F0E8", // Subtle divider
  separator: "#D8E0D8", // Stronger separator

  // === SHADOWS & ELEVATION ===
  // Legacy flat shadow color (used widely as shadowColor: Colors.shadow)
  shadow: "rgba(0,0,0,0.08)",
  // Detailed shadow variants for themes (new)
  shadows: {
    light: "rgba(45, 90, 61, 0.08)",
    medium: "rgba(45, 90, 61, 0.12)",
    strong: "rgba(45, 90, 61, 0.16)",
    colored: "rgba(45, 90, 61, 0.20)",
  },

  // === OVERLAY & BACKDROP ===
  // Overlay colors for modals and backdrops
  overlay: {
    light: "rgba(0, 0, 0, 0.4)", // Light overlay
    medium: "rgba(0, 0, 0, 0.6)", // Medium overlay
    strong: "rgba(0, 0, 0, 0.8)", // Strong overlay
    colored: "rgba(45, 90, 61, 0.6)", // Colored overlay
  },

  // === LEGACY SUPPORT ===
  // Maintaining backward compatibility with existing code
  white: "#FFFFFF",
  black: "#000000",
  lightText: "#6B7B6B", // Maps to textTertiary
  lightGray: "#D0D8D0", // Maps to borderMuted
  // Legacy aliases/props referenced across the app
  brandPrimary: "#2D5A3D", // alias to primary
  tabBackground: "#FFFFFF", // used for subtle surfaces in inputs/slots
  // onSurface grouping used by tokens and badges
  onSurface: {
    high: "#1A1A1A",      // equals text
    medium: "#4A5A4A",    // equals textSecondary
    inverse: "#FFFFFF",    // equals textInverse
  },
  // Danger text color on danger backgrounds (alias to onError)
  onDanger: "#FFFFFF",
  // Accent aliases used by tokens
  accentPrimary: "#1ABC9C", // teal accent
  onAccent: "#1A1A1A",
  // Surface tile (older components expect this)
  surfaceTile: "#F0F4F0",
  // Freshness/status legacy flat keys
  fresh: "#27AE60",
  aging: "#F39C12",
  expiring: "#E74C3C",
  danger: "#E74C3C",
  
  // Legacy tints (for components still referencing Colors.tints.brandTintSoft/brandTintStrong)
  tints: {
    brandTintSoft: "#E8F5E8",   // soft green tint (was soft navy tint)
    brandTintStrong: "#F7B885", // strong warm accent (maps to secondaryLight)
  },
  
  // Gray scale for compatibility
  gray: {
    50: "#FAFBFA",
    100: "#F5F8F5",
    200: "#F0F4F0",
    300: "#E0E8E0",
    400: "#D0D8D0",
    500: "#A0A8A0",
    600: "#8A9A8A",
    700: "#6B7B6B",
    800: "#4A5A4A",
    900: "#2A3A2A",
  },

  // === ACCESSIBILITY ===
  // High contrast colors for accessibility compliance
  accessibility: {
    highContrast: {
      text: "#000000",
      background: "#FFFFFF",
      primary: "#1E3D2A",
      secondary: "#E8944A",
    },
    focus: {
      ring: "#3498DB",
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
    disabledOpacity: 0.38,
    selectedOpacity: 0.12,
    // Legacy focus ring token expected by Tokens (constants/tokens.ts)
    focusRing: { color: "#3498DB", width: 2, offset: 2, radius: 8 },
  },

  // === ALPHA VARIANTS ===
  // Transparent versions of key colors
  alpha: {
    primary: {
      5: "rgba(45, 90, 61, 0.05)",
      10: "rgba(45, 90, 61, 0.10)",
      20: "rgba(45, 90, 61, 0.20)",
      30: "rgba(45, 90, 61, 0.30)",
      50: "rgba(45, 90, 61, 0.50)",
    },
    secondary: {
      5: "rgba(244, 162, 97, 0.05)",
      10: "rgba(244, 162, 97, 0.10)",
      20: "rgba(244, 162, 97, 0.20)",
      30: "rgba(244, 162, 97, 0.30)",
      50: "rgba(244, 162, 97, 0.50)",
    },
    black: {
      5: "rgba(0, 0, 0, 0.05)",
      10: "rgba(0, 0, 0, 0.10)",
      20: "rgba(0, 0, 0, 0.20)",
      30: "rgba(0, 0, 0, 0.30)",
      50: "rgba(0, 0, 0, 0.50)",
    },
    white: {
      5: "rgba(255, 255, 255, 0.05)",
      10: "rgba(255, 255, 255, 0.10)",
      20: "rgba(255, 255, 255, 0.20)",
      30: "rgba(255, 255, 255, 0.30)",
      50: "rgba(255, 255, 255, 0.50)",
    },
  },
};