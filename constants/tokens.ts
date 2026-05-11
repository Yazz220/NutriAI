import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';

export const Tokens = {
  color: {
    brand: {
      primary: Colors.primary,
      onPrimary: Colors.onPrimary,
      accent: Colors.butterscotch,
      onAccent: Colors.onAccent,
    },
    surface: {
      0: Colors.background,
      1: Colors.surface,
      2: Colors.cardSecondary,
      3: Colors.surfaceMuted,
    },
    text: {
      primary: Colors.text,
      secondary: Colors.textSecondary,
      muted: Colors.textMuted,
      inverse: Colors.textInverse,
    },
    stroke: {
      soft: Colors.borderLight,
      medium: Colors.border,
      hard: Colors.borderStrong,
    },
    status: {
      success: Colors.success,
      warning: Colors.warning,
      danger: Colors.error,
      info: Colors.info,
      onSuccess: Colors.onSuccess,
      onWarning: Colors.onWarning,
      onDanger: Colors.onError,
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
  radius: {
    xs: Radii.xs,
    sm: Radii.sm,
    md: Radii.md,
    lg: Radii.lg,
    full: Radii.full,
  },
  component: {
    button: {
      sizes: {
        sm: { height: 32, px: 12, gap: 8, radius: Radii.full },
        md: { height: 40, px: 16, gap: 8, radius: Radii.full },
        lg: { height: 48, px: 20, gap: 12, radius: Radii.full },
      },
      focusRing: {
        color: Colors.state.focusRing.color,
        width: Colors.state.focusRing.width,
        offset: Colors.state.focusRing.offset,
      },
      primary: {
        container: {
          bg: Colors.primary,
          disabledBg: Colors.ash,
        },
        content: {
          fg: Colors.onPrimary,
          disabledFg: Colors.textMuted,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 0 },
      },
      secondary: {
        container: {
          bg: 'transparent',
          disabledBg: 'transparent',
        },
        content: {
          fg: Colors.fadedStone,
          disabledFg: Colors.textMuted,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 1, color: Colors.duskGrey, disabledColor: Colors.ash },
      },
      ghost: {
        container: {
          bg: 'transparent',
        },
        content: { fg: Colors.text },
        border: { width: 0 },
      },
      danger: {
        container: {
          bg: Colors.peach,
          disabledBg: Colors.surfaceMuted,
        },
        content: {
          fg: Colors.onError,
          disabledFg: Colors.textMuted,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 0 },
      },
    },
    card: {
      base: {
        bg: Colors.alabaster,
        radius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.ash,
        innerEdgeOpacity: 0,
        shadow: 'none',
      },
      elevated: {
        bg: Colors.white,
        radius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.ash,
        shadow: '0 0 0 1px rgba(108, 188, 244, 0.50)',
      },
      header: { fg: Colors.text },
      meta: { fg: Colors.textMuted },
    },
    sheet: {
      bg: Colors.alabaster,
      handle: Colors.duskGrey,
      border: Colors.ash,
      shadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
    },
    page: {
      bg: Colors.book.page,
      border: Colors.book.edge,
      shadow: Colors.book.paperShadow,
    },
  },
} as const;
