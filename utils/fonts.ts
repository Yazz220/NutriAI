import * as Font from 'expo-font';
import type { FontSource } from 'expo-font';

type ManropeFontModule = Partial<{
  Manrope_400Regular: FontSource;
  Manrope_500Medium: FontSource;
  Manrope_600SemiBold: FontSource;
  Manrope_700Bold: FontSource;
}>;

type FrauncesFontModule = Partial<{
  Fraunces_400Regular: FontSource;
  Fraunces_600SemiBold: FontSource;
  Fraunces_700Bold: FontSource;
}>;

type InterFontModule = Partial<{
  Inter_400Regular: FontSource;
  Inter_500Medium: FontSource;
  Inter_600SemiBold: FontSource;
  Inter_700Bold: FontSource;
}>;

type PlayfairDisplayFontModule = Partial<{
  PlayfairDisplay_400Regular: FontSource;
  PlayfairDisplay_600SemiBold: FontSource;
  PlayfairDisplay_700Bold: FontSource;
}>;

async function optionalFontModule<T extends object>(loader: () => Promise<unknown>): Promise<Partial<T>> {
  try {
    return (await loader()) as Partial<T>;
  } catch {
    return {};
  }
}

// Load and register custom fonts (Inter for UI, Playfair Display for headings).
// Uses dynamic imports so the app doesn't crash if packages aren't installed yet.
export const loadFonts = async () => {
  try {
    const [inter, playfair, manrope, fraunces] = await Promise.all([
      optionalFontModule<InterFontModule>(() => import('@expo-google-fonts/inter')),
      optionalFontModule<PlayfairDisplayFontModule>(() => import('@expo-google-fonts/playfair-display')),
      optionalFontModule<ManropeFontModule>(() => import('@expo-google-fonts/manrope')),
      optionalFontModule<FrauncesFontModule>(() => import('@expo-google-fonts/fraunces')),
    ]);

    const {
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    } = inter;

    const {
      PlayfairDisplay_400Regular,
      PlayfairDisplay_600SemiBold,
      PlayfairDisplay_700Bold,
    } = playfair;

    const {
      Manrope_400Regular,
      Manrope_500Medium,
      Manrope_600SemiBold,
      Manrope_700Bold,
    } = manrope;

    const {
      Fraunces_400Regular,
      Fraunces_600SemiBold,
      Fraunces_700Bold,
    } = fraunces;

    const toLoad: Record<string, FontSource> = {};
    if (Inter_400Regular) toLoad.Inter = Inter_400Regular;
    if (Inter_500Medium) toLoad['Inter-Medium'] = Inter_500Medium;
    if (Inter_600SemiBold) toLoad['Inter-SemiBold'] = Inter_600SemiBold;
    if (Inter_700Bold) toLoad['Inter-Bold'] = Inter_700Bold;

    if (PlayfairDisplay_400Regular) toLoad.PlayfairDisplay = PlayfairDisplay_400Regular;
    if (PlayfairDisplay_600SemiBold) toLoad['PlayfairDisplay-SemiBold'] = PlayfairDisplay_600SemiBold;
    if (PlayfairDisplay_700Bold) toLoad['PlayfairDisplay-Bold'] = PlayfairDisplay_700Bold;

    if (Manrope_400Regular) toLoad.Manrope = Manrope_400Regular;
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
      console.warn('[fonts] Failed to load Nosh fonts; falling back to system fonts.', e);
    }
  }
  return true;
};

// Central place to reference font families used across the app
export const Fonts = {
  ui: {
    regular: 'Inter',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  display: {
    regular: 'PlayfairDisplay',
    semibold: 'PlayfairDisplay-SemiBold',
    bold: 'PlayfairDisplay-Bold',
  },
  regular: 'Inter',
  bold: 'Inter-Bold',
};
