import { Fonts } from '@/utils/fonts';

export const Typography = {
  display: {
    fontFamily: Fonts.display.bold,
    fontSize: 48,
    lineHeight: 56,
  },
  h1: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: Fonts.display.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: Fonts.ui.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: Fonts.ui.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontFamily: Fonts.ui.medium,
    fontSize: 15,
    lineHeight: 20,
    textTransform: 'none' as const,
  },
  caption: {
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'none' as const,
  },
  overline: {
    fontFamily: Fonts.ui.semibold,
    fontSize: 11,
    lineHeight: 16,
  },
  input: {
    fontFamily: Fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  applyFont: (style = {}) => ({
    fontFamily: Fonts.ui.regular,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  }),
};

export default Typography;
