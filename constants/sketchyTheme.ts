/**
 * Sketchy Theme Configuration and Extended Design Tokens
 * 
 * Extends the existing design system with hand-drawn specific styling
 */

import { Colors } from './colors';
import { Spacing, Radii } from './spacing';

export interface SketchyThemeConfig {
  enabled: boolean;
  globalRoughness: number;
  borderWidthMultiplier: number;
  colorVariant: 'warm' | 'cool' | 'neutral';
  animationsEnabled: boolean;
  performanceMode: 'high' | 'balanced' | 'performance';
}

/**
 * Default sketchy theme configuration
 */
export const defaultSketchyConfig: SketchyThemeConfig = {
  enabled: true,
  globalRoughness: 0.5,
  borderWidthMultiplier: 1.0,
  colorVariant: 'warm',
  animationsEnabled: true,
  performanceMode: 'balanced',
};

/**
 * Extended color palette for hand-drawn UI elements
 */
export const SketchyColors = {
  ...Colors,
  sketchy: {
    // Hand-drawn specific border colors
    borderPrimary: Colors.primary,
    borderSecondary: Colors.textSecondary,
    borderLight: Colors.borderMuted,
    borderAccent: Colors.secondary,
    borderDisabled: Colors.borderLight,
    
    // Organic shadows with warmer tones
    shadowWarm: 'rgba(45, 90, 61, 0.12)',
    shadowSoft: 'rgba(0, 0, 0, 0.06)',
    shadowMedium: 'rgba(45, 90, 61, 0.08)',
    
    // Paper-like backgrounds that complement hand-drawn elements
    paperWhite: '#FEFEFE',
    paperCream: '#FDFCF8',
    paperGreen: '#F8FBF8',
    
    // Nosh character inspired colors
    noshGreen: '#8FBC8F',      // Matches character's shirt
    noshCream: '#F5F5DC',      // Matches character's face
    noshBrown: '#8B7355',      // Matches character's outline
  },
} as const;

/**
 * Sketchy-specific design tokens
 */
export const SketchyTokens = {
  borderWidth: {
    thin: 2,
    medium: 3,
    thick: 4,
    extraThick: 5,
  },
  roughness: {
    subtle: 0.3,
    medium: 0.5,
    strong: 0.7,
    extreme: 0.9,
  },
  borderRadius: {
    sm: { base: 8, variance: 2 },
    md: { base: 12, variance: 3 },
    lg: { base: 16, variance: 4 },
    xl: { base: 20, variance: 5 },
  },
  animation: {
    duration: {
      fast: 150,
      medium: 250,
      slow: 350,
    },
    easing: {
      organic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  shadow: {
    sketchy: {
      sm: {
        shadowColor: SketchyColors.sketchy.shadowSoft,
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      },
      md: {
        shadowColor: SketchyColors.sketchy.shadowMedium,
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: SketchyColors.sketchy.shadowWarm,
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
      },
    },
  },
} as const;

/**
 * Component-specific sketchy variants
 */
export const SketchyComponentTokens = {
  button: {
    primary: {
      borderColor: SketchyColors.primary,
      backgroundColor: SketchyColors.primary,
      textColor: SketchyColors.onPrimary,
      borderWidth: SketchyTokens.borderWidth.medium,
      roughness: SketchyTokens.roughness.medium,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
    secondary: {
      borderColor: SketchyColors.primary,
      backgroundColor: 'transparent',
      textColor: SketchyColors.primary,
      borderWidth: SketchyTokens.borderWidth.medium,
      roughness: SketchyTokens.roughness.medium,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
    ghost: {
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      textColor: SketchyColors.primary,
      borderWidth: 0,
      roughness: SketchyTokens.roughness.subtle,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
  },
  card: {
    base: {
      borderColor: SketchyColors.sketchy.borderLight,
      backgroundColor: SketchyColors.card,
      borderWidth: SketchyTokens.borderWidth.thin,
      roughness: SketchyTokens.roughness.subtle,
      borderRadius: SketchyTokens.borderRadius.lg.base,
      shadow: SketchyTokens.shadow.sketchy.sm,
    },
    elevated: {
      borderColor: SketchyColors.sketchy.borderSecondary,
      backgroundColor: SketchyColors.card,
      borderWidth: SketchyTokens.borderWidth.medium,
      roughness: SketchyTokens.roughness.medium,
      borderRadius: SketchyTokens.borderRadius.lg.base,
      shadow: SketchyTokens.shadow.sketchy.md,
    },
  },
  input: {
    base: {
      borderColor: SketchyColors.sketchy.borderSecondary,
      backgroundColor: SketchyColors.background,
      borderWidth: SketchyTokens.borderWidth.medium,
      roughness: SketchyTokens.roughness.medium,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
    focused: {
      borderColor: SketchyColors.primary,
      backgroundColor: SketchyColors.background,
      borderWidth: SketchyTokens.borderWidth.thick,
      roughness: SketchyTokens.roughness.medium,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
    error: {
      borderColor: SketchyColors.error,
      backgroundColor: SketchyColors.background,
      borderWidth: SketchyTokens.borderWidth.thick,
      roughness: SketchyTokens.roughness.strong,
      borderRadius: SketchyTokens.borderRadius.md.base,
    },
  },
} as const;

/**
 * Utility function to get sketchy styling for a component variant
 */
export const getSketchyStyle = (
  component: keyof typeof SketchyComponentTokens,
  variant: string,
  config: Partial<SketchyThemeConfig> = {}
) => {
  const mergedConfig = { ...defaultSketchyConfig, ...config };
  const componentTokens = SketchyComponentTokens[component];
  
  if (!componentTokens || !(variant in componentTokens)) {
    return null;
  }

  const variantTokens = componentTokens[variant as keyof typeof componentTokens];
  
  return {
    ...variantTokens,
    roughness: variantTokens.roughness * mergedConfig.globalRoughness,
    borderWidth: variantTokens.borderWidth * mergedConfig.borderWidthMultiplier,
  };
};

/**
 * Performance optimization: Cache for generated SVG paths
 */
export interface SketchyStyleCache {
  [componentId: string]: {
    svgPath: string;
    dimensions: { width: number; height: number };
    lastGenerated: number;
    config: any;
  };
}

export const sketchyStyleCache: SketchyStyleCache = {};