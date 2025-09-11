import { Platform } from 'react-native';
import { Fonts } from '@/utils/fonts';

export const Typography = {
  // Headers
  h1: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  
  // Body text
  body: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Buttons
  button: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Captions and labels
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Overrides for specific components
  input: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Helper to apply font family to Text components
  applyFont: (style = {}) => ({
    fontFamily: Fonts.regular,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  }),
};

export default Typography;
