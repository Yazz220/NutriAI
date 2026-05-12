import { Fonts } from '@/utils/fonts';

export const Typography = {
  display: {
    fontFamily: Fonts.display.bold,
    fontSize: 60,
    lineHeight: 66,
    letterSpacing: 1.5,
  },
  h1: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0.8,
  },
  h2: {
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  h3: {
    fontFamily: Fonts.display.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 0.475,
  },
  body: {
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.35,
  },
  bodyBold: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.35,
  },
  bodySmall: {
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  button: {
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    lineHeight: 20,
    textTransform: 'none' as const,
    letterSpacing: 0.35,
  },
  caption: {
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
    lineHeight: 15,
    textTransform: 'none' as const,
    letterSpacing: 0.25,
  },
  overline: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1,
  },
  input: {
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.35,
  },
  applyFont: (style = {}) => ({
    fontFamily: Fonts.ui.regular,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  }),
};

export default Typography;
