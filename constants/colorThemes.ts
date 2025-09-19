/**
 * NutriAI Color Themes & Usage Guide
 * 
 * This file provides pre-configured color themes and usage patterns
 * for consistent application of the color system across components.
 */

import { Colors } from './colors';

// === COMPONENT THEMES ===
// Pre-configured color combinations for common UI components

export const ComponentThemes = {
  // Button themes
  buttons: {
    primary: {
      background: Colors.primary,
      backgroundHover: Colors.primaryLight,
      backgroundPressed: Colors.primaryDark,
      backgroundDisabled: Colors.interactive.buttonPrimaryDisabled,
      text: Colors.onPrimary,
      border: Colors.primary,
    },
    secondary: {
      background: Colors.secondary,
      backgroundHover: Colors.secondaryLight,
      backgroundPressed: Colors.secondaryDark,
      backgroundDisabled: Colors.interactive.buttonSecondaryDisabled,
      text: Colors.onSecondary,
      border: Colors.secondary,
    },
    outline: {
      background: 'transparent',
      backgroundHover: Colors.alpha.primary[5],
      backgroundPressed: Colors.alpha.primary[10],
      backgroundDisabled: 'transparent',
      text: Colors.primary,
      textDisabled: Colors.interactive.buttonPrimaryDisabled,
      border: Colors.primary,
      borderDisabled: Colors.interactive.buttonPrimaryDisabled,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: Colors.alpha.primary[5],
      backgroundPressed: Colors.alpha.primary[10],
      text: Colors.primary,
      textDisabled: Colors.textMuted,
    },
    success: {
      background: Colors.success,
      backgroundHover: Colors.successDark,
      text: Colors.onSuccess,
      border: Colors.success,
    },
    warning: {
      background: Colors.warning,
      backgroundHover: Colors.warningDark,
      text: Colors.onWarning,
      border: Colors.warning,
    },
    error: {
      background: Colors.error,
      backgroundHover: Colors.errorDark,
      text: Colors.onError,
      border: Colors.error,
    },
  },

  // Card themes
  cards: {
    default: {
      background: Colors.card,
      border: Colors.borderLight,
      shadow: Colors.shadows.light,
      text: Colors.text,
      textSecondary: Colors.textSecondary,
    },
    elevated: {
      background: Colors.surfaceElevated,
      border: 'transparent',
      shadow: Colors.shadows.medium,
      text: Colors.text,
      textSecondary: Colors.textSecondary,
    },
    nutrition: {
      background: Colors.cardSecondary,
      border: Colors.border,
      shadow: Colors.shadows.light,
      text: Colors.text,
      accent: Colors.primary,
    },
    success: {
      background: Colors.successLight,
      border: Colors.success,
      text: Colors.text,
      accent: Colors.success,
    },
    warning: {
      background: Colors.warningLight,
      border: Colors.warning,
      text: Colors.text,
      accent: Colors.warning,
    },
    error: {
      background: Colors.errorLight,
      border: Colors.error,
      text: Colors.text,
      accent: Colors.error,
    },
  },

  // Input themes
  inputs: {
    default: {
      background: Colors.surface,
      border: Colors.border,
      borderFocus: Colors.primary,
      borderError: Colors.error,
      text: Colors.text,
      placeholder: Colors.textMuted,
      label: Colors.textSecondary,
    },
    filled: {
      background: Colors.backgroundSecondary,
      border: 'transparent',
      borderFocus: Colors.primary,
      borderError: Colors.error,
      text: Colors.text,
      placeholder: Colors.textMuted,
      label: Colors.textSecondary,
    },
  },

  // Navigation themes
  navigation: {
    tabBar: {
      background: Colors.surface,
      border: Colors.borderLight,
      shadow: Colors.shadows.light,
      activeText: Colors.primary,
      inactiveText: Colors.textMuted,
      activeBackground: Colors.alpha.primary[10],
      indicator: Colors.primary,
    },
    header: {
      background: Colors.surface,
      border: Colors.borderLight,
      text: Colors.text,
      icon: Colors.textSecondary,
      shadow: Colors.shadows.light,
    },
  },

  // Progress themes
  progress: {
    calories: {
      background: Colors.alpha.primary[10],
      fill: Colors.nutrition.calories,
      text: Colors.text,
      label: Colors.textSecondary,
    },
    protein: {
      background: Colors.alpha.primary[10],
      fill: Colors.nutrition.protein,
      text: Colors.text,
      label: Colors.textSecondary,
    },
    carbs: {
      background: Colors.alpha.primary[10],
      fill: Colors.nutrition.carbs,
      text: Colors.text,
      label: Colors.textSecondary,
    },
    fats: {
      background: Colors.alpha.primary[10],
      fill: Colors.nutrition.fats,
      text: Colors.text,
      label: Colors.textSecondary,
    },
    weight: {
      background: Colors.alpha.primary[10],
      fill: Colors.primary,
      text: Colors.text,
      label: Colors.textSecondary,
    },
  },
};

