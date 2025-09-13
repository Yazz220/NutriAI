// Centralized design tokens for components (non-breaking additions)
// These map the proposed button/card/macroRing tokens to existing Colors, Radii, and Spacing.

import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

// Local radius aliases to match the proposal without changing existing Radii values
const radius = {
  lg: Radii.lg,           // 12 from spacing.ts
  xl: Radii.lg,           // alias to lg to avoid changing Radii; adjust later if needed
} as const;

export const Tokens = {
  color: {
    brand: {
      primary: Colors.primary,
      onPrimary: Colors.onPrimary,
      accent: Colors.accentPrimary,
      onAccent: Colors.onAccent,
    },
    surface: {
      0: Colors.background,
      1: Colors.card,
      2: Colors.surfaceMuted,
      3: Colors.surfaceTile,
    },
    text: {
      primary: Colors.text,
      secondary: Colors.lightText,
      inverse: Colors.textInverse,
    },
    stroke: {
      soft: Colors.border,
      hard: Colors.lightGray,
    },
    status: {
      success: Colors.success,
      warning: Colors.warning,
      danger: Colors.error,
      info: Colors.info,
      onSuccess: Colors.onSuccess,
      onWarning: Colors.onWarning,
      onDanger: Colors.onDanger,
      onInfo: Colors.onInfo,
    },
    alpha: {
      black: Colors.alpha.black,
      white: Colors.alpha.white,
    },
  },
  opacity: {
    hover: Colors.state.hoverOpacity,
    pressed: Colors.state.pressedOpacity,
    drag: Colors.state.dragOpacity,
    disabled: Colors.state.disabledOpacity,
  },
  radius,
  component: {
    button: {
      sizes: {
        sm: { height: 36, px: 12, gap: 8, radius: radius.lg },
        md: { height: 44, px: 16, gap: 8, radius: radius.lg },
        lg: { height: 52, px: 20, gap: 12, radius: radius.xl },
      },
      focusRing: { color: Colors.primary, width: Colors.state.focusRing.width, offset: Colors.state.focusRing.offset },
      primary: {
        container: {
          bg: Colors.primary,
          hover: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.hoverOpacity },
          pressed: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.pressedOpacity },
          disabledBg: Colors.surfaceMuted,
        },
        content: {
          fg: Colors.onPrimary,
          disabledFg: Colors.onSurface.high,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 0 },
      },
      secondary: {
        container: {
          bg: 'transparent',
          hover: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.hoverOpacity },
          pressed: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.pressedOpacity },
          disabledBg: 'transparent',
        },
        content: {
          fg: Colors.primary,
          disabledFg: Colors.onSurface.high,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 1, color: Colors.lightGray, disabledColor: Colors.border },
      },
      ghost: {
        container: {
          bg: 'transparent',
          hover: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.hoverOpacity },
          pressed: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.pressedOpacity },
        },
        content: { fg: Colors.primary },
        border: { width: 0 },
      },
      danger: {
        container: {
          bg: Colors.error,
          hover: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.hoverOpacity },
          pressed: { overlayColor: Colors.alpha.black, overlayOpacity: Colors.state.pressedOpacity },
          disabledBg: Colors.surfaceMuted,
        },
        content: {
          fg: Colors.onDanger,
          disabledFg: Colors.onSurface.high,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 0 },
      },
    },
    card: {
      base: {
        bg: Colors.card,
        radius: radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        innerEdgeOpacity: 0.06,
        hover: { overlayColor: Colors.alpha.black, overlayOpacity: 0.02 },
        pressed: { overlayColor: Colors.alpha.black, overlayOpacity: 0.04 },
      },
      elevated: {
        bg: Colors.surfaceMuted,
        radius: radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        shadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      header: { fg: Colors.text },
      meta: { fg: Colors.lightText },
    },
    macroRing: {
      geometry: { segments: 12, gap: 2, thickness: 12 },
      track: { bg: Colors.border },
      progress: { fg: Colors.primary },
      accent: { fg: Colors.accentPrimary },
      states: {
        goalMet: { fg: Colors.success },
        warn: { fg: Colors.warning },
        danger: { fg: Colors.error },
      },
      labels: { fg: Colors.text, inverse: Colors.textInverse },
      ambient: { enabled: true, opacity: 0.06 },
    },
  },
} as const;
