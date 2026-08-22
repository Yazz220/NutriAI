import { Fonts } from '@/utils/fonts';

export const Typography = {
  display: {
    fontFamily: Fonts.display.bold,
    fontSize: 58,
    lineHeight: 64,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: Fonts.display.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyBold: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
  button: {
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    lineHeight: 20,
    textTransform: 'none' as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
    lineHeight: 15,
    textTransform: 'none' as const,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0,
  },
  input: {
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0,
  },
  applyFont: (style = {}) => ({
    fontFamily: Fonts.ui.regular,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  }),
};

export default Typography;