// === SEMANTIC COLOR MAPPINGS ===
// Contextual color usage for different app states and meanings

export const SemanticColors = {
  // Status indicators
  status: {
    online: Colors.success,
    offline: Colors.textMuted,
    syncing: Colors.info,
    error: Colors.error,
    warning: Colors.warning,
  },

  // Goal achievement levels
  achievement: {
    excellent: Colors.success, // 90-100%
    good: Colors.nutrition.caloriesGood, // 70-89%
    fair: Colors.warning, // 50-69%
    poor: Colors.error, // <50%
  },

  // Food categories
  foodCategories: {
    fruits: Colors.success,
    vegetables: Colors.primary,
    proteins: Colors.nutrition.protein,
    grains: Colors.nutrition.carbs,
    dairy: Colors.info,
    fats: Colors.nutrition.fats,
    sweets: Colors.nutrition.snack,
    beverages: Colors.info,
  },

  // Meal timing
  mealTiming: {
    breakfast: Colors.nutrition.breakfast,
    lunch: Colors.nutrition.lunch,
    dinner: Colors.nutrition.dinner,
    snack: Colors.nutrition.snack,
  },

  // Freshness indicators
  freshness: {
    fresh: Colors.nutrition.fresh,
    aging: Colors.nutrition.aging,
    expiring: Colors.nutrition.expiring,
    expired: Colors.error,
  },
};

// === CHART COLOR PALETTES ===
// Harmonious color combinations for data visualization

export const ChartPalettes = {
  // Primary palette for most charts
  primary: [
    Colors.chart.primary,
    Colors.chart.secondary,
    Colors.chart.tertiary,
    Colors.chart.quaternary,
    Colors.chart.quinary,
    Colors.chart.senary,
  ],

  // Nutrition-specific palette
  nutrition: [
    Colors.nutrition.protein,
    Colors.nutrition.carbs,
    Colors.nutrition.fats,
    Colors.nutrition.fiber,
    Colors.nutrition.calories,
  ],

  // Sequential palette for gradual data
  sequential: [
    Colors.successLight,
    Colors.success,
    Colors.primary,
    Colors.primaryDark,
  ],

  // Diverging palette for comparative data
  diverging: [
    Colors.error,
    Colors.warning,
    Colors.textMuted,
    Colors.success,
    Colors.primary,
  ],

  // Categorical palette for distinct categories
  categorical: [
    Colors.primary,
    Colors.secondary,
    Colors.success,
    Colors.info,
    Colors.warning,
    Colors.nutrition.protein,
    Colors.nutrition.carbs,
    Colors.nutrition.fats,
  ],
};

// === ACCESSIBILITY HELPERS ===
// Functions to ensure proper contrast and accessibility

