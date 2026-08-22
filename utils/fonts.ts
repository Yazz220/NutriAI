import { Platform } from 'react-native';
import * as Font from 'expo-font';
import type { FontSource } from 'expo-font';

type InterFontModule = Partial<{
  Inter_400Regular: FontSource;
  Inter_500Medium: FontSource;
  Inter_600SemiBold: FontSource;
  Inter_700Bold: FontSource;
}>;

async function optionalFontModule<T extends object>(loader: () => Promise<unknown>): Promise<Partial<T>> {
  try {
    return (await loader()) as Partial<T>;
  } catch {
    return {};
  }
}

// Load and register optional fonts. The Boords reference uses Matter; Inter is
// the closest available substitute and is used for headings, body, and UI.
// Uses dynamic imports so the app doesn't crash if packages aren't installed yet.
export const loadFonts = async () => {
  try {
    const [inter] = await Promise.all([
      optionalFontModule<InterFontModule>(() => import('@expo-google-fonts/inter')),
    ]);

    const {
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    } = inter;

    const toLoad: Record<string, FontSource> = {};
    if (Inter_400Regular) toLoad.Inter = Inter_400Regular;
    if (Inter_500Medium) toLoad['Inter-Medium'] = Inter_500Medium;
    if (Inter_600SemiBold) toLoad['Inter-SemiBold'] = Inter_600SemiBold;
    if (Inter_700Bold) toLoad['Inter-Bold'] = Inter_700Bold;

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

const editorialSerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia',
  default: 'serif',
}) ?? 'serif';

// Central place to reference font families used across the app
export const Fonts = {
  ui: {
    regular: 'Inter',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  display: {
    regular: editorialSerif,
    semibold: editorialSerif,
    bold: editorialSerif,
  },
  regular: 'Inter',
  bold: 'Inter-Bold',
};
