import * as Font from 'expo-font';
import { Platform } from 'react-native';

// Load and register custom fonts (Manrope for UI, Fraunces for Display)
// Uses dynamic imports so the app doesn't crash if packages aren't installed yet.
export const loadFonts = async () => {
  try {
    const [manrope, fraunces] = await Promise.all([
      import('@expo-google-fonts/manrope').catch(() => ({} as any)),
      import('@expo-google-fonts/fraunces').catch(() => ({} as any)),
    ]);

    const {
      Manrope_400Regular,
      Manrope_500Medium,
      Manrope_600SemiBold,
      Manrope_700Bold,
    } = manrope as any;

    const {
      Fraunces_400Regular,
      Fraunces_600SemiBold,
      Fraunces_700Bold,
    } = fraunces as any;

    const toLoad: Record<string, any> = {};
    if (Manrope_400Regular) toLoad['Manrope'] = Manrope_400Regular;
    if (Manrope_500Medium) toLoad['Manrope-Medium'] = Manrope_500Medium;
    if (Manrope_600SemiBold) toLoad['Manrope-SemiBold'] = Manrope_600SemiBold;
    if (Manrope_700Bold) toLoad['Manrope-Bold'] = Manrope_700Bold;

    if (Fraunces_400Regular) toLoad['Fraunces'] = Fraunces_400Regular;
    if (Fraunces_600SemiBold) toLoad['Fraunces-SemiBold'] = Fraunces_600SemiBold;
    if (Fraunces_700Bold) toLoad['Fraunces-Bold'] = Fraunces_700Bold;

    if (Object.keys(toLoad).length > 0) {
      await Font.loadAsync(toLoad);
    }
  } catch (e) {
    // Ignore font load errors to avoid blocking the app
    if (__DEV__) {
      console.warn('[fonts] Failed to load Manrope/Fraunces; falling back to system fonts.', e);
    }
  }
  return true;
};

// Central place to reference font families used across the app
export const Fonts = {
  // UI (Manrope)
  ui: {
    regular: 'Manrope',
    medium: 'Manrope-Medium',
    semibold: 'Manrope-SemiBold',
    bold: 'Manrope-Bold',
  },
  // Display (Fraunces)
  display: {
    regular: 'Fraunces',
    semibold: 'Fraunces-SemiBold',
    bold: 'Fraunces-Bold',
  },
  // Backwards-compat aliases (default to UI font)
  regular: 'Manrope',
  bold: 'Manrope-Bold',
};
