import { Fonts } from '@/utils/fonts';

export const Typography = {
  h1: {
    fontFamily: Fonts.display.semibold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: Fonts.display.semibold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: Fonts.display.semibold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0,
  },
  body: {
    fontFamily: Fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyBold: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  button: {
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'none' as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'none' as const,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0,
  },
  input: {
    fontFamily: Fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  applyFont: (style = {}) => ({
    fontFamily: Fonts.ui.regular,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  }),
};

export default Typography;
