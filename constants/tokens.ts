import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';

export const Tokens = {
  color: {
    brand: {
      primary: Colors.primary,
      onPrimary: Colors.onPrimary,
      accent: Colors.book.accent,
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
        sm: { height: 36, px: 12, gap: 8, radius: Radii.sm },
        md: { height: 44, px: 16, gap: 8, radius: Radii.sm },
        lg: { height: 52, px: 20, gap: 12, radius: Radii.md },
      },
      focusRing: {
        color: Colors.state.focusRing.color,
        width: Colors.state.focusRing.width,
        offset: Colors.state.focusRing.offset,
      },
      primary: {
        container: {
          bg: Colors.primary,
          disabledBg: Colors.borderMuted,
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
          bg: Colors.surface,
          disabledBg: Colors.surfaceMuted,
        },
        content: {
          fg: Colors.text,
          disabledFg: Colors.textMuted,
          disabledOpacity: Colors.state.disabledOpacity,
        },
        border: { width: 1, color: Colors.borderStrong, disabledColor: Colors.border },
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
          bg: Colors.error,
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
        bg: Colors.surface,
        radius: Radii.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        innerEdgeOpacity: 0.04,
        shadow: Colors.book.cardShadow,
      },
      elevated: {
        bg: Colors.surfaceElevated,
        radius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.border,
        shadow: Colors.book.liftedShadow,
      },
      header: { fg: Colors.text },
      meta: { fg: Colors.textMuted },
    },
    sheet: {
      bg: Colors.book.page,
      handle: Colors.borderStrong,
      border: Colors.border,
      shadow: '0 -10px 28px rgba(17, 17, 17, 0.12)',
    },
    page: {
      bg: Colors.book.page,
      border: Colors.book.edge,
      shadow: Colors.book.paperShadow,
    },
  },
} as const;
