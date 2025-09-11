import * as Font from 'expo-font';
import { Platform } from 'react-native';

// Load and register custom fonts
export const loadFonts = async () => {
  await Font.loadAsync({
    // We register the font family name as 'Soria'
    Soria: require('../assets/fonts/soria/soria-font.ttf'),
  });
  return true;
};

// Central place to reference font families used across the app
export const Fonts = {
  // Use Soria for both regular and bold until a bold cut is available
  regular: 'Soria',
  bold: 'Soria',
};