export const AccessibilityHelpers = {
  // Get high contrast version of a color
  getHighContrast: (colorKey: keyof typeof Colors) => {
    const highContrastMap: Record<string, string> = {
      primary: Colors.accessibility.highContrast.primary,
      secondary: Colors.accessibility.highContrast.secondary,
      text: Colors.accessibility.highContrast.text,
      background: Colors.accessibility.highContrast.background,
    };
    return highContrastMap[colorKey] || Colors[colorKey];
  },

  // Get appropriate text color for a background
  getTextColorForBackground: (backgroundColor: string) => {
    // Simplified logic - in a real app, you'd calculate luminance
    const lightBackgrounds = [
      Colors.background,
      Colors.card,
      Colors.surface,
      Colors.successLight,
      Colors.warningLight,
      Colors.errorLight,
      Colors.infoLight,
    ];
    
    return lightBackgrounds.includes(backgroundColor) 
      ? Colors.text 
      : Colors.textInverse;
  },

  // Focus ring styles
  focusRing: {
    color: Colors.accessibility.focus.ring,
    width: Colors.accessibility.focus.width,
    offset: Colors.accessibility.focus.offset,
    style: 'solid',
  },
};

// === THEME VARIANTS ===
// Different theme variations for special modes

export const ThemeVariants = {
  // High contrast theme for accessibility
  highContrast: {
    primary: Colors.accessibility.highContrast.primary,
    secondary: Colors.accessibility.highContrast.secondary,
    background: Colors.accessibility.highContrast.background,
    text: Colors.accessibility.highContrast.text,
    border: Colors.black,
  },

  // Reduced motion theme
  reducedMotion: {
    // Same colors but with reduced opacity changes
    hoverOpacity: 0.05,
    pressedOpacity: 0.08,
    focusOpacity: 0.10,
  },

  // Print-friendly theme
  print: {
    background: Colors.white,
    text: Colors.black,
    border: Colors.black,
    primary: Colors.black,
    secondary: Colors.gray[600],
  },
};

// === USAGE EXAMPLES ===
// Common patterns and examples for using the color system

export const UsageExamples = {
  // Button usage
  primaryButton: {
    backgroundColor: ComponentThemes.buttons.primary.background,
    color: ComponentThemes.buttons.primary.text,
    borderColor: ComponentThemes.buttons.primary.border,
    // Hover state
    '&:hover': {
      backgroundColor: ComponentThemes.buttons.primary.backgroundHover,
    },
    // Pressed state
    '&:active': {
      backgroundColor: ComponentThemes.buttons.primary.backgroundPressed,
    },
    // Disabled state
    '&:disabled': {
      backgroundColor: ComponentThemes.buttons.primary.backgroundDisabled,
      opacity: Colors.state.disabledOpacity,
    },
  },

  // Card usage
  nutritionCard: {
    backgroundColor: ComponentThemes.cards.nutrition.background,
    borderColor: ComponentThemes.cards.nutrition.border,
    borderWidth: 1,
    shadowColor: ComponentThemes.cards.nutrition.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Progress bar usage
  calorieProgress: {
    backgroundColor: ComponentThemes.progress.calories.background,
    // Progress fill
    '& .fill': {
      backgroundColor: ComponentThemes.progress.calories.fill,
    },
    // Text labels
    '& .label': {
      color: ComponentThemes.progress.calories.label,
    },
    '& .value': {
      color: ComponentThemes.progress.calories.text,
    },
  },

  // Input field usage
  textInput: {
    backgroundColor: ComponentThemes.inputs.default.background,
    borderColor: ComponentThemes.inputs.default.border,
    color: ComponentThemes.inputs.default.text,
    // Focus state
    '&:focus': {
      borderColor: ComponentThemes.inputs.default.borderFocus,
      shadowColor: Colors.alpha.primary[20],
    },
    // Error state
    '&.error': {
      borderColor: ComponentThemes.inputs.default.borderError,
    },
    // Placeholder
    '&::placeholder': {
      color: ComponentThemes.inputs.default.placeholder,
    },
  },
};

// === EXPORT DEFAULT ===
export default {
  Colors,
  ComponentThemes,
  SemanticColors,
  ChartPalettes,
  AccessibilityHelpers,
  ThemeVariants,
  UsageExamples,
};
